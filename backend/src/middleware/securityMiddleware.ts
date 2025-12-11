import { Request, Response, NextFunction } from 'express';
import { SecurityService } from '../services/securityService';
import { AuditService } from '../services/auditService';

export interface SecurityRequest extends Request {
  securityContext?: {
    isSecure: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    clientInfo: {
      ip: string;
      userAgent: string;
      country?: string;
    };
  };
}

/**
 * Enhanced security middleware with threat detection
 */
export const securityMiddleware = (req: SecurityRequest, res: Response, next: NextFunction) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    // Initialize security context
    req.securityContext = {
      isSecure: true,
      riskLevel: 'low',
      clientInfo: {
        ip: clientIP,
        userAgent: userAgent
      }
    };

    // Check for suspicious patterns
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check for SQL injection attempts in query parameters and body
    const checkSQLInjection = (obj: any): boolean => {
      if (typeof obj === 'string') {
        return SecurityService.detectSQLInjection(obj);
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).some(value => checkSQLInjection(value));
      }
      return false;
    };

    if (checkSQLInjection(req.query) || checkSQLInjection(req.body)) {
      riskLevel = 'high';
      AuditService.log({
        event: 'SECURITY_THREAT',
        severity: 'high',
        details: {
          type: 'SQL_INJECTION_ATTEMPT',
          ip: clientIP,
          userAgent,
          path: req.path,
          method: req.method,
          query: SecurityService.maskSensitiveData(req.query),
          body: SecurityService.maskSensitiveData(req.body)
        },
        timestamp: new Date(),
        userId: (req as any).user?.userId
      });
    }

    // Check for XSS attempts
    const checkXSS = (obj: any): boolean => {
      if (typeof obj === 'string') {
        return /<script|javascript:|on\w+\s*=|data:\s*text\/html/i.test(obj);
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).some(value => checkXSS(value));
      }
      return false;
    };

    if (checkXSS(req.query) || checkXSS(req.body)) {
      riskLevel = 'high';
      AuditService.log({
        event: 'SECURITY_THREAT',
        severity: 'high',
        details: {
          type: 'XSS_ATTEMPT',
          ip: clientIP,
          userAgent,
          path: req.path,
          method: req.method
        },
        timestamp: new Date(),
        userId: (req as any).user?.userId
      });
    }

    // Check for suspicious user agents
    const suspiciousUserAgents = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /masscan/i,
      /nessus/i,
      /burp/i,
      /zap/i
    ];

    if (suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
      riskLevel = 'medium';
      AuditService.log({
        event: 'SECURITY_WARNING',
        severity: 'medium',
        details: {
          type: 'SUSPICIOUS_USER_AGENT',
          ip: clientIP,
          userAgent,
          path: req.path
        },
        timestamp: new Date(),
        userId: (req as any).user?.userId
      });
    }

    // Check for rapid requests (simple bot detection)
    const rateLimitKey = `security_${clientIP}`;
    if (!SecurityService.checkRateLimit(rateLimitKey, 100, 60000)) { // 100 requests per minute
      riskLevel = 'medium';
      AuditService.log({
        event: 'SECURITY_WARNING',
        severity: 'medium',
        details: {
          type: 'RATE_LIMIT_EXCEEDED',
          ip: clientIP,
          userAgent,
          path: req.path
        },
        timestamp: new Date(),
        userId: (req as any).user?.userId
      });

      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please slow down.',
        error: 'RATE_LIMIT_EXCEEDED'
      });
    }

    // Check for path traversal attempts
    if (req.path.includes('../') || req.path.includes('..\\')) {
      riskLevel = 'high';
      AuditService.log({
        event: 'SECURITY_THREAT',
        severity: 'high',
        details: {
          type: 'PATH_TRAVERSAL_ATTEMPT',
          ip: clientIP,
          userAgent,
          path: req.path
        },
        timestamp: new Date(),
        userId: (req as any).user?.userId
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid path',
        error: 'PATH_TRAVERSAL_DETECTED'
      });
    }

    // Block high-risk requests
    if (riskLevel === 'high') {
      return res.status(403).json({
        success: false,
        message: 'Request blocked due to security policy',
        error: 'SECURITY_POLICY_VIOLATION'
      });
    }

    req.securityContext.riskLevel = riskLevel;

    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', SecurityService.getCSPHeader());
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    next();
  } catch (error) {
    console.error('Security middleware error:', error);
    AuditService.log({
      event: 'SYSTEM_ERROR',
      severity: 'high',
      details: {
        type: 'SECURITY_MIDDLEWARE_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: new Date()
    });
    next();
  }
};

/**
 * Input sanitization middleware
 */
export const sanitizationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize query parameters
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          req.query[key] = SecurityService.sanitizeInput(value);
        }
      }
    }

    // Sanitize body (for string fields only, preserve objects/arrays)
    if (req.body && typeof req.body === 'object') {
      const sanitizeObject = (obj: any): any => {
        if (typeof obj === 'string') {
          return SecurityService.sanitizeInput(obj);
        }
        if (Array.isArray(obj)) {
          return obj.map(item => sanitizeObject(item));
        }
        if (typeof obj === 'object' && obj !== null) {
          const sanitized: any = {};
          for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeObject(value);
          }
          return sanitized;
        }
        return obj;
      };

      req.body = sanitizeObject(req.body);
    }

    next();
  } catch (error) {
    console.error('Sanitization middleware error:', error);
    next();
  }
};

/**
 * API key validation middleware
 */
export const apiKeyValidationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (apiKey) {
      if (!SecurityService.validateAPIKey(apiKey)) {
        AuditService.log({
          event: 'SECURITY_WARNING',
          severity: 'medium',
          details: {
            type: 'INVALID_API_KEY',
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            apiKey: apiKey.substring(0, 10) + '***'
          },
          timestamp: new Date()
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid API key format',
          error: 'INVALID_API_KEY'
        });
      }
    }

    next();
  } catch (error) {
    console.error('API key validation error:', error);
    next();
  }
};

/**
 * CORS security middleware
 */
export const corsSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('Origin');
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'https://localhost:3000'
  ];

  // Log suspicious origin attempts
  if (origin && !allowedOrigins.includes(origin)) {
    AuditService.log({
      event: 'SECURITY_WARNING',
      severity: 'low',
      details: {
        type: 'SUSPICIOUS_ORIGIN',
        origin,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      },
      timestamp: new Date()
    });
  }

  next();
};