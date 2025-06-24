import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface ProgressUpdate {
  sessionId: string;
  stage: 'upload' | 'virus_scan' | 'extraction' | 'processing' | 'complete' | 'error';
  progress: number;
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

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinSession: (sessionId: string) => void;
  leaveSession: (sessionId: string) => void;
  onProgress: (callback: (update: ProgressUpdate) => void) => void;
  offProgress: (callback: (update: ProgressUpdate) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000`;
    
    const newSocket = io(wsUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const joinSession = (sessionId: string) => {
    if (socket) {
      socket.emit('join-session', sessionId);
    }
  };

  const leaveSession = (sessionId: string) => {
    if (socket) {
      socket.emit('leave-session', sessionId);
    }
  };

  const onProgress = (callback: (update: ProgressUpdate) => void) => {
    if (socket) {
      socket.on('progress', callback);
    }
  };

  const offProgress = (callback: (update: ProgressUpdate) => void) => {
    if (socket) {
      socket.off('progress', callback);
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        isConnected,
        joinSession,
        leaveSession,
        onProgress,
        offProgress
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};