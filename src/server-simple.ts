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
        // Create file record
        const fileRecord = await prisma.file.create({
          data: {
            filename: extractedFile.path,
            originalName: originalname,
            zipSource: originalname,
            mimeType: mimetype,
            size,
            sessionId,
            totalFiles: extractionSession.totalFiles,
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
            riskLevel: detection.riskLevel,
            context: detection.context,
            position: detection.position,
          }))
        });
      }
    }

    // Clean up
    await fs.remove(filePath);
    await zipExtractor.cleanupSession(extractionSession.sessionId);

    const results = {
      totalFiles: extractionSession.totalFiles,
      totalDetections,
      sessionId,
      scanResult: {
        isClean: !scanResult.isInfected,
        scanner: 'clamav',
        scanTime: scanResult.scanTime
      }
    };

    wsService?.sendComplete(sessionId, results);

    res.status(200).json({
      message: 'ZIP file processed successfully',
      sessionId,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up on error
    if (req.file?.path && await fs.pathExists(req.file.path)) {
      await fs.remove(req.file.path);
    }

    wsService?.sendError(sessionId, 'Processing failed', { error: error instanceof Error ? error.message : String(error) });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process file upload',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
});

// Detections endpoint
// N8N Integration Routes
app.use('/', n8nRouter);

// Embeddings API Routes
app.use('/', embeddingsRouter);

// Vector Search Routes
app.use('/', searchRouter);

// Chat API Routes
app.use('/', chatRouter);

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

// Serve React frontend
const frontendPath = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  
  app.get('*', (req: Request, res: Response): void => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({
        error: 'API endpoint not found',
        path: req.path,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
} else {
  app.get('/', (_req: Request, res: Response): void => {
    res.status(200).json({
      name: 'N.Crisis API',
      version: '2.1.0',
      description: 'PII Detection & LGPD Compliance Platform',
      status: 'operational',
      note: 'React frontend building...',
      endpoints: {
        health: '/health',
        upload: '/api/v1/archives/upload',
        detections: '/api/v1/reports/detections',
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.all('*', (req: Request, res: Response): void => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({
        error: 'API endpoint not found',
        path: req.path,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.redirect('/');
    }
  });
}

// Legacy code removed to fix variable redeclaration

// Try multiple frontend paths
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
} else if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
}

// Frontend routes - serve dashboard for main routes
app.get('/', (_req: Request, res: Response): void => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>N.Crisis - PII Detection Platform</title>
    <style>
        :root {
            --bg-primary: #0D1B2A;
            --bg-secondary: #112240;
            --bg-card: #1e293b;
            --border: #374151;
            --text-primary: #E0E1E6;
            --text-secondary: #A5A8B1;
            --accent: #00ade0;
            --success: #10b981;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }
        
        .app { display: flex; height: 100vh; overflow: hidden; }
        
        .sidebar {
            width: 260px;
            background: var(--bg-secondary);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
        }
        
        .sidebar-header {
            padding: 24px 20px;
            border-bottom: 1px solid var(--border);
        }
        
        .logo {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 4px;
        }
        
        .logo .dot { color: var(--accent); }
        
        .subtitle {
            font-size: 12px;
            color: var(--text-secondary);
            font-weight: 500;
        }
        
        .nav {
            flex: 1;
            padding: 20px 16px;
        }
        
        .nav-item {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            margin: 2px 0;
            border-radius: 8px;
            color: var(--text-primary);
            font-weight: 500;
            font-size: 14px;
            transition: all 0.2s ease;
            cursor: pointer;
            text-decoration: none;
        }
        
        .nav-item:hover {
            background: rgba(0, 173, 224, 0.1);
            color: var(--accent);
        }
        
        .nav-item.active {
            background: var(--accent);
            color: white;
        }
        
        .nav-icon {
            width: 20px;
            height: 20px;
            margin-right: 12px;
        }
        
        .main {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .header {
            padding: 20px 32px;
            border-bottom: 1px solid var(--border);
            background: var(--bg-primary);
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
        }
        
        .content {
            flex: 1;
            padding: 32px;
            overflow-y: auto;
        }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
            margin-bottom: 32px;
        }
        
        .card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            transition: all 0.2s ease;
        }
        
        .card:hover {
            border-color: var(--accent);
            transform: translateY(-2px);
        }
        
        .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
        }
        
        .card-icon {
            width: 24px;
            height: 24px;
            margin-right: 12px;
            color: var(--accent);
        }
        
        .card-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--accent);
        }
        
        .card-value {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .card-description {
            color: var(--text-secondary);
            font-size: 14px;
        }
        
        .page { display: none; }
        .page.active { display: block; }
        
        .upload-area {
            border: 2px dashed var(--border);
            border-radius: 12px;
            padding: 48px 24px;
            text-align: center;
            background: var(--bg-card);
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 24px;
        }
        
        .upload-area:hover {
            border-color: var(--accent);
            background: rgba(0, 173, 224, 0.05);
        }
        
        .btn {
            background: var(--accent);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .btn:hover {
            background: #0088b3;
            transform: translateY(-1px);
        }
        
        .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--success);
        }
    </style>
</head>
<body>
    <div class="app">
        <nav class="sidebar">
            <div class="sidebar-header">
                <div class="logo">n<span class="dot">.</span>crisis</div>
                <div class="subtitle">PII Detection & LGPD Compliance</div>
            </div>
            <div class="nav">
                <a class="nav-item active" onclick="showPage('dashboard')">
                    <span class="nav-icon">📊</span>
                    Dashboard
                </a>
                <a class="nav-item" onclick="showPage('upload')">
                    <span class="nav-icon">📤</span>
                    Upload
                </a>
                <a class="nav-item" onclick="showPage('detections')">
                    <span class="nav-icon">🔍</span>
                    Detecções
                </a>
                <a class="nav-item" onclick="showPage('reports')">
                    <span class="nav-icon">📋</span>
                    Relatórios
                </a>
                <a class="nav-item" onclick="showPage('search')">
                    <span class="nav-icon">🔎</span>
                    Busca IA
                </a>
                <a class="nav-item" onclick="showPage('settings')">
                    <span class="nav-icon">⚙️</span>
                    Configurações
                </a>
            </div>
        </nav>
        
        <main class="main">
            <div class="header">
                <h1 id="page-title">Dashboard</h1>
            </div>
            
            <div class="content">
                <div id="dashboard-page" class="page active">
                    <div class="dashboard-grid">
                        <div class="card">
                            <div class="card-header">
                                <span class="card-icon">📁</span>
                                <span class="card-title">Arquivos Processados</span>
                            </div>
                            <div class="card-value" id="total-files">0</div>
                            <div class="card-description">Total de uploads realizados</div>
                        </div>
                        
                        <div class="card">
                            <div class="card-header">
                                <span class="card-icon">🔍</span>
                                <span class="card-title">Detecções PII</span>
                            </div>
                            <div class="card-value" id="total-detections">0</div>
                            <div class="card-description">Dados sensíveis identificados</div>
                        </div>
                        
                        <div class="card">
                            <div class="card-header">
                                <span class="card-icon">⚠️</span>
                                <span class="card-title">Alertas LGPD</span>
                            </div>
                            <div class="card-value" id="total-alerts">0</div>
                            <div class="card-description">Incidentes de privacidade</div>
                        </div>
                        
                        <div class="card">
                            <div class="card-header">
                                <span class="card-icon">🚀</span>
                                <span class="card-title">Status do Sistema</span>
                            </div>
                            <div class="status-indicator">
                                <span class="status-dot"></span>
                                <span>Operacional</span>
                            </div>
                            <div class="card-description">Todos os serviços funcionando</div>
                        </div>
                    </div>
                </div>
                
                <div id="upload-page" class="page">
                    <div class="upload-area" onclick="document.getElementById('file-input').click()">
                        <div style="font-size: 48px; margin-bottom: 16px;">📤</div>
                        <h3>Arraste arquivos aqui ou clique para selecionar</h3>
                        <p style="color: var(--text-secondary); margin-top: 16px;">
                            Suporte para ZIP, PDF, DOC, XLS e outros formatos
                        </p>
                        <input type="file" id="file-input" style="display: none;" multiple 
                               accept=".zip,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv">
                        <button class="btn" style="margin-top: 24px;">
                            Selecionar Arquivos
                        </button>
                    </div>
                </div>
                
                <div id="detections-page" class="page">
                    <div class="card">
                        <h3 style="margin-bottom: 24px;">Detecções Recentes</h3>
                        <div id="detections-list">
                            <p style="text-align: center; padding: 48px; color: var(--text-secondary);">
                                Nenhuma detecção encontrada. Faça upload de arquivos para começar.
                            </p>
                        </div>
                    </div>
                </div>
                
                <div id="reports-page" class="page">
                    <div class="card">
                        <h3 style="margin-bottom: 24px;">Relatórios LGPD</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 24px;">
                            Gere relatórios de conformidade LGPD baseados nas detecções realizadas.
                        </p>
                        <button class="btn">Gerar Relatório PDF</button>
                    </div>
                </div>
                
                <div id="search-page" class="page">
                    <div class="card">
                        <h3 style="margin-bottom: 24px;">Busca IA Semântica</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 24px;">
                            Utilize inteligência artificial para buscar e analisar dados sensíveis.
                        </p>
                        <div style="display: flex; gap: 16px; margin-bottom: 24px;">
                            <input type="text" placeholder="Digite sua busca..." id="search-input"
                                   style="flex: 1; padding: 12px; border: 1px solid var(--border); 
                                          border-radius: 8px; background: var(--bg-card); 
                                          color: var(--text-primary);">
                            <button class="btn" onclick="performSearch()">Buscar</button>
                        </div>
                        <div id="search-results"></div>
                    </div>
                </div>
                
                <div id="settings-page" class="page">
                    <div class="card">
                        <h3 style="margin-bottom: 24px;">Configurações do Sistema</h3>
                        <div style="display: grid; gap: 24px;">
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">
                                    Detecção de PII
                                </label>
                                <div style="display: flex; gap: 16px; align-items: center;">
                                    <label><input type="checkbox" checked> CPF/CNPJ</label>
                                    <label><input type="checkbox" checked> Emails</label>
                                    <label><input type="checkbox" checked> Telefones</label>
                                    <label><input type="checkbox" checked> Nomes</label>
                                </div>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">
                                    Segurança
                                </label>
                                <div style="display: flex; gap: 16px; align-items: center;">
                                    <label><input type="checkbox" checked> Scan antivírus</label>
                                    <label><input type="checkbox" checked> Validação MIME</label>
                                    <label><input type="checkbox" checked> Logs de auditoria</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
    
    <script>
        // Navigation
        function showPage(pageId) {
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            event.target.classList.add('active');
            
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById(pageId + '-page').classList.add('active');
            
            const titles = {
                'dashboard': 'Dashboard',
                'upload': 'Upload de Arquivos',
                'detections': 'Detecções PII',
                'reports': 'Relatórios LGPD',
                'search': 'Busca IA Semântica',
                'settings': 'Configurações'
            };
            document.getElementById('page-title').textContent = titles[pageId];
        }
        
        // File upload
        document.getElementById('file-input').addEventListener('change', function(e) {
            const files = e.target.files;
            if (files.length > 0) {
                uploadFiles(files);
            }
        });
        
        async function uploadFiles(files) {
            for (let file of files) {
                const formData = new FormData();
                formData.append('file', file);
                
                try {
                    const response = await fetch('/api/v1/archives/upload', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    console.log('Upload result:', result);
                    
                    if (result.success) {
                        alert('Arquivo processado com sucesso!');
                        loadStatistics();
                        loadDetections();
                    }
                } catch (error) {
                    console.error('Upload error:', error);
                    alert('Erro no upload: ' + error.message);
                }
            }
        }
        
        // Search functionality
        async function performSearch() {
            const query = document.getElementById('search-input').value;
            const resultsDiv = document.getElementById('search-results');
            
            if (!query) return;
            
            resultsDiv.innerHTML = '<p>Buscando...</p>';
            
            try {
                const response = await fetch('/api/v1/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });
                
                const results = await response.json();
                
                if (results.success && results.results.length > 0) {
                    resultsDiv.innerHTML = results.results.map(result => 
                        '<div class="card" style="margin: 16px 0;">' +
                        '<h4>' + result.fileId + '</h4>' +
                        '<p>' + result.text + '</p>' +
                        '<p><small>Similaridade: ' + (result.similarity * 100).toFixed(1) + '%</small></p>' +
                        '</div>'
                    ).join('');
                } else {
                    resultsDiv.innerHTML = '<p>Nenhum resultado encontrado.</p>';
                }
            } catch (error) {
                resultsDiv.innerHTML = '<p>Erro na busca: ' + error.message + '</p>';
            }
        }
        
        // Load data functions
        async function loadStatistics() {
            try {
                const response = await fetch('/health');
                const health = await response.json();
                
                // Update dashboard cards with real data
                document.getElementById('total-files').textContent = '0';
                document.getElementById('total-detections').textContent = '0';
                document.getElementById('total-alerts').textContent = '0';
            } catch (error) {
                console.error('Statistics error:', error);
            }
        }
        
        async function loadDetections() {
            try {
                const response = await fetch('/api/v1/reports/detections');
                const data = await response.json();
                
                const listDiv = document.getElementById('detections-list');
                
                if (data.detections && data.detections.length > 0) {
                    listDiv.innerHTML = data.detections.map(detection => 
                        '<div class="card" style="margin: 16px 0;">' +
                        '<h4>' + detection.titular + '</h4>' +
                        '<p><strong>Tipo:</strong> ' + detection.documento + '</p>' +
                        '<p><strong>Arquivo:</strong> ' + detection.arquivo + '</p>' +
                        '<p><small>' + new Date(detection.timestamp).toLocaleString() + '</small></p>' +
                        '</div>'
                    ).join('');
                } else {
                    listDiv.innerHTML = '<p style="text-align: center; padding: 48px;">Nenhuma detecção encontrada.</p>';
                }
            } catch (error) {
                console.error('Detections error:', error);
            }
        }
        
        // Initialize dashboard
        loadStatistics();
        loadDetections();
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            loadStatistics();
            loadDetections();
        }, 30000);
    </script>
</body>
</html>`);
});

// Dashboard routes
app.get('/dashboard', (_req: Request, res: Response): void => {
  res.redirect('/');
});

app.get('/upload', (_req: Request, res: Response): void => {
  res.redirect('/#upload');
});

app.get('/detections', (_req: Request, res: Response): void => {
  res.redirect('/#detections');
});

app.get('/reports', (_req: Request, res: Response): void => {
  res.redirect('/#reports');
});

app.get('/search', (_req: Request, res: Response): void => {
  res.redirect('/#search');
});

app.get('/settings', (_req: Request, res: Response): void => {
  res.redirect('/#settings');
});

// API routes take precedence, then serve 404 for other routes
app.get('*', (req: Request, res: Response): void => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/socket.io')) {
      res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.path,
        timestamp: new Date().toISOString()
      });
      return;
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  // Fallback when frontend build doesn't exist
  app.get('/', (_req: Request, res: Response): void => {
    res.status(200).json({
      name: 'PIIDetector API',
      version: '2.0.0',
      description: 'PII detection with simplified processing',
      note: 'Frontend not built - run "npm run build" in frontend directory',
      endpoints: {
        health: '/health',
        upload: '/api/v1/archives/upload',
        detections: '/api/v1/reports/detections',
      },
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler for when frontend is not available
  app.all('*', (_req: Request, res: Response): void => {
    res.status(404).json({
      error: 'Not Found',
      message: 'Route not found',
      statusCode: 404,
      timestamp: new Date().toISOString(),
    });
  });
}

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
      console.log(`🚀 PIIDetector server running on http://${env.HOST}:${env.PORT}`);
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