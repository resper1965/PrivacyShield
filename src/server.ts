import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import * as yauzl from 'yauzl';
import { ErrorResponse, ServerConfig } from './types/index';
import { detectPIIInFiles, PIIDetection } from './detectPII';
import { virusScanner, VirusScanner } from './virusScanner';

// Create required directories
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const TMP_DIR = path.join(process.cwd(), 'tmp');
const DETECTIONS_FILE = path.join(process.cwd(), 'detections.json');

// Ensure directories exist
fs.ensureDirSync(UPLOAD_DIR);
fs.ensureDirSync(TMP_DIR);

// Configure multer for file uploads
const upload = multer({ dest: UPLOAD_DIR });

/**
 * PIIDetector Server
 * Main server entry point with Express.js setup
 */
class PIIDetectorServer {
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
    // Root endpoint with API information
    this.app.get('/', (_req: Request, res: Response): void => {
      res.status(200).json({
        name: 'PIIDetector API',
        version: '1.0.0',
        description: 'API for detecting PII (CPF, CNPJ, Email, Phone) in ZIP files',
        endpoints: {
          health: 'GET /health',
          uploadZip: 'POST /api/zip',
          getReport: 'GET /api/report/titulares?domain=example.com&cnpj=12.345.678/0001-90'
        },
        timestamp: new Date().toISOString()
      });
    });

    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response): void => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'PIIDetector',
        version: process.env['APP_VERSION'] ?? '1.0.0',
      });
    });

    // POST /api/zip - Upload ZIP file and detect PII
    this.app.post('/api/zip', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
      try {
        if (!req.file) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'No file uploaded',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const zipPath = req.file.path;
        const extractDir = path.join(TMP_DIR, `extract_${Date.now()}`);
        
        // Create extraction directory
        await fs.ensureDir(extractDir);

        // Extract ZIP file
        const files = await this.extractZipFile(zipPath, extractDir);
        
        // Detect PII in extracted files
        const detections = detectPIIInFiles(files);
        
        // Save detections to JSON file
        await fs.writeJson(DETECTIONS_FILE, detections, { spaces: 2 });
        
        // Clean up
        await fs.remove(zipPath);
        await fs.remove(extractDir);

        res.status(200).json({
          message: 'ZIP file processed successfully',
          detectionsCount: detections.length,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error('Error processing ZIP file:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to process ZIP file',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // GET /api/report/titulares - Get filtered PII report
    this.app.get('/api/report/titulares', async (req: Request, res: Response): Promise<void> => {
      try {
        const { domain, cnpj } = req.query;
        
        // Load detections
        let detections: PIIDetection[] = [];
        if (await fs.pathExists(DETECTIONS_FILE)) {
          detections = await fs.readJson(DETECTIONS_FILE);
        }

        // Filter detections
        let filteredDetections = detections;
        
        if (domain && typeof domain === 'string') {
          filteredDetections = filteredDetections.filter(d => 
            d.documento === 'Email' && d.valor.includes(`@${domain}`)
          );
        }
        
        if (cnpj && typeof cnpj === 'string') {
          filteredDetections = filteredDetections.filter(d => 
            d.documento === 'CNPJ' && d.valor.replace(/\D/g, '') === cnpj.replace(/\D/g, '')
          );
        }

        // Group by titular
        const groupedByTitular = filteredDetections.reduce((acc, detection) => {
          const titular = detection.titular;
          if (!acc[titular]) {
            acc[titular] = [];
          }
          acc[titular].push(detection);
          return acc;
        }, {} as Record<string, PIIDetection[]>);

        res.status(200).json({
          filters: { domain, cnpj },
          totalDetections: filteredDetections.length,
          titulares: groupedByTitular,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to generate report',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
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
   * Extract ZIP file and return file contents
   */
  private async extractZipFile(zipPath: string, _extractDir: string): Promise<Array<{ content: string; filename: string }>> {
    return new Promise((resolve, reject) => {
      const files: Array<{ content: string; filename: string }> = [];
      
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        zipfile.readEntry();
        
        zipfile.on('entry', (entry) => {
          if (/\/$/.test(entry.fileName)) {
            // Directory entry
            zipfile.readEntry();
          } else {
            // File entry
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                reject(err);
                return;
              }

              const chunks: Buffer[] = [];
              readStream.on('data', (chunk) => {
                chunks.push(chunk);
              });

              readStream.on('end', () => {
                const content = Buffer.concat(chunks).toString('utf-8');
                files.push({
                  content,
                  filename: entry.fileName
                });
                zipfile.readEntry();
              });

              readStream.on('error', (err) => {
                reject(err);
              });
            });
          }
        });

        zipfile.on('end', () => {
          resolve(files);
        });

        zipfile.on('error', (err) => {
          reject(err);
        });
      });
    });
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      await new Promise<void>((resolve, reject): void => {
        const server = this.app.listen(this.port, this.host, (): void => {
          console.log(`🚀 PIIDetector server running on http://${this.host}:${this.port}`);
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
const server = new PIIDetectorServer(serverConfig);

// Start server
void server.start();

export default PIIDetectorServer;
