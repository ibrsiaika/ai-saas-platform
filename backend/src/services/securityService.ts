import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Security Service for advanced security features
 */
export class SecurityService {
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 64;
  private static readonly TAG_LENGTH = 16;
  private static readonly HASH_ITERATIONS = 100000;

  private static encryptionKey: Buffer;

  /**
   * Initialize security service with encryption key
   */
  static initialize() {
    const keySource = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-change-in-production';
    this.encryptionKey = crypto.scryptSync(keySource, 'salt', this.KEY_LENGTH);
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipher(this.ENCRYPTION_ALGORITHM, this.encryptionKey);
      cipher.setAAD(Buffer.from('auth-data'));

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();
      
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipher(this.ENCRYPTION_ALGORITHM, this.encryptionKey);
      decipher.setAAD(Buffer.from('auth-data'));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Data decryption failed');
    }
  }

  /**
   * Hash sensitive data with salt
   */
  static hashWithSalt(data: string, providedSalt?: string): { hash: string; salt: string } {
    const salt = providedSalt || crypto.randomBytes(this.SALT_LENGTH).toString('hex');
    const hash = crypto.pbkdf2Sync(data, salt, this.HASH_ITERATIONS, 64, 'sha512').toString('hex');
    
    return { hash, salt };
  }

  /**
   * Verify hashed data
   */
  static verifyHash(data: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashWithSalt(data, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate API key with checksum
   */
  static generateAPIKey(): string {
    const randomPart = crypto.randomBytes(24).toString('base64url');
    const timestamp = Date.now().toString(36);
    const checksum = crypto.createHash('sha256').update(randomPart + timestamp).digest('hex').substring(0, 8);
    
    return `sk_${randomPart}_${timestamp}_${checksum}`;
  }

  /**
   * Validate API key format and checksum
   */
  static validateAPIKey(apiKey: string): boolean {
    const parts = apiKey.split('_');
    if (parts.length !== 4 || parts[0] !== 'sk') {
      return false;
    }

    const [, randomPart, timestamp, providedChecksum] = parts;
    const expectedChecksum = crypto.createHash('sha256').update(randomPart + timestamp).digest('hex').substring(0, 8);
    
    return crypto.timingSafeEqual(Buffer.from(providedChecksum), Buffer.from(expectedChecksum));
  }

  /**
   * Sanitize user input to prevent XSS
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>\"']/g, (match) => {
        const entities: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;'
        };
        return entities[match];
      })
      .trim()
      .substring(0, 10000); // Limit length
  }

  /**
   * Validate and sanitize email
   */
  static sanitizeEmail(email: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = email.toLowerCase().trim();
    
    if (!emailRegex.test(sanitized) || sanitized.length > 254) {
      return null;
    }
    
    return sanitized;
  }

  /**
   * Generate Content Security Policy header
   */
  static getCSPHeader(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.openai.com wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }

  /**
   * Check for common SQL injection patterns
   */
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
      /(--|\/\*|\*\/|;)/,
      /(\b(or|and)\b\s+\w+\s*[=<>])/i,
      /(\'\s*(or|and)\s*\'\w*\'?\s*[=<>])/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Rate limiting data structure
   */
  private static rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  /**
   * Advanced rate limiting
   */
  static checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const key = identifier;
    const existing = this.rateLimitStore.get(key);

    if (!existing || now > existing.resetTime) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (existing.count >= maxRequests) {
      return false;
    }

    existing.count++;
    return true;
  }

  /**
   * Clean expired rate limit entries
   */
  static cleanRateLimitStore(): void {
    const now = Date.now();
    for (const [key, value] of this.rateLimitStore.entries()) {
      if (now > value.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): { valid: boolean; score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('Password must be at least 8 characters long');

    if (password.length >= 12) score += 1;

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Include numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('Include special characters');

    // Common password check
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.includes(password.toLowerCase())) {
      score = 0;
      feedback.push('Avoid common passwords');
    }

    return {
      valid: score >= 4,
      score,
      feedback
    };
  }

  /**
   * Generate secure session ID
   */
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Mask sensitive data for logging
   */
  static maskSensitiveData(data: any): any {
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
    
    if (typeof data === 'string') {
      return data.length > 4 ? data.substring(0, 4) + '***' : '***';
    }

    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item));
    }

    if (typeof data === 'object' && data !== null) {
      const masked: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          masked[key] = '***masked***';
        } else {
          masked[key] = this.maskSensitiveData(value);
        }
      }
      return masked;
    }

    return data;
  }
}

// Initialize security service
SecurityService.initialize();

// Clean rate limit store every 5 minutes
setInterval(() => {
  SecurityService.cleanRateLimitStore();
}, 5 * 60 * 1000);