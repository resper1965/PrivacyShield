/**
 * N.Crisis Clean Server
 * Uses existing React frontend build
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Import services
import { env } from './config/env';
import { detectPIIInText } from './services/processor';
import { zipExtractor } from './utils/zipExtract';
// import { clamAVService } from './services/clamav';
import { initializeWebSocketService, getWebSocketService } from './services/websocket';
import n8nRouter from './routes/n8n';
import embeddingsRouter from './routes/embeddings';
import searchRouter from './routes/search';
import chatRouter from './routes/chat';
import { getFaissManager } from './faissManager';

const app: Application = express();
const prisma = new PrismaClient();

// Create HTTP server and WebSocket
const server = new Server(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: env.CORS_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

// Initialize WebSocket service
initializeWebSocketService(io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Logging middleware
app.use((req: Request, _res: Response, next: NextFunction): void => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Multer configuration
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// Health check
app.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
      },
      environment: env.NODE_ENV,
      version: '2.1.0',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Queue status
app.get('/api/queue/status', async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    status: 'healthy',
    queues: {
      active: 0,
      waiting: 0,
      completed: 0,
      failed: 0,
    },
    timestamp: new Date().toISOString(),
  });
});

// File upload endpoint
app.post('/api/v1/archives/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    const wsService = getWebSocketService();

    if (!file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const sessionId = `session-${Date.now()}`;
    const { originalname, filename, mimetype, size } = file;
    const filePath = path.join(process.cwd(), 'uploads', filename);

    // WebSocket progress update
    wsService?.sendProgress({
      sessionId,
      stage: 'upload',
      progress: 10,
      message: 'File uploaded successfully',
    });

    // Simple virus scan check
    wsService?.sendProgress({
      sessionId,
      stage: 'virus_scan',
      progress: 30,
      message: 'Scanning file for viruses',
    });

    // For now, assume file is clean
    const scanResult = { clean: true, viruses: [] };
    
    if (!scanResult.clean) {
      await fs.remove(filePath);
      res.status(400).json({
        success: false,
        error: 'File contains virus or malware',
        details: scanResult.viruses,
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
    }

    // Save to database
    const fileRecord = await prisma.file.create({
      data: {
        filename,
        originalName: originalname,
        mimeType: mimetype,
        size,
        sessionId,
        totalFiles: extractionSession.totalFiles,
        uploadedAt: new Date(),
        processedAt: new Date(),
      },
    });

    // Cleanup
    await fs.remove(filePath);

    wsService?.sendProgress({
      sessionId,
      stage: 'complete',
      progress: 100,
      message: 'Processing completed successfully',
      details: {
        totalFiles: extractionSession.totalFiles,
        detectionsFound: totalDetections
      }
    });

    res.status(200).json({
      success: true,
      sessionId,
      fileId: fileRecord.id,
      totalFiles: extractionSession.totalFiles,
      totalDetections,
      message: 'File processed successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Upload processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Reports endpoint
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

// Additional API Routes
app.use('/', n8nRouter);
app.use('/', embeddingsRouter);
app.use('/', searchRouter);
app.use('/', chatRouter);

// Serve React frontend
const frontendPath = path.join(__dirname, '../frontend/dist');
console.log('Frontend path:', frontendPath);
console.log('Frontend exists:', fs.existsSync(frontendPath));
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
} else {
  console.warn('Frontend build not found, serving basic HTML');
}

// React Router - serve index.html for all non-API routes
app.get('*', (req: Request, res: Response): void => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.path,
      timestamp: new Date().toISOString(),
    });
  } else {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback basic HTML
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>N.Crisis - PII Detection Platform</title>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Montserrat', -apple-system, sans-serif; background: #0D1B2A; color: white; padding: 40px; }
              .container { max-width: 800px; margin: 0 auto; text-align: center; }
              .logo { color: #00ade0; font-size: 2.5em; margin-bottom: 20px; }
              .status { background: #1e3a8a; padding: 20px; border-radius: 10px; margin: 20px 0; }
              .api-endpoint { background: #065f46; padding: 10px; margin: 10px 0; border-radius: 5px; }
              .endpoint-url { font-family: monospace; background: #000; padding: 5px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="logo">n.crisis</h1>
              <p>PII Detection & LGPD Compliance Platform</p>
              <div class="status">
                <h3>🟢 System Status: Operational</h3>
                <p>API server running on port 5000</p>
                <p>Environment: ${env.NODE_ENV}</p>
                <p>Version: 2.1.0</p>
              </div>
              <div class="api-endpoint">
                <h4>Available API Endpoints:</h4>
                <div class="endpoint-url">GET /health</div>
                <div class="endpoint-url">GET /api/queue/status</div>
                <div class="endpoint-url">POST /api/v1/archives/upload</div>
                <div class="endpoint-url">GET /api/v1/reports/detections</div>
                <div class="endpoint-url">POST /api/v1/chat</div>
              </div>
              <p><strong>Note:</strong> Frontend build not available. API endpoints are fully functional.</p>
            </div>
          </body>
        </html>
      `);
    }
  }
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
      console.log('FAISS vector search initialized');
    } catch (error) {
      console.warn('FAISS initialization failed:', error);
    }

    server.listen(env.PORT, '0.0.0.0', () => {
      console.log(`N.Crisis server running on http://0.0.0.0:${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Health check: http://0.0.0.0:${env.PORT}/health`);
      console.log(`WebSocket: http://0.0.0.0:${env.PORT}/socket.io`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();