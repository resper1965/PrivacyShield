/**
 * PIIDetector Server Entry Point
 * Starts the modernized application with proper error handling
 */

import PIIDetectorApp from './app';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  try {
    const app = new PIIDetectorApp();
    await app.start();

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      try {
        await app.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to bootstrap application:', error);
    process.exit(1);
  }
}

bootstrap();