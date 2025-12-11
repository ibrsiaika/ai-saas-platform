import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User, AuthResponse } from '../../../shared/types';

export interface JWTPayload {
  userId: string;
  email: string;
  plan: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash a password
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error: any) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error: any) {
      throw new Error(`Password comparison failed: ${error.message}`);
    }
  }

  /**
   * Generate JWT token
   */
  static generateToken(payload: JWTPayload): string {
    try {
      return jwt.sign(
        payload as object, 
        this.JWT_SECRET as string, 
        {
          expiresIn: this.JWT_EXPIRES_IN
        } as jwt.SignOptions
      );
    } catch (error: any) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET as string) as JWTPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate secure random token for email verification, password reset, etc.
   */
  static generateSecureToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create user session data
   */
  static createUserSession(user: User): {
    user: Omit<User, 'passwordHash'>;
    token: string;
  } {
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      plan: user.plan,
      tokensUsed: user.tokensUsed,
      tokensLimit: user.tokensLimit,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      plan: user.plan
    });

    return {
      user: userWithoutPassword,
      token
    };
  }

  /**
   * Get token limits based on plan
   */
  static getTokenLimits(plan: 'free' | 'pro' | 'enterprise'): number {
    const limits = {
      free: 10000,      // 10K tokens per month
      pro: 100000,      // 100K tokens per month
      enterprise: 1000000 // 1M tokens per month
    };

    return limits[plan] || limits.free;
  }

  /**
   * Check if user has enough tokens
   */
  static hasEnoughTokens(user: User, requiredTokens: number): boolean {
    return (user.tokensUsed + requiredTokens) <= user.tokensLimit;
  }

  /**
   * Update user token usage
   */
  static updateTokenUsage(user: User, tokensUsed: number): User {
    return {
      ...user,
      tokensUsed: user.tokensUsed + tokensUsed,
      updatedAt: new Date()
    };
  }

  /**
   * Check if user can upgrade plan
   */
  static canUpgradePlan(currentPlan: string, targetPlan: string): boolean {
    const planHierarchy = ['free', 'pro', 'enterprise'];
    const currentIndex = planHierarchy.indexOf(currentPlan);
    const targetIndex = planHierarchy.indexOf(targetPlan);

    return targetIndex > currentIndex;
  }

  /**
   * Sanitize user input
   */
  static sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Generate API key for user
   */
  static generateApiKey(userId: string): string {
    const prefix = 'aisaas';
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    const userIdHash = require('crypto')
      .createHash('md5')
      .update(userId)
      .digest('hex')
      .substring(0, 8);

    return `${prefix}_${timestamp}_${userIdHash}_${random}`;
  }

  /**
   * Validate API key format
   */
  static validateApiKey(apiKey: string): boolean {
    const apiKeyRegex = /^aisaas_[a-z0-9]+_[a-f0-9]{8}_[a-z0-9]+$/;
    return apiKeyRegex.test(apiKey);
  }

  /**
   * Extract rate limit info for user
   */
  static getRateLimitInfo(plan: 'free' | 'pro' | 'enterprise'): {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  } {
    const limits = {
      free: {
        requestsPerMinute: 5,
        requestsPerHour: 60,
        requestsPerDay: 500
      },
      pro: {
        requestsPerMinute: 30,
        requestsPerHour: 500,
        requestsPerDay: 5000
      },
      enterprise: {
        requestsPerMinute: 100,
        requestsPerHour: 2000,
        requestsPerDay: 50000
      }
    };

    return limits[plan] || limits.free;
  }

  /**
   * Check if authentication is properly configured
   */
  static isConfigured(): boolean {
    return !!(this.JWT_SECRET && this.JWT_SECRET !== 'fallback-secret-key');
  }

  /**
   * Get service health status
   */
  static getHealthStatus(): {
    configured: boolean;
    jwtConfigured: boolean;
    features: string[];
  } {
    return {
      configured: this.isConfigured(),
      jwtConfigured: !!(this.JWT_SECRET && this.JWT_SECRET.length > 20),
      features: [
        'jwt-authentication',
        'password-hashing',
        'token-management',
        'rate-limiting',
        'api-keys',
        'multi-tenant'
      ]
    };
  }
}

export default AuthService;