/**
 * PIIDetector Server Application
 * Modern Express.js server with modular architecture
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';

// Services and Config
import { env } from './config/env';
import { logger } from './utils/logger';
import { getArchiveQueueStatus, getFileQueueStatus, checkRedisHealth } from './services/queue';

// Routes
import archivesRouter from './routes/archives';
import reportsRouter from './routes/reports';
import patternsRouter from './routes/patterns';

// Workers are conditionally loaded based on Redis availability

interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

export class PIIDetectorApp {
  private app: Application;
  private server!: Server;
  private io!: SocketIOServer;
  private prisma: PrismaClient;

  constructor() {
    this.app = express();
    this.prisma = new PrismaClient();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction): void => {
      logger.info(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', async (_req: Request, res: Response): Promise<void> => {
      try {
        // Check database connection
        await this.prisma.$queryRaw`SELECT 1`;
        
        // Check Redis connection
        const redisHealthy = await checkRedisHealth();
        
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: 'connected',
            redis: redisHealthy ? 'connected' : 'disconnected',
          },
          environment: env.NODE_ENV,
          version: '2.0.0',
        };

        res.status(200).json(health);
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Service unavailable',
        });
      }
    });

    // Queue status endpoint
    this.app.get('/api/queue/status', async (_req: Request, res: Response): Promise<void> => {
      try {
        const [archiveStatus, fileStatus] = await Promise.all([
          getArchiveQueueStatus(),
          getFileQueueStatus(),
        ]);

        res.status(200).json({
          timestamp: new Date().toISOString(),
          queues: {
            archive: archiveStatus,
            file: fileStatus,
          },
        });
      } catch (error) {
        logger.error('Queue status error:', error);
        res.status(500).json({
          error: 'Failed to get queue status',
          timestamp: new Date().toISOString(),
        });
      }
    });

    // API routes
    this.app.use('/api/v1/archives', archivesRouter);
    this.app.use('/api/v1/reports', reportsRouter);
    this.app.use('/api/v1/patterns', patternsRouter);

    // Root endpoint
    this.app.get('/', (_req: Request, res: Response): void => {
      res.status(200).json({
        name: 'PIIDetector API',
        version: '2.0.0',
        description: 'Advanced PII detection with AI validation',
        endpoints: {
          health: '/health',
          queues: '/api/queue/status',
          archives: '/api/v1/archives',
          reports: '/api/v1/reports',
          patterns: '/api/v1/patterns',
        },
        timestamp: new Date().toISOString(),
      });
    });

    // 404 handler
    this.app.all('*', (req: Request, res: Response): void => {
      const error: ErrorResponse = {
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        statusCode: 404,
        timestamp: new Date().toISOString(),
      };
      res.status(404).json(error);
    });
  }

  private setupWebSocket(): void {
    this.server = new Server(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: env.CORS_ORIGINS,
        methods: ['GET', 'POST'],
      },
      path: '/socket.io',
    });

    this.io.on('connection', (socket) => {
      logger.info(`WebSocket client connected: ${socket.id}`);

      socket.on('join-session', (sessionId: string) => {
        socket.join(`session-${sessionId}`);
        logger.debug(`Client ${socket.id} joined session ${sessionId}`);
      });

      socket.on('disconnect', () => {
        logger.debug(`WebSocket client disconnected: ${socket.id}`);
      });
    });

    // Export io for use in workers (type assertion needed)
    (global as any).io = this.io;
  }

  private setupErrorHandling(): void {
    this.app.use((
      error: Error,
      _req: Request,
      res: Response,
      _next: NextFunction
    ): void => {
      logger.error('Unhandled error:', error);

      const errorResponse: ErrorResponse = {
        error: 'Internal Server Error',
        message: env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(errorResponse);
    });

    process.on('uncaughtException', (error: Error): void => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>): void => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await this.prisma.$connect();
      logger.info('Database connected successfully');

      // Setup WebSocket before starting server
      this.setupWebSocket();

      // Start server
      this.server.listen(env.PORT, env.HOST, () => {
        logger.info(`🚀 PIIDetector server running on http://${env.HOST}:${env.PORT}`);
        logger.info(`📊 Environment: ${env.NODE_ENV}`);
        logger.info(`⚡ Health check: http://${env.HOST}:${env.PORT}/health`);
        logger.info(`🔍 WebSocket: http://${env.HOST}:${env.PORT}/socket.io`);
      });

      this.server.on('error', (error: Error): void => {
        logger.error('Server error:', error);
        process.exit(1);
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    logger.info('Shutting down server...');
    
    await this.prisma.$disconnect();
    this.server.close();
    
    logger.info('Server shutdown complete');
  }
}

export default PIIDetectorApp;