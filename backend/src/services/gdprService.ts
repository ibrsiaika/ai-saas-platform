import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/auditService';
import { SecurityService } from '../services/securityService';

export interface GDPRRequest extends Request {
  gdprContext?: {
    lawfulBasis: string;
    dataCategories: string[];
    processingPurpose: string;
    retentionPeriod: number;
  };
}

export interface DataSubjectRequest {
  id?: string;
  type: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'PORTABILITY' | 'RESTRICTION' | 'OBJECTION';
  userId: string;
  email: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestDate: Date;
  completionDate?: Date;
  details: {
    reason?: string;
    dataCategories?: string[];
    specificData?: string[];
  };
  verificationToken?: string;
  responseData?: any;
}

export interface ConsentRecord {
  userId: string;
  consentType: 'marketing' | 'analytics' | 'functional' | 'personalization';
  granted: boolean;
  timestamp: Date;
  version: string;
  ipAddress: string;
  userAgent: string;
  withdrawalDate?: Date;
}

/**
 * GDPR Compliance Service
 */
export class GDPRService {
  private static readonly DATA_RETENTION_PERIODS = {
    user_data: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
    analytics_data: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
    marketing_data: 3 * 365 * 24 * 60 * 60 * 1000, // 3 years
    session_data: 30 * 24 * 60 * 60 * 1000, // 30 days
    audit_logs: 7 * 365 * 24 * 60 * 60 * 1000 // 7 years
  };

  private static dataSubjectRequests: Map<string, DataSubjectRequest> = new Map();
  private static consentRecords: Map<string, ConsentRecord[]> = new Map();

  /**
   * Initialize GDPR service
   */
  static initialize() {
    AuditService.log({
      event: 'GDPR_SERVICE_INITIALIZED',
      severity: 'low',
      details: {
        retentionPolicies: Object.keys(this.DATA_RETENTION_PERIODS),
        timestamp: new Date()
      },
      timestamp: new Date()
    });

    // Start periodic cleanup job (daily)
    setInterval(() => {
      this.performDataRetentionCleanup();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Record user consent
   */
  static recordConsent(
    userId: string,
    consentType: ConsentRecord['consentType'],
    granted: boolean,
    version: string,
    ipAddress: string,
    userAgent: string
  ): void {
    const consent: ConsentRecord = {
      userId,
      consentType,
      granted,
      timestamp: new Date(),
      version,
      ipAddress,
      userAgent
    };

    const userConsents = this.consentRecords.get(userId) || [];
    
    // Withdraw previous consent if new one is denied
    if (!granted) {
      const existingConsent = userConsents.find(c => c.consentType === consentType && c.granted);
      if (existingConsent) {
        existingConsent.withdrawalDate = new Date();
      }
    }

    userConsents.push(consent);
    this.consentRecords.set(userId, userConsents);

    AuditService.log({
      event: 'GDPR_CONSENT_RECORDED',
      severity: 'low',
      details: {
        consentType,
        granted,
        version,
        action: granted ? 'granted' : 'withdrawn'
      },
      timestamp: new Date(),
      userId
    });
  }

  /**
   * Check if user has valid consent
   */
  static hasValidConsent(userId: string, consentType: ConsentRecord['consentType']): boolean {
    const userConsents = this.consentRecords.get(userId) || [];
    const latestConsent = userConsents
      .filter(c => c.consentType === consentType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    return latestConsent?.granted && !latestConsent.withdrawalDate;
  }

  /**
   * Submit data subject request
   */
  static async submitDataSubjectRequest(request: Omit<DataSubjectRequest, 'id' | 'status' | 'requestDate' | 'verificationToken'>): Promise<string> {
    const requestId = SecurityService.generateSecureToken(16);
    const verificationToken = SecurityService.generateSecureToken(32);

    const dsrRequest: DataSubjectRequest = {
      ...request,
      id: requestId,
      status: 'pending',
      requestDate: new Date(),
      verificationToken
    };

    this.dataSubjectRequests.set(requestId, dsrRequest);

    AuditService.log({
      event: 'GDPR_DSR_SUBMITTED',
      severity: 'medium',
      details: {
        requestType: request.type,
        requestId,
        email: SecurityService.maskSensitiveData(request.email)
      },
      timestamp: new Date(),
      userId: request.userId
    });

    // In a real implementation, send email with verification token
    console.log(`Data subject request submitted. Verification token: ${verificationToken}`);

    return requestId;
  }

  /**
   * Verify data subject request
   */
  static verifyDataSubjectRequest(requestId: string, verificationToken: string): boolean {
    const request = this.dataSubjectRequests.get(requestId);
    
    if (!request || request.verificationToken !== verificationToken) {
      AuditService.log({
        event: 'GDPR_DSR_VERIFICATION_FAILED',
        severity: 'medium',
        details: {
          requestId,
          reason: !request ? 'request_not_found' : 'invalid_token'
        },
        timestamp: new Date()
      });
      return false;
    }

    request.status = 'processing';
    
    AuditService.log({
      event: 'GDPR_DSR_VERIFIED',
      severity: 'low',
      details: {
        requestId,
        requestType: request.type
      },
      timestamp: new Date(),
      userId: request.userId
    });

    // Process the request
    this.processDataSubjectRequest(request);

    return true;
  }

  /**
   * Process data subject request
   */
  private static async processDataSubjectRequest(request: DataSubjectRequest): Promise<void> {
    try {
      switch (request.type) {
        case 'ACCESS':
          await this.processAccessRequest(request);
          break;
        case 'ERASURE':
          await this.processErasureRequest(request);
          break;
        case 'PORTABILITY':
          await this.processPortabilityRequest(request);
          break;
        case 'RECTIFICATION':
          await this.processRectificationRequest(request);
          break;
        case 'RESTRICTION':
          await this.processRestrictionRequest(request);
          break;
        case 'OBJECTION':
          await this.processObjectionRequest(request);
          break;
        default:
          throw new Error(`Unsupported request type: ${request.type}`);
      }

      request.status = 'completed';
      request.completionDate = new Date();

      AuditService.log({
        event: 'GDPR_DSR_COMPLETED',
        severity: 'medium',
        details: {
          requestId: request.id,
          requestType: request.type,
          processingTimeMs: request.completionDate.getTime() - request.requestDate.getTime()
        },
        timestamp: new Date(),
        userId: request.userId
      });

    } catch (error) {
      request.status = 'rejected';
      
      AuditService.log({
        event: 'GDPR_DSR_FAILED',
        severity: 'high',
        details: {
          requestId: request.id,
          requestType: request.type,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date(),
        userId: request.userId
      });
    }
  }

  /**
   * Process access request (Article 15)
   */
  private static async processAccessRequest(request: DataSubjectRequest): Promise<void> {
    // In a real implementation, gather user data from all systems
    const userData = {
      personalData: {
        userId: request.userId,
        email: request.email,
        // ... other personal data
      },
      processingActivities: await this.getUserProcessingActivities(request.userId),
      consentHistory: this.consentRecords.get(request.userId) || [],
      dataRetentionInfo: this.getDataRetentionInfo(),
      thirdPartySharing: this.getThirdPartySharing(request.userId)
    };

    request.responseData = userData;
    
    AuditService.logDataAccess(request.userId, 'all_personal_data', 'READ', {
      purpose: 'gdpr_access_request',
      requestId: request.id
    });
  }

  /**
   * Process erasure request (Article 17 - Right to be forgotten)
   */
  private static async processErasureRequest(request: DataSubjectRequest): Promise<void> {
    // Check if erasure is legally required or if there are legitimate grounds to refuse
    const canErase = this.canEraseUserData(request.userId);
    
    if (!canErase.allowed) {
      throw new Error(`Erasure not permitted: ${canErase.reason}`);
    }

    // In a real implementation, delete user data from all systems
    // This is a placeholder for the actual deletion logic
    console.log(`Erasing data for user: ${request.userId}`);

    AuditService.logDataAccess(request.userId, 'all_personal_data', 'delete', {
      purpose: 'gdpr_erasure_request',
      requestId: request.id
    });
  }

  /**
   * Process portability request (Article 20)
   */
  private static async processPortabilityRequest(request: DataSubjectRequest): Promise<void> {
    // Export user data in a structured, machine-readable format
    const exportData = await this.exportUserData(request.userId);
    
    request.responseData = {
      format: 'JSON',
      data: exportData,
      exportDate: new Date(),
      instructions: 'This data can be imported into compatible systems'
    };

    AuditService.logDataAccess(request.userId, 'all_personal_data', 'READ', {
      purpose: 'gdpr_portability_request',
      requestId: request.id
    });
  }

  /**
   * Process rectification request (Article 16)
   */
  private static async processRectificationRequest(request: DataSubjectRequest): Promise<void> {
    // In a real implementation, update user data based on corrections provided
    console.log(`Processing rectification for user: ${request.userId}`);
    
    AuditService.logDataAccess(request.userId, 'personal_data', 'write', {
      purpose: 'gdpr_rectification_request',
      requestId: request.id,
      changes: request.details.specificData
    });
  }

  /**
   * Process restriction request (Article 18)
   */
  private static async processRestrictionRequest(request: DataSubjectRequest): Promise<void> {
    // Mark user data for restricted processing
    console.log(`Restricting processing for user: ${request.userId}`);
    
    AuditService.log({
      event: 'GDPR_PROCESSING_RESTRICTED',
      severity: 'medium',
      details: {
        reason: request.details.reason,
        dataCategories: request.details.dataCategories
      },
      timestamp: new Date(),
      userId: request.userId
    });
  }

  /**
   * Process objection request (Article 21)
   */
  private static async processObjectionRequest(request: DataSubjectRequest): Promise<void> {
    // Stop processing for specified purposes
    console.log(`Processing objection for user: ${request.userId}`);
    
    // Withdraw relevant consents
    const dataCategories = request.details.dataCategories || ['marketing', 'analytics'];
    for (const category of dataCategories) {
      if (['marketing', 'analytics', 'functional', 'personalization'].includes(category)) {
        this.recordConsent(
          request.userId,
          category as ConsentRecord['consentType'],
          false,
          '1.0',
          'system',
          'gdpr-objection'
        );
      }
    }
  }

  /**
   * Check if user data can be erased
   */
  private static canEraseUserData(userId: string): { allowed: boolean; reason?: string } {
    // Check for legal obligations that prevent erasure
    // This is a simplified check - real implementation would be more complex
    
    // Check if user has outstanding financial obligations
    // Check if data is required for legal compliance
    // Check if data is needed for legitimate interests
    
    return { allowed: true };
  }

  /**
   * Get user processing activities
   */
  private static async getUserProcessingActivities(userId: string): Promise<any[]> {
    // In a real implementation, query all processing activities for the user
    return [
      {
        purpose: 'Service provision',
        lawfulBasis: 'Contractual necessity',
        dataCategories: ['identity', 'contact', 'usage'],
        retentionPeriod: '7 years after account closure'
      },
      {
        purpose: 'Marketing communications',
        lawfulBasis: 'Consent',
        dataCategories: ['contact', 'preferences'],
        retentionPeriod: '3 years after consent withdrawal'
      }
    ];
  }

  /**
   * Get data retention information
   */
  private static getDataRetentionInfo(): any {
    return {
      policies: Object.entries(this.DATA_RETENTION_PERIODS).map(([category, period]) => ({
        category,
        retentionPeriod: `${Math.floor(period / (365 * 24 * 60 * 60 * 1000))} years`
      }))
    };
  }

  /**
   * Get third party sharing information
   */
  private static getThirdPartySharing(userId: string): any[] {
    return [
      {
        recipient: 'OpenAI',
        purpose: 'AI processing',
        dataCategories: ['usage', 'content'],
        safeguards: 'Standard contractual clauses'
      }
    ];
  }

  /**
   * Export user data
   */
  private static async exportUserData(userId: string): Promise<any> {
    // In a real implementation, gather all user data from all systems
    return {
      profile: {
        id: userId,
        // ... other profile data
      },
      preferences: {
        // ... user preferences
      },
      usage: {
        // ... usage data
      },
      consents: this.consentRecords.get(userId) || []
    };
  }

  /**
   * Perform data retention cleanup
   */
  private static performDataRetentionCleanup(): void {
    AuditService.log({
      event: 'GDPR_RETENTION_CLEANUP_STARTED',
      severity: 'low',
      details: {
        timestamp: new Date()
      },
      timestamp: new Date()
    });

    // In a real implementation, this would query databases and delete expired data
    console.log('Performing GDPR data retention cleanup...');

    AuditService.log({
      event: 'GDPR_RETENTION_CLEANUP_COMPLETED',
      severity: 'low',
      details: {
        timestamp: new Date()
      },
      timestamp: new Date()
    });
  }

  /**
   * Get data subject request status
   */
  static getRequestStatus(requestId: string): DataSubjectRequest | null {
    return this.dataSubjectRequests.get(requestId) || null;
  }

  /**
   * Generate GDPR compliance report
   */
  static generateComplianceReport(): any {
    const totalRequests = this.dataSubjectRequests.size;
    const completedRequests = Array.from(this.dataSubjectRequests.values()).filter(r => r.status === 'completed').length;
    const averageProcessingTime = this.calculateAverageProcessingTime();

    return {
      summary: {
        totalRequests,
        completedRequests,
        completionRate: totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0,
        averageProcessingTimeHours: averageProcessingTime
      },
      requestsByType: this.getRequestsByType(),
      consentStatistics: this.getConsentStatistics(),
      dataRetentionCompliance: this.checkDataRetentionCompliance()
    };
  }

  /**
   * Calculate average processing time
   */
  private static calculateAverageProcessingTime(): number {
    const completedRequests = Array.from(this.dataSubjectRequests.values())
      .filter(r => r.status === 'completed' && r.completionDate);

    if (completedRequests.length === 0) return 0;

    const totalTime = completedRequests.reduce((sum, request) => {
      const processingTime = request.completionDate!.getTime() - request.requestDate.getTime();
      return sum + processingTime;
    }, 0);

    return Math.round(totalTime / completedRequests.length / (1000 * 60 * 60)); // Convert to hours
  }

  /**
   * Get requests by type
   */
  private static getRequestsByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const request of this.dataSubjectRequests.values()) {
      counts[request.type] = (counts[request.type] || 0) + 1;
    }

    return counts;
  }

  /**
   * Get consent statistics
   */
  private static getConsentStatistics(): any {
    const stats = {
      totalUsers: this.consentRecords.size,
      consentsByType: {} as Record<string, { granted: number; withdrawn: number }>
    };

    for (const consents of this.consentRecords.values()) {
      for (const consent of consents) {
        if (!stats.consentsByType[consent.consentType]) {
          stats.consentsByType[consent.consentType] = { granted: 0, withdrawn: 0 };
        }

        if (consent.granted && !consent.withdrawalDate) {
          stats.consentsByType[consent.consentType].granted++;
        } else if (consent.withdrawalDate) {
          stats.consentsByType[consent.consentType].withdrawn++;
        }
      }
    }

    return stats;
  }

  /**
   * Check data retention compliance
   */
  private static checkDataRetentionCompliance(): any {
    return {
      policiesConfigured: Object.keys(this.DATA_RETENTION_PERIODS).length,
      cleanupJobActive: true,
      lastCleanup: new Date().toISOString() // In real implementation, track actual cleanup
    };
  }
}

/**
 * GDPR compliance middleware
 */
export const gdprComplianceMiddleware = (req: GDPRRequest, res: Response, next: NextFunction) => {
  // Add GDPR context to request
  req.gdprContext = {
    lawfulBasis: 'Legitimate interest', // Default, should be determined by endpoint
    dataCategories: ['usage'],
    processingPurpose: 'Service provision',
    retentionPeriod: GDPRService['DATA_RETENTION_PERIODS'].user_data
  };

  // Check for consent requirements
  const userId = (req as any).user?.userId;
  if (userId && req.path.includes('/api/analytics')) {
    if (!GDPRService.hasValidConsent(userId, 'analytics')) {
      return res.status(403).json({
        success: false,
        message: 'Analytics consent required',
        error: 'GDPR_CONSENT_REQUIRED',
        consentType: 'analytics'
      });
    }
  }

  next();
};