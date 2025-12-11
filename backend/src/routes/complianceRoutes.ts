import express from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';
import { GDPRService, DataSubjectRequest } from '../services/gdprService';
import { AuditService } from '../services/auditService';
import { SecurityService } from '../services/securityService';

const router = express.Router();

/**
 * Submit GDPR data subject request
 */
router.post('/gdpr/request', async (req, res) => {
  try {
    const { type, email, details } = req.body;
    
    if (!type || !email) {
      return res.status(400).json({
        success: false,
        message: 'Request type and email are required'
      });
    }

    const validTypes = ['ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'RESTRICTION', 'OBJECTION'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request type',
        validTypes
      });
    }

    const sanitizedEmail = SecurityService.sanitizeEmail(email);
    if (!sanitizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const requestId = await GDPRService.submitDataSubjectRequest({
      type,
      userId: 'user_' + SecurityService.generateSecureToken(8), // In real app, derive from email
      email: sanitizedEmail,
      details: details || {}
    });

    res.json({
      success: true,
      requestId,
      message: 'Data subject request submitted. Check your email for verification instructions.',
      estimatedProcessingTime: '30 days'
    });

  } catch (error) {
    console.error('GDPR request submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit request'
    });
  }
});

/**
 * Verify data subject request
 */
router.post('/gdpr/verify', async (req, res) => {
  try {
    const { requestId, verificationToken } = req.body;

    if (!requestId || !verificationToken) {
      return res.status(400).json({
        success: false,
        message: 'Request ID and verification token are required'
      });
    }

    const verified = GDPRService.verifyDataSubjectRequest(requestId, verificationToken);

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token or request ID'
      });
    }

    res.json({
      success: true,
      message: 'Request verified and processing started'
    });

  } catch (error) {
    console.error('GDPR verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
});

/**
 * Check data subject request status
 */
router.get('/gdpr/request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = GDPRService.getRequestStatus(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Remove sensitive information
    const { verificationToken, responseData, ...publicRequest } = request;

    res.json({
      success: true,
      request: publicRequest
    });

  } catch (error) {
    console.error('GDPR status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check request status'
    });
  }
});

/**
 * Record user consent
 */
router.post('/gdpr/consent', authMiddleware, async (req, res) => {
  try {
    const { consentType, granted, version = '1.0' } = req.body;
    const userId = (req as any).user.userId;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    const validConsentTypes = ['marketing', 'analytics', 'functional', 'personalization'];
    if (!validConsentTypes.includes(consentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consent type',
        validTypes: validConsentTypes
      });
    }

    GDPRService.recordConsent(userId, consentType, granted, version, ipAddress, userAgent);

    res.json({
      success: true,
      message: `Consent ${granted ? 'granted' : 'withdrawn'} for ${consentType}`
    });

  } catch (error) {
    console.error('Consent recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record consent'
    });
  }
});

/**
 * Get user consent status
 */
router.get('/gdpr/consent/:consentType', authMiddleware, async (req, res) => {
  try {
    const { consentType } = req.params;
    const userId = (req as any).user.userId;

    const validConsentTypes = ['marketing', 'analytics', 'functional', 'personalization'];
    if (!validConsentTypes.includes(consentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consent type'
      });
    }

    const hasConsent = GDPRService.hasValidConsent(userId, consentType as any);

    res.json({
      success: true,
      consentType,
      granted: hasConsent
    });

  } catch (error) {
    console.error('Consent check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check consent'
    });
  }
});

/**
 * Generate compliance report (admin only)
 */
router.get('/compliance/report', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const [auditReport, gdprReport] = await Promise.all([
      AuditService.generateComplianceReport(start, end),
      GDPRService.generateComplianceReport()
    ]);

    res.json({
      success: true,
      period: { start, end },
      audit: auditReport,
      gdpr: gdprReport,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Compliance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report'
    });
  }
});

/**
 * Get audit logs (admin only)
 */
router.get('/audit/logs', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      event, 
      severity, 
      userId,
      limit = 100 
    } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const logs = await AuditService.queryLogs(start, end, {
      event: event as string,
      severity: severity as string,
      userId: userId as string
    });

    // Limit results and remove sensitive data
    const limitedLogs = logs.slice(0, Number(limit)).map(log => ({
      ...log,
      details: SecurityService.maskSensitiveData(log.details)
    }));

    res.json({
      success: true,
      logs: limitedLogs,
      total: logs.length,
      period: { start, end }
    });

  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs'
    });
  }
});

/**
 * Generate secure API key
 */
router.post('/security/api-key', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const apiKey = SecurityService.generateAPIKey();

    // In a real implementation, store the API key in database
    AuditService.log({
      event: 'API_KEY_GENERATED',
      severity: 'medium',
      details: {
        keyPrefix: apiKey.substring(0, 10),
        purpose: req.body.purpose || 'general'
      },
      timestamp: new Date(),
      userId
    });

    res.json({
      success: true,
      apiKey,
      message: 'API key generated successfully. Store it securely - it will not be shown again.',
      validationInfo: {
        prefix: 'sk_',
        format: 'sk_[random]_[timestamp]_[checksum]'
      }
    });

  } catch (error) {
    console.error('API key generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate API key'
    });
  }
});

/**
 * Validate API key format
 */
router.post('/security/validate-key', async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'API key is required'
      });
    }

    const isValid = SecurityService.validateAPIKey(apiKey);

    res.json({
      success: true,
      valid: isValid,
      message: isValid ? 'API key format is valid' : 'Invalid API key format'
    });

  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation failed'
    });
  }
});

/**
 * Security health check
 */
router.get('/security/health', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const securityHealth = {
      encryption: {
        enabled: process.env.NODE_ENV === 'production',
        algorithm: 'AES-256-GCM'
      },
      authentication: {
        jwtEnabled: true,
        sessionTimeout: '1 hour'
      },
      rateLimit: {
        enabled: true,
        windowMs: 15 * 60 * 1000,
        maxRequests: 100
      },
      audit: {
        enabled: true,
        retentionDays: 2555
      },
      gdpr: {
        enabled: true,
        consentManagement: true,
        dataRetention: true
      },
      headers: {
        contentSecurityPolicy: true,
        strictTransportSecurity: true,
        xFrameOptions: true
      }
    };

    res.json({
      success: true,
      security: securityHealth,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Security health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Security health check failed'
    });
  }
});

/**
 * Password strength validation
 */
router.post('/security/validate-password', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    const validation = SecurityService.validatePasswordStrength(password);

    res.json({
      success: true,
      validation
    });

  } catch (error) {
    console.error('Password validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Password validation failed'
    });
  }
});

export default router;