import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';

// Enhanced request interface with user info
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    plan: string;
  };
  analytics?: {
    startTime: number;
    endpoint: string;
    method: string;
    userAgent: string;
    ipAddress: string;
  };
}

export interface AnalyticsEvent {
  id: string;
  userId?: string;
  sessionId?: string;
  eventType: 'api_call' | 'user_action' | 'ai_generation' | 'error' | 'performance';
  eventName: string;
  metadata: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface APIUsageMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  tokensUsed?: number;
  userId?: string;
  timestamp: Date;
  errorMessage?: string;
}

export interface UserBehaviorMetrics {
  userId: string;
  action: string;
  feature: string;
  duration?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface AIUsageMetrics {
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  responseTime: number;
  feature: 'chat' | 'generation' | 'embedding' | 'rag';
  success: boolean;
  errorType?: string;
  timestamp: Date;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  databaseConnections: number;
  redisConnections: number;
  timestamp: Date;
}

export class AnalyticsService {
  private static events: AnalyticsEvent[] = [];
  private static apiMetrics: APIUsageMetrics[] = [];
  private static userBehavior: UserBehaviorMetrics[] = [];
  private static aiUsage: AIUsageMetrics[] = [];
  private static systemMetrics: SystemMetrics[] = [];

  /**
   * Track analytics event
   */
  static trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): void {
    const analyticsEvent: AnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      timestamp: new Date(),
      ...event
    };

    this.events.push(analyticsEvent);
    
    // Keep only last 10000 events in memory
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }

    // In production, this would be sent to a analytics service
    console.log('📊 Analytics Event:', {
      type: analyticsEvent.eventType,
      name: analyticsEvent.eventName,
      userId: analyticsEvent.userId,
      timestamp: analyticsEvent.timestamp
    });
  }

  /**
   * Track API usage metrics
   */
  static trackAPIUsage(metrics: APIUsageMetrics): void {
    this.apiMetrics.push(metrics);
    
    // Keep only last 50000 API calls in memory
    if (this.apiMetrics.length > 50000) {
      this.apiMetrics = this.apiMetrics.slice(-50000);
    }

    // Track as analytics event
    this.trackEvent({
      eventType: 'api_call',
      eventName: `${metrics.method} ${metrics.endpoint}`,
      userId: metrics.userId,
      metadata: {
        statusCode: metrics.statusCode,
        responseTime: metrics.responseTime,
        tokensUsed: metrics.tokensUsed,
        endpoint: metrics.endpoint,
        method: metrics.method
      }
    });
  }

  /**
   * Track user behavior
   */
  static trackUserBehavior(behavior: UserBehaviorMetrics): void {
    this.userBehavior.push(behavior);
    
    // Keep only last 100000 user actions in memory
    if (this.userBehavior.length > 100000) {
      this.userBehavior = this.userBehavior.slice(-100000);
    }

    // Track as analytics event
    this.trackEvent({
      eventType: 'user_action',
      eventName: behavior.action,
      userId: behavior.userId,
      metadata: {
        feature: behavior.feature,
        duration: behavior.duration,
        ...behavior.metadata
      }
    });
  }

  /**
   * Track AI usage metrics
   */
  static trackAIUsage(usage: AIUsageMetrics): void {
    this.aiUsage.push(usage);
    
    // Keep only last 10000 AI calls in memory
    if (this.aiUsage.length > 10000) {
      this.aiUsage = this.aiUsage.slice(-10000);
    }

    // Track as analytics event
    this.trackEvent({
      eventType: 'ai_generation',
      eventName: `${usage.feature}_${usage.model}`,
      userId: usage.userId,
      metadata: {
        model: usage.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        responseTime: usage.responseTime,
        feature: usage.feature,
        success: usage.success,
        errorType: usage.errorType
      }
    });
  }

  /**
   * Track system metrics
   */
  static trackSystemMetrics(metrics: SystemMetrics): void {
    this.systemMetrics.push(metrics);
    
    // Keep only last 1000 system snapshots (about 16 hours at 1 minute intervals)
    if (this.systemMetrics.length > 1000) {
      this.systemMetrics = this.systemMetrics.slice(-1000);
    }
  }

  /**
   * Get analytics dashboard data
   */
  static getDashboardData(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): any {
    const now = new Date();
    const msRange = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const cutoff = new Date(now.getTime() - msRange[timeRange]);

    // Filter data by time range
    const recentEvents = this.events.filter(e => e.timestamp >= cutoff);
    const recentAPIMetrics = this.apiMetrics.filter(m => m.timestamp >= cutoff);
    const recentUserBehavior = this.userBehavior.filter(b => b.timestamp >= cutoff);
    const recentAIUsage = this.aiUsage.filter(u => u.timestamp >= cutoff);
    const recentSystemMetrics = this.systemMetrics.filter(m => m.timestamp >= cutoff);

    return {
      overview: {
        totalEvents: recentEvents.length,
        totalAPIRequests: recentAPIMetrics.length,
        totalUserActions: recentUserBehavior.length,
        totalAIRequests: recentAIUsage.length,
        uniqueUsers: new Set(recentEvents.map(e => e.userId).filter(Boolean)).size,
        timeRange
      },
      
      apiMetrics: {
        totalRequests: recentAPIMetrics.length,
        averageResponseTime: this.calculateAverage(recentAPIMetrics, 'responseTime'),
        successRate: this.calculateSuccessRate(recentAPIMetrics),
        errorRate: this.calculateErrorRate(recentAPIMetrics),
        requestsByEndpoint: this.groupBy(recentAPIMetrics, 'endpoint'),
        requestsByStatus: this.groupBy(recentAPIMetrics, 'statusCode'),
        topEndpoints: this.getTopEndpoints(recentAPIMetrics),
        slowestEndpoints: this.getSlowestEndpoints(recentAPIMetrics)
      },

      aiMetrics: {
        totalRequests: recentAIUsage.length,
        totalTokensUsed: recentAIUsage.reduce((sum, u) => sum + u.totalTokens, 0),
        averageTokensPerRequest: this.calculateAverage(recentAIUsage, 'totalTokens'),
        averageResponseTime: this.calculateAverage(recentAIUsage, 'responseTime'),
        successRate: this.calculateAISuccessRate(recentAIUsage),
        featureUsage: this.groupBy(recentAIUsage, 'feature'),
        modelUsage: this.groupBy(recentAIUsage, 'model'),
        topUsers: this.getTopAIUsers(recentAIUsage)
      },

      userBehavior: {
        totalActions: recentUserBehavior.length,
        uniqueUsers: new Set(recentUserBehavior.map(b => b.userId)).size,
        averageSessionDuration: this.calculateAverageSessionDuration(recentUserBehavior),
        topFeatures: this.getTopFeatures(recentUserBehavior),
        userEngagement: this.calculateUserEngagement(recentUserBehavior),
        actionsByFeature: this.groupBy(recentUserBehavior, 'feature')
      },

      systemHealth: {
        currentMetrics: recentSystemMetrics[recentSystemMetrics.length - 1] || null,
        averageCPU: this.calculateAverage(recentSystemMetrics, 'cpuUsage'),
        averageMemory: this.calculateAverage(recentSystemMetrics, 'memoryUsage'),
        averageDisk: this.calculateAverage(recentSystemMetrics, 'diskUsage'),
        peakConnections: Math.max(...recentSystemMetrics.map(m => m.activeConnections), 0),
        trends: this.calculateTrends(recentSystemMetrics)
      },

      realTimeStats: {
        activeUsers: this.getActiveUsersCount(),
        requestsPerSecond: this.calculateRequestsPerSecond(recentAPIMetrics),
        tokensPerMinute: this.calculateTokensPerMinute(recentAIUsage),
        currentErrors: this.getCurrentErrors(recentAPIMetrics)
      }
    };
  }

  /**
   * Get user-specific analytics
   */
  static getUserAnalytics(userId: string, timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): any {
    const now = new Date();
    const msRange = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const cutoff = new Date(now.getTime() - msRange[timeRange]);

    // Filter data for specific user
    const userEvents = this.events.filter(e => e.userId === userId && e.timestamp >= cutoff);
    const userAPIMetrics = this.apiMetrics.filter(m => m.userId === userId && m.timestamp >= cutoff);
    const userBehavior = this.userBehavior.filter(b => b.userId === userId && b.timestamp >= cutoff);
    const userAIUsage = this.aiUsage.filter(u => u.userId === userId && u.timestamp >= cutoff);

    return {
      userId,
      timeRange,
      overview: {
        totalEvents: userEvents.length,
        totalAPIRequests: userAPIMetrics.length,
        totalActions: userBehavior.length,
        totalAIRequests: userAIUsage.length,
        totalTokensUsed: userAIUsage.reduce((sum, u) => sum + u.totalTokens, 0)
      },
      
      usage: {
        apiRequests: userAPIMetrics.length,
        averageResponseTime: this.calculateAverage(userAPIMetrics, 'responseTime'),
        topEndpoints: this.getTopEndpoints(userAPIMetrics),
        aiRequests: userAIUsage.length,
        tokenUsage: userAIUsage.reduce((sum, u) => sum + u.totalTokens, 0),
        topFeatures: this.getTopFeatures(userBehavior)
      },

      behavior: {
        sessionCount: this.calculateUserSessions(userBehavior),
        averageSessionDuration: this.calculateAverageSessionDuration(userBehavior),
        mostUsedFeature: this.getMostUsedFeature(userBehavior),
        engagementScore: this.calculateEngagementScore(userBehavior)
      },

      timeline: this.getUserTimeline(userId, cutoff)
    };
  }

  // Helper methods for calculations
  private static calculateAverage(data: any[], field: string): number {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0);
    return Math.round((sum / data.length) * 100) / 100;
  }

  private static calculateSuccessRate(apiMetrics: APIUsageMetrics[]): number {
    if (apiMetrics.length === 0) return 100;
    const successCount = apiMetrics.filter(m => m.statusCode >= 200 && m.statusCode < 400).length;
    return Math.round((successCount / apiMetrics.length) * 100 * 100) / 100;
  }

  private static calculateErrorRate(apiMetrics: APIUsageMetrics[]): number {
    if (apiMetrics.length === 0) return 0;
    const errorCount = apiMetrics.filter(m => m.statusCode >= 400).length;
    return Math.round((errorCount / apiMetrics.length) * 100 * 100) / 100;
  }

  private static calculateAISuccessRate(aiUsage: AIUsageMetrics[]): number {
    if (aiUsage.length === 0) return 100;
    const successCount = aiUsage.filter(u => u.success).length;
    return Math.round((successCount / aiUsage.length) * 100 * 100) / 100;
  }

  private static groupBy(data: any[], field: string): Record<string, number> {
    const groups: Record<string, number> = {};
    data.forEach(item => {
      const key = item[field]?.toString() || 'unknown';
      groups[key] = (groups[key] || 0) + 1;
    });
    return groups;
  }

  private static getTopEndpoints(apiMetrics: APIUsageMetrics[], limit: number = 10): any[] {
    const endpointCounts = this.groupBy(apiMetrics, 'endpoint');
    return Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  private static getSlowestEndpoints(apiMetrics: APIUsageMetrics[], limit: number = 10): any[] {
    const endpointTimes: Record<string, number[]> = {};
    
    apiMetrics.forEach(metric => {
      if (!endpointTimes[metric.endpoint]) {
        endpointTimes[metric.endpoint] = [];
      }
      endpointTimes[metric.endpoint].push(metric.responseTime);
    });

    return Object.entries(endpointTimes)
      .map(([endpoint, times]) => ({
        endpoint,
        averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
        maxTime: Math.max(...times),
        requestCount: times.length
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, limit);
  }

  private static getTopAIUsers(aiUsage: AIUsageMetrics[], limit: number = 10): any[] {
    const userTokens: Record<string, number> = {};
    
    aiUsage.forEach(usage => {
      userTokens[usage.userId] = (userTokens[usage.userId] || 0) + usage.totalTokens;
    });

    return Object.entries(userTokens)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([userId, tokens]) => ({ userId, tokens }));
  }

  private static getTopFeatures(userBehavior: UserBehaviorMetrics[], limit: number = 10): any[] {
    const featureCounts = this.groupBy(userBehavior, 'feature');
    return Object.entries(featureCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([feature, count]) => ({ feature, count }));
  }

  private static calculateAverageSessionDuration(userBehavior: UserBehaviorMetrics[]): number {
    const sessions = userBehavior.filter(b => b.duration);
    if (sessions.length === 0) return 0;
    return this.calculateAverage(sessions, 'duration');
  }

  private static calculateUserEngagement(userBehavior: UserBehaviorMetrics[]): any {
    const uniqueUsers = new Set(userBehavior.map(b => b.userId));
    const totalActions = userBehavior.length;
    
    return {
      averageActionsPerUser: uniqueUsers.size > 0 ? Math.round(totalActions / uniqueUsers.size * 100) / 100 : 0,
      activeUsers: uniqueUsers.size,
      totalActions
    };
  }

  private static calculateTrends(systemMetrics: SystemMetrics[]): any {
    if (systemMetrics.length < 2) return null;

    const recent = systemMetrics.slice(-10); // Last 10 measurements
    const older = systemMetrics.slice(-20, -10); // Previous 10 measurements

    const recentAvgCPU = this.calculateAverage(recent, 'cpuUsage');
    const olderAvgCPU = this.calculateAverage(older, 'cpuUsage');

    return {
      cpuTrend: recentAvgCPU > olderAvgCPU ? 'increasing' : 'decreasing',
      memoryTrend: this.calculateAverage(recent, 'memoryUsage') > this.calculateAverage(older, 'memoryUsage') ? 'increasing' : 'decreasing'
    };
  }

  private static getActiveUsersCount(): number {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp >= fiveMinutesAgo);
    return new Set(recentEvents.map(e => e.userId).filter(Boolean)).size;
  }

  private static calculateRequestsPerSecond(apiMetrics: APIUsageMetrics[]): number {
    const lastMinute = new Date(Date.now() - 60 * 1000);
    const recentRequests = apiMetrics.filter(m => m.timestamp >= lastMinute);
    return Math.round(recentRequests.length / 60 * 100) / 100;
  }

  private static calculateTokensPerMinute(aiUsage: AIUsageMetrics[]): number {
    const lastMinute = new Date(Date.now() - 60 * 1000);
    const recentUsage = aiUsage.filter(u => u.timestamp >= lastMinute);
    return recentUsage.reduce((sum, u) => sum + u.totalTokens, 0);
  }

  private static getCurrentErrors(apiMetrics: APIUsageMetrics[]): number {
    const lastMinute = new Date(Date.now() - 60 * 1000);
    const recentRequests = apiMetrics.filter(m => m.timestamp >= lastMinute);
    return recentRequests.filter(m => m.statusCode >= 400).length;
  }

  private static calculateUserSessions(userBehavior: UserBehaviorMetrics[]): number {
    // Simple session calculation: group actions within 30 minutes
    const sessionGap = 30 * 60 * 1000; // 30 minutes
    const sortedActions = userBehavior.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    let sessions = 0;
    let lastActionTime = 0;
    
    sortedActions.forEach(action => {
      if (action.timestamp.getTime() - lastActionTime > sessionGap) {
        sessions++;
      }
      lastActionTime = action.timestamp.getTime();
    });
    
    return sessions;
  }

  private static getMostUsedFeature(userBehavior: UserBehaviorMetrics[]): string {
    const featureCounts = this.groupBy(userBehavior, 'feature');
    const topFeature = Object.entries(featureCounts).sort(([, a], [, b]) => b - a)[0];
    return topFeature ? topFeature[0] : 'none';
  }

  private static calculateEngagementScore(userBehavior: UserBehaviorMetrics[]): number {
    // Simple engagement score based on actions per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActions = userBehavior.filter(b => b.timestamp >= oneDayAgo);
    return Math.min(recentActions.length * 10, 100); // Cap at 100
  }

  private static getUserTimeline(userId: string, since: Date): any[] {
    const userEvents = this.events.filter(e => e.userId === userId && e.timestamp >= since);
    return userEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50) // Last 50 events
      .map(event => ({
        timestamp: event.timestamp,
        type: event.eventType,
        name: event.eventName,
        metadata: event.metadata
      }));
  }

  /**
   * Clear old data (for memory management)
   */
  static cleanup(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    this.events = this.events.filter(e => e.timestamp >= oneDayAgo);
    this.apiMetrics = this.apiMetrics.filter(m => m.timestamp >= oneDayAgo);
    this.userBehavior = this.userBehavior.filter(b => b.timestamp >= oneDayAgo);
    this.aiUsage = this.aiUsage.filter(u => u.timestamp >= oneDayAgo);
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp >= oneDayAgo);
    
    console.log('🧹 Analytics data cleaned up');
  }
}

// Start periodic cleanup
setInterval(() => {
  AnalyticsService.cleanup();
}, 60 * 60 * 1000); // Every hour

export default AnalyticsService;