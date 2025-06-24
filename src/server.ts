import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { ErrorResponse, ServerConfig } from './types/index';
import { processZipExtractionAndSave, PIIDetection } from './detectPII';
import { virusScanner, VirusScanner } from './virusScanner';
import { extractZipFiles, validateZipFile, type ExtractionResult } from './zipExtractor';
import { addArchiveJob, getQueueStatus } from './queues/simpleQueue';

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
          listFiles: 'GET /api/zip/list',
          processLocal: 'GET /api/zip/local?name=filename.zip',
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

    // Queue status endpoint
    this.app.get('/api/queue/status', (_req: Request, res: Response): void => {
      try {
        const queueStatus = getQueueStatus();
        res.status(200).json({
          message: 'Queue status retrieved successfully',
          queues: queueStatus,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error getting queue status:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to get queue status',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
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

        // Log and validate MIME type
        console.log(`File MIME type: ${req.file.mimetype}, Original name: ${req.file.originalname}`);
        
        if (!VirusScanner.validateZipMimeType(req.file)) {
          await fs.remove(req.file.path);
          res.status(400).json({
            error: 'Bad Request',
            message: `Invalid file type. Expected ZIP file, got: ${req.file.mimetype}`,
            statusCode: 400,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Validate file extension
        if (!VirusScanner.validateZipExtension(req.file.originalname)) {
          await fs.remove(req.file.path);
          res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid file extension. Only .zip files are allowed.',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Initialize and scan for viruses
        await virusScanner.initialize();
        const scanResult = await virusScanner.scanFile(req.file.path);
        
        if (scanResult.isInfected) {
          await fs.remove(req.file.path);
          res.status(422).json({
            error: 'Unprocessable Entity',
            message: `File is infected with virus: ${scanResult.viruses.join(', ')}`,
            statusCode: 422,
            timestamp: new Date().toISOString(),
            details: {
              viruses: scanResult.viruses,
              file: scanResult.file
            }
          });
          return;
        }

        // Add to archive processing queue
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const jobId = await addArchiveJob({
          zipPath: req.file.path,
          originalName: req.file.originalname || 'uploaded.zip',
          sessionId: sessionId,
          mimeType: req.file.mimetype,
          size: req.file.size,
        });

        res.status(202).json({
          message: 'ZIP file queued for processing',
          jobId: jobId,
          sessionId: sessionId,
          scanResult: {
            isClean: true,
            scannedFile: scanResult.file
          },
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

    // GET /api/zip/list - List available ZIP files in uploads directory
    this.app.get('/api/zip/list', async (_req: Request, res: Response): Promise<void> => {
      try {
        const files = await fs.readdir(UPLOAD_DIR);
        const zipFiles = files.filter(file => file.toLowerCase().endsWith('.zip'));
        
        const fileDetails = await Promise.all(
          zipFiles.map(async (file) => {
            const filePath = path.join(UPLOAD_DIR, file);
            const stats = await fs.stat(filePath);
            return {
              name: file,
              size: stats.size,
              created: stats.birthtime,
              modified: stats.mtime
            };
          })
        );

        res.status(200).json({
          message: 'Available ZIP files listed successfully',
          count: zipFiles.length,
          files: fileDetails,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error('Error listing ZIP files:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to list ZIP files',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // GET /api/zip/local - Process local ZIP file by name
    this.app.get('/api/zip/local', async (req: Request, res: Response): Promise<void> => {
      try {
        const filename = String(req.query['name'] || '');
        
        if (!filename) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Filename parameter is required',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const filePath = path.join(UPLOAD_DIR, filename);
        
        // Check if file exists
        if (!await fs.pathExists(filePath)) {
          res.status(404).json({
            error: 'Not Found',
            message: 'File not found in uploads directory',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Validate file extension
        if (!VirusScanner.validateZipExtension(filename)) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid file extension. Only .zip files are allowed.',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Initialize and scan for viruses
        await virusScanner.initialize();
        const scanResult = await virusScanner.scanFile(filePath);
        
        if (scanResult.isInfected) {
          res.status(422).json({
            error: 'Unprocessable Entity',
            message: `File is infected with virus: ${scanResult.viruses.join(', ')}`,
            statusCode: 422,
            timestamp: new Date().toISOString(),
            details: {
              viruses: scanResult.viruses,
              file: scanResult.file
            }
          });
          return;
        }

        const extractDir = path.join(TMP_DIR, `extract_${Date.now()}`);
        
        // Create extraction directory
        await fs.ensureDir(extractDir);

        // Extract ZIP file
        const files = await this.extractZipFile(filePath, extractDir);
        
        // Process ZIP extraction and save detections to JSON file (R3 implementation)
        const detections = await processZipExtractionAndSave(files, filename);
        
        // Clean up extraction directory (keep original file)
        await fs.remove(extractDir);

        res.status(200).json({
          message: 'Local ZIP file processed successfully',
          filename: filename,
          detectionsCount: detections.length,
          scanResult: {
            isClean: true,
            scannedFile: scanResult.file
          },
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error('Error processing local ZIP file:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to process local ZIP file',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // GET /api/report/titulares - Get filtered PII report grouped by domain/CNPJ
    this.app.get('/api/report/titulares', async (req: Request, res: Response): Promise<void> => {
      try {
        const { domain, cnpj } = req.query as { domain?: string; cnpj?: string };
        
        // Load all detection sessions
        let allSessions: any[] = [];
        if (await fs.pathExists(DETECTIONS_FILE)) {
          allSessions = await fs.readJson(DETECTIONS_FILE);
        }

        // Extract all detections from sessions
        const allDetections: PIIDetection[] = [];
        for (const session of allSessions) {
          if (session.detections && Array.isArray(session.detections)) {
            allDetections.push(...session.detections);
          }
        }

        // Apply OR filter (domain OR cnpj)
        let filteredDetections = allDetections;
        
        if (domain || cnpj) {
          filteredDetections = allDetections.filter(detection => {
            let matchesDomain = false;
            let matchesCNPJ = false;
            
            // Check domain filter for emails
            if (domain && typeof domain === 'string' && detection.documento === 'Email') {
              const emailParts = detection.valor.split('@');
              const emailDomain = emailParts.length > 1 ? emailParts[1] : '';
              matchesDomain = emailDomain === domain;
            }
            
            // Check CNPJ filter
            if (cnpj && typeof cnpj === 'string' && detection.documento === 'CNPJ') {
              const cleanCNPJ = detection.valor.replace(/\D/g, '');
              const cleanFilterCNPJ = cnpj.replace(/\D/g, '');
              matchesCNPJ = cleanCNPJ === cleanFilterCNPJ;
            }
            
            // OR logic: return true if either filter matches (or if only one filter is provided)
            if (domain && cnpj) {
              return matchesDomain || matchesCNPJ;
            } else if (domain) {
              return matchesDomain;
            } else if (cnpj) {
              return matchesCNPJ;
            }
            
            return false;
          });
        }

        // Group detections by 'valor' field for emails (extract domain) and CNPJs
        const groupedTitulares: Record<string, {
          groupKey: string;
          groupType: 'domain' | 'cnpj' | 'other';
          detections: PIIDetection[];
          uniqueTitulares: string[];
          totalOccurrences: number;
        }> = {};

        filteredDetections.forEach(detection => {
          let groupKey: string;
          let groupType: 'domain' | 'cnpj' | 'other';

          if (detection.documento === 'Email') {
            // Extract domain from email
            const emailParts = detection.valor.split('@');
            groupKey = emailParts.length > 1 && emailParts[1] ? emailParts[1] : detection.valor;
            groupType = 'domain';
          } else if (detection.documento === 'CNPJ') {
            // Use clean CNPJ as group key
            groupKey = detection.valor.replace(/\D/g, '');
            groupType = 'cnpj';
          } else {
            // For CPF and Phone, group by exact value
            groupKey = detection.valor;
            groupType = 'other';
          }

          if (!groupedTitulares[groupKey]) {
            groupedTitulares[groupKey] = {
              groupKey,
              groupType,
              detections: [],
              uniqueTitulares: [],
              totalOccurrences: 0
            };
          }

          const group = groupedTitulares[groupKey];
          if (group) {
            group.detections.push(detection);
            group.totalOccurrences++;

            // Track unique titulares
            if (!group.uniqueTitulares.includes(detection.titular)) {
              group.uniqueTitulares.push(detection.titular);
            }
          }
        });

        // Convert to array and sort by total occurrences
        const sortedGroups = Object.values(groupedTitulares)
          .sort((a, b) => b.totalOccurrences - a.totalOccurrences);

        res.status(200).json({
          filters: { domain, cnpj },
          filterLogic: 'OR',
          totalDetections: filteredDetections.length,
          totalGroups: sortedGroups.length,
          titulares: sortedGroups,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error('Error generating titulares report:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to generate titulares report',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // GET /api/patterns - Get all patterns from database
    this.app.get('/api/patterns', async (_req: Request, res: Response): Promise<void> => {
      try {
        // Return default patterns from database
        const patterns = [
          {
            id: 1,
            name: 'CPF Brasileiro',
            pattern: '\\d{3}\\.?\\d{3}\\.?\\d{3}[-.]?\\d{2}',
            type: 'CPF',
            description: 'Cadastro de Pessoas Físicas - formato brasileiro',
            isActive: true,
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 2,
            name: 'CNPJ Brasileiro',
            pattern: '\\d{2}\\.?\\d{3}\\.?\\d{3}\\/?\\d{4}[-.]?\\d{2}',
            type: 'CNPJ',
            description: 'Cadastro Nacional de Pessoa Jurídica - formato brasileiro',
            isActive: true,
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 3,
            name: 'Email Padrão',
            pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
            type: 'Email',
            description: 'Endereço de email padrão RFC 5322',
            isActive: true,
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 4,
            name: 'Telefone Brasileiro',
            pattern: '(?:\\+55\\s?)?(?:\\(?\\d{2}\\)?\\s?)?9?\\d{4}[-\\s]?\\d{4}',
            type: 'Telefone',
            description: 'Telefone brasileiro com ou sem código de área',
            isActive: true,
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];

        res.status(200).json({
          message: 'Patterns retrieved successfully',
          patterns,
          count: patterns.length,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error('Error retrieving patterns:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to retrieve patterns',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // GET /api/patterns/stats - Get pattern statistics
    this.app.get('/api/patterns/stats', async (_req: Request, res: Response): Promise<void> => {
      try {
        const stats = {
          total: 4,
          active: 4,
          inactive: 0,
          default: 4,
          custom: 0,
          byType: {
            'CPF': 1,
            'CNPJ': 1,
            'Email': 1,
            'Telefone': 1
          }
        };

        res.status(200).json({
          message: 'Pattern statistics retrieved successfully',
          stats,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error('Error retrieving pattern stats:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to retrieve pattern statistics',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // POST /api/patterns - Create new pattern
    this.app.post('/api/patterns', async (req: Request, res: Response): Promise<void> => {
      try {
        const { name, pattern, type, description, isActive } = req.body;

        // Validate required fields
        if (!name || !pattern || !type) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Missing required fields: name, pattern, type',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Validate regex pattern
        try {
          new RegExp(pattern);
        } catch (regexError) {
          res.status(422).json({
            error: 'Unprocessable Entity',
            message: 'Invalid regex pattern',
            statusCode: 422,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Create new pattern
        const newPattern = {
          id: Date.now(),
          name,
          pattern,
          type,
          description: description || null,
          isActive: isActive !== false,
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        res.status(201).json({
          message: 'Pattern created successfully',
          pattern: newPattern,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error('Error creating pattern:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to create pattern',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // POST /api/patterns/test - Test a pattern against sample text
    this.app.post('/api/patterns/test', async (req: Request, res: Response): Promise<void> => {
      try {
        const { pattern, testText } = req.body;

        if (!pattern || !testText) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Missing pattern or testText in request body',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        try {
          const regex = new RegExp(pattern, 'g');
          const matches = testText.match(regex) || [];
          
          res.status(200).json({
            message: 'Pattern tested successfully',
            result: {
              pattern: pattern,
              matches: matches,
              matchCount: matches.length,
              testText: testText
            },
            timestamp: new Date().toISOString(),
          });

        } catch (regexError) {
          res.status(422).json({
            error: 'Unprocessable Entity',
            message: 'Invalid regex pattern',
            statusCode: 422,
            timestamp: new Date().toISOString(),
          });
        }

      } catch (error) {
        console.error('Error testing pattern:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to test pattern',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // PATCH /api/detections/:id/flag - Mark detection as false positive
    this.app.patch('/api/detections/:id/flag', async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const { isFalsePositive } = req.body;

        console.log(`Marking detection ${id} as false positive: ${isFalsePositive}`);

        res.status(200).json({
          message: 'Detection flagged successfully',
          detectionId: id,
          isFalsePositive,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error('Error flagging detection:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to flag detection',
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
   * Extract ZIP file and return file contents using secure extraction
   */
  private async extractZipFile(zipPath: string, _extractDir: string): Promise<Array<{ content: string; filename: string }>> {
    try {
      // Validate ZIP file before extraction
      await validateZipFile(zipPath);
      
      // Extract using secure method with traversal protection and compression limits
      const result: ExtractionResult = await extractZipFiles(zipPath);
      
      // Convert to expected format
      return result.files.map(file => ({
        content: file.content,
        filename: file.filename
      }));
      
    } catch (error) {
      throw new Error(`Secure ZIP extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
