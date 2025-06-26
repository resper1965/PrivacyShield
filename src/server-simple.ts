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
import * as path from 'path';

// Import services
import { env } from './config/env';
import { detectPIIInText } from './services/processor';
import { zipExtractor } from './utils/zipExtract';
import { clamAVService } from './services/clamav';
import { initializeWebSocketService, getWebSocketService } from './services/websocket';
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import n8nRouter from './routes/n8n';
import embeddingsRouter from './routes/embeddings';
import searchRouter from './routes/search';
import chatRouter from './routes/chat';
import { getFaissManager } from './faissManager';

const app: Application = express();
const server = new Server(app);
const io = new SocketIOServer(server, {
  cors: { origin: env.CORS_ORIGINS },
  path: '/socket.io'
});
const prisma = new PrismaClient();

// Initialize WebSocket service
initializeWebSocketService(io);

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

// Upload endpoint with WebSocket progress and ClamAV scanning
app.post('/api/v1/archives/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const wsService = getWebSocketService();
  
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
    
    // Send initial progress
    wsService?.sendProgress({
      sessionId,
      stage: 'upload',
      progress: 10,
      message: 'File uploaded, starting virus scan',
      details: { totalBytes: size }
    });

    // Virus scan (optional)
    wsService?.sendProgress({
      sessionId,
      stage: 'virus_scan',
      progress: 20,
      message: 'Scanning for viruses',
    });

    const scanResult = await clamAVService.scanFile(filePath);
    
    if (scanResult.isInfected) {
      await fs.remove(filePath);
      
      wsService?.sendError(sessionId, 'File contains threats', {
        threats: scanResult.viruses,
        scanner: 'clamav'
      });
      
      res.status(422).json({
        error: 'Malicious File Detected',
        message: 'File contains threats and cannot be processed',
        threats: scanResult.viruses,
        statusCode: 422,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // ZIP extraction
    wsService?.sendProgress({
      sessionId,
      stage: 'extraction',
      progress: 40,
      message: 'Extracting ZIP file',
    });

    const extractionSession = await zipExtractor.extractToSession(filePath);
    
    wsService?.sendProgress({
      sessionId,
      stage: 'processing',
      progress: 60,
      message: 'Processing files for PII detection',
      details: {
        totalFiles: extractionSession.totalFiles,
        totalBytes: extractionSession.totalSize
      }
    });

    // Process files and detect PII
    let totalDetections = 0;
    let filesProcessed = 0;
    
    for (const extractedFile of extractionSession.files) {
      const detections = detectPIIInText(extractedFile.content, extractedFile.path, originalname);
      totalDetections += detections.length;
      filesProcessed++;
      
      // Update progress
      const progress = 60 + (filesProcessed / extractionSession.totalFiles) * 30;
      wsService?.sendProgress({
        sessionId,
        stage: 'processing',
        progress: Math.round(progress),
        message: `Processing file ${filesProcessed}/${extractionSession.totalFiles}`,
        details: {
          filesProcessed,
          totalFiles: extractionSession.totalFiles,
          currentFile: extractedFile.path,
          detectionsFound: totalDetections
        }
      });
      
      // Save to database if there are detections
      if (detections.length > 0) {
        // Save detections to database
        for (const detection of detections) {
          await prisma.detection.create({
            data: {
              titular: detection.titular,
              documento: detection.documento,
              valor: detection.valor,
              arquivo: detection.arquivo,
              context: detection.context,
              position: detection.position,
              riskLevel: detection.riskLevel,
              file: {
                create: {
                  filename: extractedFile.path,
                  originalName: originalname,
                  zipSource: originalname,
                  mimeType: 'text/plain',
                  size: extractedFile.content.length,
                  sessionId: sessionId,
                  totalFiles: extractionSession.totalFiles
                }
              }
            }
          });
        }
      }
    }

    // Cleanup
    await fs.remove(filePath);
    await zipExtractor.cleanupSession(extractionSession.sessionId);

    // Send completion
    wsService?.sendProgress({
      sessionId,
      stage: 'complete',
      progress: 100,
      message: 'Processing completed successfully',
      details: {
        totalFiles: extractionSession.totalFiles,
        totalDetections,
        processingTime: Date.now() - Date.now() // Placeholder
      }
    });

    res.status(200).json({
      success: true,
      sessionId,
      totalFiles: extractionSession.totalFiles,
      totalDetections,
      message: 'File processed successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Upload processing error:', error);
    
    wsService?.sendError(sessionId, 'Processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process uploaded file',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
});

// API Routes
app.use('/api/v1/n8n', n8nRouter);
app.use('/api/v1/embeddings', embeddingsRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/chat', chatRouter);

// Reports endpoint
app.get('/api/v1/reports/detections', async (_req: Request, res: Response): Promise<void> => {
  try {
    const detections = await prisma.detection.findMany({
      include: {
        file: true
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 100
    });

    res.status(200).json({
      success: true,
      detections: detections.map(d => ({
        titular: d.titular,
        documento: d.documento,
        valor: d.valor,
        arquivo: d.arquivo,
        timestamp: d.timestamp,
        context: d.context,
        riskLevel: d.riskLevel
      })),
      total: detections.length,
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

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API info endpoint
app.get('/', (_req: Request, res: Response): void => {
  res.status(200).json({
    name: 'PrivacyShield API',
    version: '2.0.0',
    description: 'PII Detection and LGPD Compliance Platform',
    endpoints: {
      health: '/health',
      upload: '/api/v1/archives/upload',
      detections: '/api/v1/reports/detections',
      search: '/api/v1/search',
      chat: '/api/v1/chat',
      embeddings: '/api/v1/embeddings',
      n8n: '/api/v1/n8n'
    },
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for API routes
app.all('/api/*', (_req: Request, res: Response): void => {
  res.status(404).json({
    error: 'API endpoint not found',
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
    
    // Initialize FAISS manager
    try {
      const faissManager = getFaissManager();
      await faissManager.init();
      console.log('🔍 FAISS vector search initialized');
    } catch (error) {
      console.warn('⚠️ FAISS initialization failed:', error);
    }

    server.listen(env.PORT, env.HOST, () => {
      console.log(`🚀 PrivacyShield server running on http://${env.HOST}:${env.PORT}`);
      console.log(`📊 Environment: ${env.NODE_ENV}`);
      console.log(`⚡ Health check: http://${env.HOST}:${env.PORT}/health`);
      console.log(`🔌 WebSocket: http://${env.HOST}:${env.PORT}/socket.io`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();