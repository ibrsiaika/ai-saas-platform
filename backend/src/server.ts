import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RealTimeService } from './services/realTimeService';
import { analyticsMiddleware } from './middleware/analyticsMiddleware';
import { securityMiddleware, sanitizationMiddleware } from './middleware/securityMiddleware';
import { AuditService } from './services/auditService';
import { GDPRService } from './services/gdprService';

// Import routes
import aiRoutes from './routes/aiRoutes';
// import vectorRoutes from './routes/vectorRoutes'; // Temporarily disabled
import authRoutes from './routes/authRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import complianceRoutes from './routes/complianceRoutes';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize real-time service
RealTimeService.initialize(io);

// Initialize security and compliance services
AuditService.initialize();
GDPRService.initialize();

// Security middleware
app.use(helmet());
app.use(securityMiddleware);
app.use(sanitizationMiddleware);

// Handle private network access for development
app.use((req, res, next) => {
  // Add headers for private network access
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://192.168.1.9:3000",
      "http://192.168.1.11:3000",
      "https://192.168.1.11:3000",
      "https://localhost:3000"
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Allow in development - just log warning
      console.warn(`CORS origin not whitelisted: ${origin}, but allowing for dev`);
      callback(null, true); // Allow anyway for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Analytics tracking middleware (after logging)
app.use(analyticsMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  const realTimeStats = RealTimeService.getStats();
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    realTime: realTimeStats
  });
});

// Real-time service stats endpoint
app.get('/api/realtime/stats', (req, res) => {
  const stats = RealTimeService.getStats();
  res.json({
    success: true,
    stats,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/ai', aiRoutes);
// app.use('/api/vectors', vectorRoutes); // Temporarily disabled due to Pinecone API changes
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/user', (req, res) => res.json({ message: 'User routes coming soon' }));

// Socket.io is now handled by RealTimeService
// All Socket.io event handlers are in /services/realTimeService.ts

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler for all unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 AI SaaS Platform Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;