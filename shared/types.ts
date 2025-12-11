// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'enterprise';
  tokensUsed: number;
  tokensLimit: number;
  createdAt: Date;
  updatedAt: Date;
  passwordHash?: string; // Only used server-side
  emailVerified?: boolean;
  apiKey?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

// AI Generation Types
export interface AIRequest {
  prompt: string;
  type: 'content' | 'chat' | 'code' | 'business';
  userId?: string;
  sessionId?: string;
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    contentType?: string;
    tone?: string;
    audience?: string;
    context?: string;
    language?: string;
    industry?: string;
  };
}

export interface AIResponse {
  success: boolean;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  timestamp: string;
  error?: {
    message: string;
    code: string;
    type: string;
  };
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Vector Database Types
export interface DocumentChunk {
  id: string;
  content: string;
  source?: string;
  type?: string;
  userId?: string;
  tags?: string[];
  metadata?: {
    source?: string;
    type?: string;
    userId?: string;
    timestamp?: Date;
    [key: string]: any;
  };
  embedding?: number[];
}

export interface VectorSearchResult {
  id: string;
  score: number;
  content: string;
  source: string;
  type: string;
  metadata: any;
}

export interface SearchResult {
  content: string;
  score: number;
  metadata: any;
}

// Subscription and Usage Types
export interface Usage {
  id: string;
  userId: string;
  type: 'text_generation' | 'image_generation' | 'chat' | 'search';
  tokens: number;
  cost: number;
  timestamp: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  stripeSubscriptionId?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Real-time Socket Events
export interface SocketEvents {
  'ai-request': (data: AIRequest) => void;
  'ai-response': (data: AIResponse) => void;
  'chat-message': (message: ChatMessage) => void;
  'typing': (userId: string) => void;
  'user-connected': (userId: string) => void;
  'user-disconnected': (userId: string) => void;
}

// Content Templates
export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'blog' | 'social' | 'email' | 'ad' | 'product';
  prompt: string;
  variables: string[];
  category: string;
}

// Analytics Types
export interface AnalyticsData {
  totalRequests: number;
  totalTokens: number;
  totalUsers: number;
  averageResponseTime: number;
  topContentTypes: Array<{ type: string; count: number }>;
  usageByPlan: Array<{ plan: string; usage: number }>;
}