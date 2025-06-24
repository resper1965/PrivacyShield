/**
 * Database Seed Script
 * Creates DEFAULT_ADMIN user and default PII patterns
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

async function seedDefaultPatterns(): Promise<void> {
  logger.info('Seeding default PII patterns...');

  const defaultPatterns = [
    {
      name: 'CPF Brasileiro',
      pattern: '\\d{3}\\.?\\d{3}\\.?\\d{3}[-.]?\\d{2}',
      type: 'CPF',
      description: 'Padrão para CPF brasileiro com ou sem formatação',
      isDefault: true,
      isActive: true
    },
    {
      name: 'CNPJ Brasileiro',
      pattern: '\\d{2}\\.?\\d{3}\\.?\\d{3}\\/?\\d{4}[-.]?\\d{2}',
      type: 'CNPJ',
      description: 'Padrão para CNPJ brasileiro com ou sem formatação',
      isDefault: true,
      isActive: true
    },
    {
      name: 'RG Brasileiro',
      pattern: '\\d{1,2}\\.?\\d{3}\\.?\\d{3}[-.]?[0-9xX]',
      type: 'RG',
      description: 'Padrão para RG brasileiro',
      isDefault: true,
      isActive: true
    },
    {
      name: 'CEP Brasileiro',
      pattern: '\\d{5}[-.]?\\d{3}',
      type: 'CEP',
      description: 'Padrão para CEP brasileiro',
      isDefault: true,
      isActive: true
    },
    {
      name: 'Email',
      pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
      type: 'Email',
      description: 'Padrão para endereços de email',
      isDefault: true,
      isActive: true
    },
    {
      name: 'Telefone Brasileiro',
      pattern: '(?:\\+55\\s?)?(?:\\(?\\d{2}\\)?\\s?)?9?\\d{4}[-\\s]?\\d{4}',
      type: 'Telefone',
      description: 'Padrão para telefones brasileiros',
      isDefault: true,
      isActive: true
    },
    {
      name: 'Nome Completo',
      pattern: '\\b[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+){1,}\\b',
      type: 'Nome Completo',
      description: 'Padrão para nomes completos brasileiros',
      isDefault: true,
      isActive: true
    }
  ];

  for (const pattern of defaultPatterns) {
    // Check if pattern already exists
    const existing = await prisma.pattern.findFirst({
      where: { name: pattern.name }
    });

    if (!existing) {
      await prisma.pattern.create({ data: pattern });
      logger.info(`Created pattern: ${pattern.name}`);
    } else {
      logger.info(`Pattern already exists: ${pattern.name}`);
    }
  }
}

async function seedDefaultAdmin(): Promise<void> {
  logger.info('Seeding default admin user...');

  // Since we don't have a User model in our current schema,
  // we'll create a source record as a placeholder for admin functionality
  const existing = await prisma.source.findFirst({
    where: { name: 'DEFAULT_ADMIN' }
  });

  if (!existing) {
    await prisma.source.create({
      data: {
        name: 'DEFAULT_ADMIN',
        type: 'manual',
        path: '/admin',
        isActive: true,
        filePatterns: ['*'],
        processSubdirs: false
      }
    });
    logger.info('Created DEFAULT_ADMIN source record');
  } else {
    logger.info('DEFAULT_ADMIN already exists');
  }
}

async function seedDefaultSources(): Promise<void> {
  logger.info('Seeding default data sources...');

  const defaultSources = [
    {
      name: 'Upload Directory',
      type: 'upload',
      path: '/uploads',
      isActive: true,
      filePatterns: ['*.zip'],
      processSubdirs: false
    },
    {
      name: 'Manual Processing',
      type: 'manual',
      path: '/manual',
      isActive: true,
      filePatterns: ['*'],
      processSubdirs: true
    }
  ];

  for (const source of defaultSources) {
    const existing = await prisma.source.findFirst({
      where: { name: source.name }
    });

    if (!existing) {
      await prisma.source.create({ data: source });
      logger.info(`Created source: ${source.name}`);
    } else {
      logger.info(`Source already exists: ${source.name}`);
    }
  }
}

async function main(): Promise<void> {
  try {
    logger.info('Starting database seed...');

    await seedDefaultPatterns();
    await seedDefaultAdmin();
    await seedDefaultSources();

    logger.info('Database seed completed successfully');
  } catch (error) {
    logger.error('Database seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  main();
}