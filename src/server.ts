import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { ErrorResponse, ServerConfig } from './types/index';

/**
 * PrivacyDetective Server
 * Main server entry point with Express.js setup
 */
class PrivacyDetectiveServer {
  private app: Application;
  private readonly port: number;
  private readonly host: string;

  constructor(config: ServerConfig) {
    this.app = express();
    this.port = config.port;
    this.host = config.host;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Configure middleware stack
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
      credentials: true,
      optionsSuccessStatus: 200,
    }));

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req: Request, _res: Response, next: NextFunction): void => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  /**
   * Setup application routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response): void => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'PrivacyDetective',
        version: process.env['APP_VERSION'] ?? '1.0.0',
      });
    });

    // API status endpoint
    this.app.get('/api/status', (_req: Request, res: Response): void => {
      res.status(200).json({
        message: 'PrivacyDetective API is running',
        environment: process.env['NODE_ENV'] ?? 'development',
        uptime: process.uptime(),
      });
    });

    // 404 handler for undefined routes
    this.app.all('*', (_req: Request, res: Response): void => {
      const error: ErrorResponse = {
        error: 'Not Found',
        message: 'The requested resource was not found on this server',
        statusCode: 404,
        timestamp: new Date().toISOString(),
      };
      res.status(404).json(error);
    });
  }

  /**
   * Setup global error handling
   */
  private setupErrorHandling(): void {
    this.app.use((
      error: Error,
      _req: Request,
      res: Response,
      _next: NextFunction
    ): void => {
      console.error('Unhandled error:', error);

      const errorResponse: ErrorResponse = {
        error: 'Internal Server Error',
        message: process.env['NODE_ENV'] === 'development' 
          ? error.message 
          : 'An unexpected error occurred',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(errorResponse);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error): void => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown): void => {
      console.error('Unhandled Rejection:', reason);
      process.exit(1);
    });
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      await new Promise<void>((resolve, reject): void => {
        const server = this.app.listen(this.port, this.host, (): void => {
          console.log(`🚀 PrivacyDetective server running on http://${this.host}:${this.port}`);
          console.log(`📊 Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
          console.log(`⚡ Health check: http://${this.host}:${this.port}/health`);
          resolve();
        });

        server.on('error', (error: Error): void => {
          reject(error);
        });
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

/**
 * Server configuration
 */
const serverConfig: ServerConfig = {
  port: parseInt(process.env['PORT'] ?? '8000', 10),
  host: process.env['HOST'] ?? '0.0.0.0',
};

/**
 * Initialize and start the server
 */
const server = new PrivacyDetectiveServer(serverConfig);

// Start server
void server.start();

export default PrivacyDetectiveServer;
