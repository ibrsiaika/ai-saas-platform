import { Request, Response, NextFunction } from 'express';
import { AnalyticsService, AuthenticatedRequest } from '../services/analyticsService';
import { AuthService } from '../services/authService';

/**
 * Analytics middleware to track API usage and performance
 */
export const analyticsMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Extract user info from authorization header
  let userId: string | undefined;
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = AuthService.verifyToken(token);
      userId = payload.userId;
      req.user = {
        userId: payload.userId,
        email: payload.email,
        plan: payload.plan
      };
    }
  } catch (error) {
    // Ignore token verification errors for analytics
  }

  // Add analytics context to request
  req.analytics = {
    startTime,
    endpoint: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'] || 'unknown',
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
  };

  // Override res.json to capture response data
  const originalJson = res.json;
  res.json = function (body: any) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Extract token usage from response if available
    let tokensUsed: number | undefined;
    if (body && typeof body === 'object') {
      if (body.usage && body.usage.totalTokens) {
        tokensUsed = body.usage.totalTokens;
      } else if (body.tokens) {
        tokensUsed = body.tokens;
      }
    }

    // Track API usage
    AnalyticsService.trackAPIUsage({
      endpoint: req.analytics!.endpoint,
      method: req.analytics!.method,
      statusCode: res.statusCode,
      responseTime,
      tokensUsed,
      userId,
      timestamp: new Date(),
      errorMessage: res.statusCode >= 400 ? body?.message || body?.error : undefined
    });

    // Track error events
    if (res.statusCode >= 400) {
      AnalyticsService.trackEvent({
        eventType: 'error',
        eventName: `${res.statusCode}_error`,
        userId,
        metadata: {
          endpoint: req.analytics!.endpoint,
          method: req.analytics!.method,
          statusCode: res.statusCode,
          errorMessage: body?.message || body?.error,
          userAgent: req.analytics!.userAgent,
          ipAddress: req.analytics!.ipAddress
        },
        ipAddress: req.analytics!.ipAddress,
        userAgent: req.analytics!.userAgent
      });
    }

    return originalJson.call(this, body);
  };

  // Override res.status to capture status changes
  const originalStatus = res.status;
  res.status = function (code: number) {
    // Track performance events for slow requests
    if (Date.now() - startTime > 5000) { // 5 seconds
      AnalyticsService.trackEvent({
        eventType: 'performance',
        eventName: 'slow_request',
        userId,
        metadata: {
          endpoint: req.analytics!.endpoint,
          method: req.analytics!.method,
          responseTime: Date.now() - startTime,
          statusCode: code
        }
      });
    }

    return originalStatus.call(this, code);
  };

  next();
};

/**
 * Enhanced error tracking middleware
 */
export const errorTrackingMiddleware = (error: any, req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const responseTime = Date.now() - (req.analytics?.startTime || Date.now());

  // Track detailed error information
  AnalyticsService.trackEvent({
    eventType: 'error',
    eventName: 'unhandled_error',
    userId: req.user?.userId,
    metadata: {
      endpoint: req.analytics?.endpoint || req.path,
      method: req.analytics?.method || req.method,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      responseTime,
      userAgent: req.analytics?.userAgent,
      ipAddress: req.analytics?.ipAddress
    },
    ipAddress: req.analytics?.ipAddress,
    userAgent: req.analytics?.userAgent
  });

  next(error);
};

/**
 * User behavior tracking middleware
 */
export const userBehaviorMiddleware = (feature: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.userId) {
      AnalyticsService.trackUserBehavior({
        userId: req.user.userId,
        action: `${req.method.toLowerCase()}_${req.path.split('/').pop()}`,
        feature,
        timestamp: new Date(),
        metadata: {
          endpoint: req.path,
          method: req.method,
          userAgent: req.headers['user-agent']
        }
      });
    }
    next();
  };
};

/**
 * Real-time metrics middleware
 */
export const realTimeMetricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Track real-time system metrics
  setImmediate(() => {
    AnalyticsService.trackSystemMetrics({
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to percentage approximation
      memoryUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      diskUsage: 0, // Would need additional library for accurate disk usage
      activeConnections: (global as any).activeConnections || 0,
      databaseConnections: (global as any).dbConnections || 0,
      redisConnections: (global as any).redisConnections || 0,
      timestamp: new Date()
    });
  });

  next();
};

/**
 * Rate limiting analytics middleware
 */
export const rateLimitAnalytics = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Track rate limiting events
  res.on('finish', () => {
    if (res.statusCode === 429) {
      AnalyticsService.trackEvent({
        eventType: 'api_call',
        eventName: 'rate_limit_exceeded',
        userId: req.user?.userId,
        metadata: {
          endpoint: req.path,
          method: req.method,
          ipAddress: req.analytics?.ipAddress,
          userAgent: req.analytics?.userAgent
        },
        ipAddress: req.analytics?.ipAddress,
        userAgent: req.analytics?.userAgent
      });
    }
  });

  next();
};

/**
 * AI usage tracking middleware
 */
export const aiUsageMiddleware = (feature: 'chat' | 'generation' | 'embedding' | 'rag') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    
    res.json = function (body: any) {
      // Track AI usage if response contains usage data
      if (body && body.usage && req.user?.userId) {
        AnalyticsService.trackAIUsage({
          userId: req.user.userId,
          model: body.model || 'gpt-4',
          promptTokens: body.usage.promptTokens || 0,
          completionTokens: body.usage.completionTokens || 0,
          totalTokens: body.usage.totalTokens || 0,
          responseTime: Date.now() - (req.analytics?.startTime || Date.now()),
          feature,
          success: res.statusCode < 400,
          errorType: res.statusCode >= 400 ? body.error?.type : undefined,
          timestamp: new Date()
        });
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Session tracking middleware
 */
export const sessionTrackingMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.userId) {
    // Track session start/activity
    AnalyticsService.trackEvent({
      eventType: 'user_action',
      eventName: 'session_activity',
      userId: req.user.userId,
      metadata: {
        endpoint: req.path,
        method: req.method,
        sessionId: req.headers['x-session-id'] as string || `session_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
  }

  next();
};