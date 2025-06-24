/**
 * Jest Test Setup
 * Global configuration for test environment
 */

import { PrismaClient } from '@prisma/client';

// Setup test database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_piidetector'
    }
  }
});

// Global test utilities
global.prisma = prisma;

// Cleanup before each test
beforeEach(async () => {
  // Clean up test data
  await prisma.detection.deleteMany();
  await prisma.file.deleteMany();
  await prisma.pattern.deleteMany();
  await prisma.source.deleteMany();
});

// Cleanup after all tests
afterAll(async () => {
  await prisma.$disconnect();
});