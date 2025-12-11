// API Configuration for Frontend-Backend Communication
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
    PROFILE: '/api/auth/profile',
  },
  
  // Multi-AI endpoints
  MULTI_AI: {
    PROVIDERS: '/api/multi-ai/providers',
    CHAT: '/api/multi-ai/chat',
    STREAM: '/api/multi-ai/stream',
    BATCH: '/api/multi-ai/batch',
    COST_ESTIMATE: '/api/multi-ai/cost-estimate',
    OPTIMIZATION: '/api/multi-ai/optimize',
  },
  
  // Analytics
  ANALYTICS: {
    DASHBOARD: '/api/analytics/dashboard',
    USAGE: '/api/analytics/usage',
    PERFORMANCE: '/api/analytics/performance',
    TRENDS: '/api/analytics/trends',
  },
  
  // Cost Optimization
  COST: {
    METRICS: '/api/cost/metrics',
    OPTIMIZATION: '/api/cost/optimization',
    RECOMMENDATIONS: '/api/cost/recommendations',
    SETTINGS: '/api/cost/settings',
  },
  
  // Health and Status
  HEALTH: '/health',
  REALTIME_STATS: '/api/realtime/stats',
  
  // Compliance
  COMPLIANCE: {
    GDPR_REQUEST: '/api/compliance/gdpr/request',
    GDPR_VERIFY: '/api/compliance/gdpr/verify',
    GDPR_STATUS: '/api/compliance/gdpr/request',
    SECURITY_REPORT: '/api/compliance/security/report',
  },
};

// Helper function to build full URL
export function buildApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

// Helper function for authenticated requests
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

// Generic API call function with error handling
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildApiUrl(endpoint);
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  let lastError: Error;
  
  for (let attempt = 1; attempt <= API_CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < API_CONFIG.RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY * attempt));
        continue;
      }
    }
  }
  
  throw lastError!;
}

// Specific API methods
export const api = {
  // Authentication
  login: (credentials: { email: string; password: string }) =>
    apiCall(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
    
  register: (userData: { email: string; password: string; name: string }) =>
    apiCall(API_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
    
  // Multi-AI
  getProviders: () => apiCall(API_ENDPOINTS.MULTI_AI.PROVIDERS),
  
  sendChatMessage: (data: {
    message: string;
    conversation?: any[];
    provider?: string;
    model?: string;
    costPriority?: string;
  }) =>
    apiCall(API_ENDPOINTS.MULTI_AI.CHAT, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  getCostEstimate: (data: {
    message: string;
    conversation?: any[];
    provider?: string;
    model?: string;
  }) =>
    apiCall(API_ENDPOINTS.MULTI_AI.COST_ESTIMATE, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  // Analytics
  getAnalyticsDashboard: () => apiCall(API_ENDPOINTS.ANALYTICS.DASHBOARD),
  
  getUsageMetrics: (timeRange?: string) =>
    apiCall(`${API_ENDPOINTS.ANALYTICS.USAGE}${timeRange ? `?timeRange=${timeRange}` : ''}`),
    
  // Cost Optimization
  getCostMetrics: () => apiCall(API_ENDPOINTS.COST.METRICS),
  
  getCostRecommendations: () => apiCall(API_ENDPOINTS.COST.RECOMMENDATIONS),
  
  // Health
  checkHealth: () => apiCall(API_ENDPOINTS.HEALTH),
  
  getRealTimeStats: () => apiCall(API_ENDPOINTS.REALTIME_STATS),
};

export default api;