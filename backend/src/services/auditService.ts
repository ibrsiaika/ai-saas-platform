import fs from 'fs';
import path from 'path';
import { SecurityService } from './securityService';

export interface AuditLogEntry {
  id?: string;
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
}

export interface ComplianceReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEvents: number;
    securityIncidents: number;
    dataAccess: number;
    userActions: number;
    systemEvents: number;
  };
  compliance: {
    gdprCompliant: boolean;
    dataRetentionPolicy: boolean;
    auditTrailIntegrity: boolean;
    accessControlCompliance: boolean;
  };
  recommendations: string[];
}

/**
 * Audit Service for compliance and security logging
 */
export class AuditService {
  private static readonly LOG_DIRECTORY = path.join(process.cwd(), 'logs', 'audit');
  private static readonly MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly RETENTION_DAYS = 2555; // ~7 years for compliance
  private static readonly ENCRYPTION_ENABLED = process.env.NODE_ENV === 'production';

  private static logBuffer: AuditLogEntry[] = [];
  private static bufferFlushInterval: NodeJS.Timeout;

  /**
   * Initialize audit service
   */
  static initialize() {
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.LOG_DIRECTORY)) {
      fs.mkdirSync(this.LOG_DIRECTORY, { recursive: true });
    }

    // Start buffer flush interval (every 30 seconds)
    this.bufferFlushInterval = setInterval(() => {
      this.flushBuffer();
    }, 30000);

    // Log service initialization
    this.log({
      event: 'AUDIT_SERVICE_INITIALIZED',
      severity: 'low',
      details: {
        encryption: this.ENCRYPTION_ENABLED,
        retentionDays: this.RETENTION_DAYS,
        logDirectory: this.LOG_DIRECTORY
      },
      timestamp: new Date()
    });

    // Start cleanup job (daily)
    setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Log an audit event
   */
  static log(entry: AuditLogEntry): void {
    try {
      // Generate unique ID
      entry.id = SecurityService.generateSecureToken(16);
      
      // Ensure timestamp
      if (!entry.timestamp) {
        entry.timestamp = new Date();
      }

      // Sanitize sensitive data in details
      entry.details = SecurityService.maskSensitiveData(entry.details);

      // Add to buffer
      this.logBuffer.push(entry);

      // Flush immediately for critical events
      if (entry.severity === 'critical') {
        this.flushBuffer();
      }

      // Console log for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUDIT ${entry.severity.toUpperCase()}] ${entry.event}:`, entry.details);
      }
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  /**
   * Log user authentication events
   */
  static logAuth(event: 'LOGIN' | 'LOGOUT' | 'REGISTER' | 'PASSWORD_CHANGE' | 'TOKEN_REFRESH', userId: string, details: Record<string, any> = {}) {
    this.log({
      event: `AUTH_${event}`,
      severity: event === 'LOGIN' ? 'low' : 'medium',
      details: {
        ...details,
        action: event.toLowerCase()
      },
      timestamp: new Date(),
      userId
    });
  }

  /**
   * Log data access events (GDPR compliance)
   */
  static logDataAccess(userId: string, dataType: string, action: 'READ' | 'write' | 'delete', details: Record<string, any> = {}) {
    this.log({
      event: 'DATA_ACCESS',
      severity: action === 'delete' ? 'medium' : 'low',
      details: {
        dataType,
        action,
        ...details
      },
      timestamp: new Date(),
      userId
    });
  }

  /**
   * Log API usage for compliance tracking
   */
  static logAPIUsage(endpoint: string, method: string, userId?: string, details: Record<string, any> = {}) {
    this.log({
      event: 'API_USAGE',
      severity: 'low',
      details: {
        endpoint,
        method,
        ...details
      },
      timestamp: new Date(),
      userId
    });
  }

  /**
   * Log AI model usage for compliance
   */
  static logAIUsage(model: string, tokens: number, userId?: string, details: Record<string, any> = {}) {
    this.log({
      event: 'AI_MODEL_USAGE',
      severity: 'low',
      details: {
        model,
        tokens,
        cost: this.calculateCost(model, tokens),
        ...details
      },
      timestamp: new Date(),
      userId
    });
  }

  /**
   * Log security incidents
   */
  static logSecurityIncident(type: string, severity: 'low' | 'medium' | 'high' | 'critical', details: Record<string, any>) {
    this.log({
      event: 'SECURITY_INCIDENT',
      severity,
      details: {
        incidentType: type,
        ...details
      },
      timestamp: new Date()
    });
  }

  /**
   * Log system events
   */
  static logSystemEvent(event: string, details: Record<string, any> = {}) {
    this.log({
      event: `SYSTEM_${event}`,
      severity: 'low',
      details,
      timestamp: new Date()
    });
  }

  /**
   * Flush buffer to file
   */
  private static flushBuffer(): void {
    if (this.logBuffer.length === 0) return;

    let entries: AuditLogEntry[] = [];
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const filename = `audit_${today}.log`;
      const filepath = path.join(this.LOG_DIRECTORY, filename);

      // Prepare log entries
      entries = this.logBuffer.splice(0); // Clear buffer
      const logData = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';

      // Encrypt in production
      const finalData = this.ENCRYPTION_ENABLED ? 
        SecurityService.encrypt(logData) : logData;

      // Append to file
      fs.appendFileSync(filepath, finalData, 'utf8');

      // Check file size and rotate if necessary
      this.rotateLogIfNeeded(filepath);

    } catch (error) {
      console.error('Failed to flush audit buffer:', error);
      // Put entries back in buffer on error
      if (entries.length > 0) {
        this.logBuffer.unshift(...entries);
      }
    }
  }

  /**
   * Rotate log file if it exceeds size limit
   */
  private static rotateLogIfNeeded(filepath: string): void {
    try {
      const stats = fs.statSync(filepath);
      if (stats.size > this.MAX_LOG_SIZE) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = filepath.replace('.log', `_${timestamp}.log`);
        fs.renameSync(filepath, rotatedPath);
      }
    } catch (error) {
      console.error('Log rotation failed:', error);
    }
  }

  /**
   * Clean up old log files based on retention policy
   */
  private static cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.LOG_DIRECTORY);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

      for (const file of files) {
        if (file.startsWith('audit_') && file.endsWith('.log')) {
          const filepath = path.join(this.LOG_DIRECTORY, file);
          const stats = fs.statSync(filepath);
          
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filepath);
            console.log(`Deleted old audit log: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Log cleanup failed:', error);
    }
  }

  /**
   * Query audit logs for compliance reporting
   */
  static async queryLogs(
    startDate: Date, 
    endDate: Date, 
    filters: {
      event?: string;
      severity?: string;
      userId?: string;
    } = {}
  ): Promise<AuditLogEntry[]> {
    try {
      const results: AuditLogEntry[] = [];
      const files = fs.readdirSync(this.LOG_DIRECTORY);

      for (const file of files) {
        if (file.startsWith('audit_') && file.endsWith('.log')) {
          const filepath = path.join(this.LOG_DIRECTORY, file);
          let content = fs.readFileSync(filepath, 'utf8');

          // Decrypt if encrypted
          if (this.ENCRYPTION_ENABLED && content.includes(':')) {
            try {
              content = SecurityService.decrypt(content);
            } catch {
              // Skip corrupted/non-encrypted files
              continue;
            }
          }

          const lines = content.trim().split('\n');
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              const entry: AuditLogEntry = JSON.parse(line);
              const entryDate = new Date(entry.timestamp);

              // Date filter
              if (entryDate >= startDate && entryDate <= endDate) {
                // Apply other filters
                if (filters.event && entry.event !== filters.event) continue;
                if (filters.severity && entry.severity !== filters.severity) continue;
                if (filters.userId && entry.userId !== filters.userId) continue;

                results.push(entry);
              }
            } catch {
              // Skip malformed lines
              continue;
            }
          }
        }
      }

      return results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('Audit log query failed:', error);
      return [];
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(startDate: Date, endDate: Date): Promise<ComplianceReport> {
    try {
      const logs = await this.queryLogs(startDate, endDate);
      
      const summary = {
        totalEvents: logs.length,
        securityIncidents: logs.filter(l => l.event.includes('SECURITY')).length,
        dataAccess: logs.filter(l => l.event === 'DATA_ACCESS').length,
        userActions: logs.filter(l => l.event.startsWith('AUTH_')).length,
        systemEvents: logs.filter(l => l.event.startsWith('SYSTEM_')).length
      };

      const recommendations: string[] = [];
      
      // Check for security incidents
      if (summary.securityIncidents > 10) {
        recommendations.push('High number of security incidents detected. Review security policies.');
      }

      // Check for failed logins
      const failedLogins = logs.filter(l => l.event === 'AUTH_LOGIN' && l.details.success === false).length;
      if (failedLogins > 50) {
        recommendations.push('High number of failed login attempts. Consider implementing additional security measures.');
      }

      // Check data access patterns
      const dataDeletes = logs.filter(l => l.event === 'DATA_ACCESS' && l.details.action === 'delete').length;
      if (dataDeletes > summary.dataAccess * 0.1) {
        recommendations.push('High rate of data deletions detected. Verify data retention compliance.');
      }

      return {
        period: { start: startDate, end: endDate },
        summary,
        compliance: {
          gdprCompliant: this.checkGDPRCompliance(logs),
          dataRetentionPolicy: true, // Based on configured retention
          auditTrailIntegrity: this.checkAuditIntegrity(logs),
          accessControlCompliance: this.checkAccessControl(logs)
        },
        recommendations
      };
    } catch (error) {
      console.error('Compliance report generation failed:', error);
      throw error;
    }
  }

  /**
   * Check GDPR compliance
   */
  private static checkGDPRCompliance(logs: AuditLogEntry[]): boolean {
    // Check if data access is properly logged
    const dataAccessLogs = logs.filter(l => l.event === 'DATA_ACCESS');
    const totalDataOperations = logs.filter(l => 
      l.event.includes('USER') || l.event.includes('DATA')
    ).length;

    // Should have audit logs for at least 80% of data operations
    return dataAccessLogs.length >= totalDataOperations * 0.8;
  }

  /**
   * Check audit trail integrity
   */
  private static checkAuditIntegrity(logs: AuditLogEntry[]): boolean {
    // Check for sequential timestamps and proper log structure
    for (let i = 1; i < logs.length; i++) {
      const current = new Date(logs[i].timestamp);
      const previous = new Date(logs[i-1].timestamp);
      
      // Allow some clock skew (1 hour)
      if (current.getTime() < previous.getTime() - 3600000) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check access control compliance
   */
  private static checkAccessControl(logs: AuditLogEntry[]): boolean {
    const authEvents = logs.filter(l => l.event.startsWith('AUTH_'));
    const securityEvents = logs.filter(l => l.event.includes('SECURITY'));

    // Should have proper authentication logging
    return authEvents.length > 0 && securityEvents.length < authEvents.length * 0.1;
  }

  /**
   * Calculate AI usage cost (simplified)
   */
  private static calculateCost(model: string, tokens: number): number {
    const rates: { [key: string]: number } = {
      'gpt-4': 0.03 / 1000,
      'gpt-3.5-turbo': 0.002 / 1000,
      'text-embedding-ada-002': 0.0001 / 1000
    };

    return (rates[model] || 0.01 / 1000) * tokens;
  }

  /**
   * Cleanup on service shutdown
   */
  static shutdown(): void {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }
    this.flushBuffer();
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => AuditService.shutdown());
process.on('SIGINT', () => AuditService.shutdown());