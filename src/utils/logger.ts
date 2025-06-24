/**
 * Pino Logger Configuration
 * Structured logging with prettifier for development
 */

import pino from 'pino';
import { env } from '../config/env';

const isDevelopment = env.NODE_ENV === 'development';

const loggerConfig: any = {
  level: env.LOG_LEVEL,
  formatters: {
    level: (label: any) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

if (isDevelopment) {
  try {
    loggerConfig.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  } catch (error) {
    // Fallback to basic console output if pino-pretty is not available
    console.warn('pino-pretty not available, using basic logging');
  }
}

export const logger = pino(loggerConfig);

export default logger;