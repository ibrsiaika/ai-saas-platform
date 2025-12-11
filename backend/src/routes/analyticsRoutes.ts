import { Router, Request, Response } from 'express';
import { AnalyticsService, AuthenticatedRequest } from '../services/analyticsService';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';
import { analyticsMiddleware, userBehaviorMiddleware } from '../middleware/analyticsMiddleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many analytics requests from this IP, please try again later.'
});

// Apply middleware
router.use(analyticsLimiter);
router.use(analyticsMiddleware);

/**
 * Get analytics dashboard data
 * GET /api/analytics/dashboard
 */
router.get('/dashboard', authMiddleware, userBehaviorMiddleware('analytics'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeRange = req.query.timeRange as '1h' | '24h' | '7d' | '30d' || '24h';
    const dashboardData = AnalyticsService.getDashboardData(timeRange);

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

/**
 * Get user-specific analytics
 * GET /api/analytics/user/:userId
 */
router.get('/user/:userId', authMiddleware, userBehaviorMiddleware('analytics'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const timeRange = req.query.timeRange as '1h' | '24h' | '7d' | '30d' || '24h';
    
    // Check if user can access this data (admin or self)
    if (req.user?.userId !== userId && req.user?.plan !== 'enterprise') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to user analytics'
      });
    }

    const userAnalytics = AnalyticsService.getUserAnalytics(userId, timeRange);

    res.json({
      success: true,
      data: userAnalytics,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user analytics',
      error: error.message
    });
  }
});

/**
 * Get my analytics (current user)
 * GET /api/analytics/me
 */
router.get('/me', authMiddleware, userBehaviorMiddleware('analytics'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const timeRange = req.query.timeRange as '1h' | '24h' | '7d' | '30d' || '24h';
    
    const userAnalytics = AnalyticsService.getUserAnalytics(userId, timeRange);

    res.json({
      success: true,
      data: userAnalytics,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your analytics',
      error: error.message
    });
  }
});

/**
 * Get real-time metrics
 * GET /api/analytics/realtime
 */
router.get('/realtime', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const dashboardData = AnalyticsService.getDashboardData('1h');
    
    res.json({
      success: true,
      data: {
        overview: dashboardData.overview,
        realTimeStats: dashboardData.realTimeStats,
        systemHealth: dashboardData.systemHealth.currentMetrics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time metrics',
      error: error.message
    });
  }
});

/**
 * Get API performance metrics
 * GET /api/analytics/performance
 */
router.get('/performance', authMiddleware, userBehaviorMiddleware('analytics'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeRange = req.query.timeRange as '1h' | '24h' | '7d' | '30d' || '24h';
    const dashboardData = AnalyticsService.getDashboardData(timeRange);

    res.json({
      success: true,
      data: {
        apiMetrics: dashboardData.apiMetrics,
        systemHealth: dashboardData.systemHealth,
        timeRange
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance metrics',
      error: error.message
    });
  }
});

/**
 * Get AI usage analytics
 * GET /api/analytics/ai-usage
 */
router.get('/ai-usage', authMiddleware, userBehaviorMiddleware('analytics'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeRange = req.query.timeRange as '1h' | '24h' | '7d' | '30d' || '24h';
    const dashboardData = AnalyticsService.getDashboardData(timeRange);

    res.json({
      success: true,
      data: {
        aiMetrics: dashboardData.aiMetrics,
        timeRange
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI usage analytics',
      error: error.message
    });
  }
});

/**
 * Get user behavior analytics
 * GET /api/analytics/behavior
 */
router.get('/behavior', authMiddleware, userBehaviorMiddleware('analytics'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeRange = req.query.timeRange as '1h' | '24h' | '7d' | '30d' || '24h';
    const dashboardData = AnalyticsService.getDashboardData(timeRange);

    res.json({
      success: true,
      data: {
        userBehavior: dashboardData.userBehavior,
        timeRange
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user behavior analytics',
      error: error.message
    });
  }
});

/**
 * Track custom event
 * POST /api/analytics/track
 */
router.post('/track', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { eventType, eventName, metadata } = req.body;

    if (!eventType || !eventName) {
      return res.status(400).json({
        success: false,
        message: 'eventType and eventName are required'
      });
    }

    AnalyticsService.trackEvent({
      eventType,
      eventName,
      userId: req.user!.userId,
      metadata: metadata || {},
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Event tracked successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to track event',
      error: error.message
    });
  }
});

/**
 * Track user behavior event
 * POST /api/analytics/behavior/track
 */
router.post('/behavior/track', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, feature, duration, metadata } = req.body;

    if (!action || !feature) {
      return res.status(400).json({
        success: false,
        message: 'action and feature are required'
      });
    }

    AnalyticsService.trackUserBehavior({
      userId: req.user!.userId,
      action,
      feature,
      duration,
      metadata: metadata || {},
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'User behavior tracked successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to track user behavior',
      error: error.message
    });
  }
});

/**
 * Export analytics data
 * GET /api/analytics/export
 */
router.get('/export', authMiddleware, userBehaviorMiddleware('analytics'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeRange = req.query.timeRange as '1h' | '24h' | '7d' | '30d' || '24h';
    const format = req.query.format as 'json' | 'csv' || 'json';
    
    // Only allow export for enterprise users
    if (req.user?.plan !== 'enterprise') {
      return res.status(403).json({
        success: false,
        message: 'Analytics export is only available for enterprise users'
      });
    }

    const dashboardData = AnalyticsService.getDashboardData(timeRange);

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(dashboardData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvData);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        success: true,
        data: dashboardData,
        exportTimestamp: new Date().toISOString(),
        timeRange
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data',
      error: error.message
    });
  }
});

/**
 * Health check for analytics service
 * GET /api/analytics/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'analytics',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Helper function to convert data to CSV
function convertToCSV(data: any): string {
  const headers = ['timestamp', 'metric', 'value', 'category'];
  const rows = [headers.join(',')];

  // Convert overview metrics
  Object.entries(data.overview).forEach(([key, value]) => {
    rows.push([new Date().toISOString(), key, value, 'overview'].join(','));
  });

  // Convert API metrics
  Object.entries(data.apiMetrics).forEach(([key, value]) => {
    if (typeof value === 'number') {
      rows.push([new Date().toISOString(), key, value, 'api'].join(','));
    }
  });

  // Convert AI metrics
  Object.entries(data.aiMetrics).forEach(([key, value]) => {
    if (typeof value === 'number') {
      rows.push([new Date().toISOString(), key, value, 'ai'].join(','));
    }
  });

  return rows.join('\n');
}

export default router;