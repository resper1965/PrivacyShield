/**
 * WebSocket Service
 * Real-time progress updates for upload processing
 */

import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

export interface ProgressUpdate {
  sessionId: string;
  stage: 'upload' | 'virus_scan' | 'extraction' | 'processing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  details?: {
    filesProcessed?: number;
    totalFiles?: number;
    bytesProcessed?: number;
    totalBytes?: number;
    currentFile?: string;
    detectionsFound?: number;
  };
}

export class WebSocketService {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info(`WebSocket client connected: ${socket.id}`);

      socket.on('join-session', (sessionId: string) => {
        socket.join(`session-${sessionId}`);
        logger.debug(`Client ${socket.id} joined session ${sessionId}`);
        
        socket.emit('session-joined', { sessionId, status: 'connected' });
      });

      socket.on('leave-session', (sessionId: string) => {
        socket.leave(`session-${sessionId}`);
        logger.debug(`Client ${socket.id} left session ${sessionId}`);
      });

      socket.on('disconnect', (reason) => {
        logger.debug(`WebSocket client disconnected: ${socket.id} - ${reason}`);
      });
    });
  }

  public sendProgress(update: ProgressUpdate): void {
    const room = `session-${update.sessionId}`;
    this.io.to(room).emit('progress', update);
    
    logger.debug(`Progress update sent to ${room}:`, {
      stage: update.stage,
      progress: update.progress,
      message: update.message
    });
  }

  public sendError(sessionId: string, error: string, details?: any): void {
    const update: ProgressUpdate = {
      sessionId,
      stage: 'error',
      progress: 0,
      message: error,
      details
    };
    
    this.sendProgress(update);
  }

  public sendComplete(sessionId: string, results: any): void {
    const update: ProgressUpdate = {
      sessionId,
      stage: 'complete',
      progress: 100,
      message: 'Processing completed successfully',
      details: results
    };
    
    this.sendProgress(update);
  }
}

let wsService: WebSocketService | null = null;

export function initializeWebSocketService(io: SocketIOServer): WebSocketService {
  wsService = new WebSocketService(io);
  return wsService;
}

export function getWebSocketService(): WebSocketService | null {
  return wsService;
}