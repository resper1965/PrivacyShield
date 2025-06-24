/**
 * Simplified PIIDetector Server
 * Working server implementation with fallback capabilities
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import * as fs from 'fs-extra';


// Import services
import { env } from './config/env';
import { detectPIIInText } from './services/processor';
import { extractZipFiles } from './services/zipService';

const app: Application = express();
const prisma = new PrismaClient();

// Ensure directories exist
fs.ensureDirSync(env.UPLOAD_DIR);
fs.ensureDirSync(env.TMP_DIR);

// Configure multer for file uploads
const upload = multer({
  dest: env.UPLOAD_DIR,
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const isZip = file.mimetype === 'application/zip' || 
                  file.originalname.toLowerCase().endsWith('.zip');
    cb(null, isZip);
  },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req: Request, _res: Response, next: NextFunction): void => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check
app.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: { database: 'connected' },
      environment: env.NODE_ENV,
      version: '2.0.0',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
    });
  }
});

// Queue status (simplified)
app.get('/api/queue/status', (_req: Request, res: Response): void => {
  res.status(200).json({
    timestamp: new Date().toISOString(),
    queues: {
      archive: { waiting: 0, active: 0, completed: 0, failed: 0 },
      file: { waiting: 0, active: 0, completed: 0, failed: 0 },
    },
  });
});

// Upload endpoint (simplified processing)
app.post('/api/v1/archives/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
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

    const { originalname, path: filePath, mimetype, size } = req.file;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Extract ZIP file
      const extractionResult = await extractZipFiles(filePath);
      
      // Process files and detect PII
      let totalDetections = 0;
      for (const extractedFile of extractionResult.files) {
        const detections = detectPIIInText(extractedFile.content, extractedFile.filename, originalname);
        totalDetections += detections.length;
        
        // Save to database if there are detections
        if (detections.length > 0) {
          // Create file record
          const fileRecord = await prisma.file.create({
            data: {
              filename: extractedFile.filename,
              originalName: originalname,
              zipSource: originalname,
              mimeType: mimetype,
              size,
              sessionId,
              totalFiles: extractionResult.totalFiles,
            },
          });

          // Create detection records
          await prisma.detection.createMany({
            data: detections.map(detection => ({
              titular: detection.titular,
              documento: detection.documento,
              valor: detection.valor,
              arquivo: detection.arquivo,
              fileId: fileRecord.id,
            }))
          });
        }
      }

      // Clean up uploaded file
      await fs.remove(filePath);

      res.status(200).json({
        message: 'ZIP file processed successfully',
        sessionId,
        results: {
          totalFiles: extractionResult.totalFiles,
          totalDetections,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (processingError) {
      // Clean up on error
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
      }
      
      res.status(422).json({
        error: 'Processing Failed',
        message: 'Failed to process ZIP file',
        statusCode: 422,
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    
    if (req.file?.path && await fs.pathExists(req.file.path)) {
      await fs.remove(req.file.path);
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process file upload',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
});

// Detections endpoint
app.get('/api/v1/reports/detections', async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const detections = await prisma.detection.findMany({
      take: Number(limit),
      skip: Number(offset),
      include: { file: true },
      orderBy: { timestamp: 'desc' },
    });

    res.status(200).json({
      detections,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Detections query error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve detections',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
});

// Root endpoint
app.get('/', (_req: Request, res: Response): void => {
  res.status(200).json({
    name: 'PIIDetector API',
    version: '2.0.0',
    description: 'PII detection with simplified processing',
    endpoints: {
      health: '/health',
      upload: '/api/v1/archives/upload',
      detections: '/api/v1/reports/detections',
    },
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.all('*', (_req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Route not found',
    statusCode: 404,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((error: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
    statusCode: 500,
    timestamp: new Date().toISOString(),
  });
});

// Start server
async function startServer(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');

    app.listen(env.PORT, env.HOST, () => {
      console.log(`🚀 PIIDetector server running on http://${env.HOST}:${env.PORT}`);
      console.log(`📊 Environment: ${env.NODE_ENV}`);
      console.log(`⚡ Health check: http://${env.HOST}:${env.PORT}/health`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();