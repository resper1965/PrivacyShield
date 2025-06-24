/**
 * Redis Configuration
 * Connection setup for BullMQ queues
 */

import Redis from 'ioredis';

// Redis connection configuration
const redisConfig: any = {
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379'),
  db: parseInt(process.env['REDIS_DB'] || '0'),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  lazyConnect: true,
};

// Add password only if provided
if (process.env['REDIS_PASSWORD']) {
  redisConfig.password = process.env['REDIS_PASSWORD'];
}

// Parse REDIS_URL if provided
if (process.env['REDIS_URL']) {
  const redisUrl = new URL(process.env['REDIS_URL']);
  redisConfig.host = redisUrl.hostname;
  redisConfig.port = parseInt(redisUrl.port) || 6379;
  if (redisUrl.password) {
    redisConfig.password = redisUrl.password;
  }
}

// Create Redis connection
export const redisConnection = new Redis(redisConfig as any);

// Connection event handlers
redisConnection.on('connect', () => {
  console.log('🔗 Redis connected successfully');
});

redisConnection.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redisConnection.on('close', () => {
  console.log('🔌 Redis connection closed');
});

// Health check for Redis
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redisConnection.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectRedis(): Promise<void> {
  await redisConnection.disconnect();
  console.log('🔌 Redis disconnected');
}