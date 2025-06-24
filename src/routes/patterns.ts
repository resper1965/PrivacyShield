/**
 * Patterns Routes
 * CRUD operations for PII detection patterns
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/patterns - Get all patterns
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, isActive } = req.query;

    const whereClause: any = {};
    if (type) whereClause.type = type;
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';

    const patterns = await prisma.pattern.findMany({
      where: whereClause,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    res.status(200).json({
      message: 'Patterns retrieved successfully',
      patterns,
      count: patterns.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error retrieving patterns:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve patterns',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/patterns/:id - Get pattern by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const patternId = parseInt(id);

    if (isNaN(patternId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid pattern ID',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const pattern = await prisma.pattern.findUnique({
      where: { id: patternId }
    });

    if (!pattern) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Pattern not found',
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      message: 'Pattern retrieved successfully',
      pattern,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error retrieving pattern:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve pattern',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/patterns - Create new pattern
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, pattern, type, description, isActive } = req.body;

    if (!name || !pattern || !type) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: name, pattern, type',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Validate regex pattern
    try {
      new RegExp(pattern);
    } catch (regexError) {
      res.status(422).json({
        error: 'Unprocessable Entity',
        message: 'Invalid regex pattern',
        statusCode: 422,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check for duplicate pattern names
    const existingPattern = await prisma.pattern.findFirst({
      where: { name }
    });

    if (existingPattern) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Pattern with this name already exists',
        statusCode: 409,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const newPattern = await prisma.pattern.create({
      data: {
        name,
        pattern,
        type,
        description,
        isActive: isActive !== false,
        isDefault: false
      }
    });

    logger.info(`Pattern created: ${newPattern.name} (ID: ${newPattern.id})`);

    res.status(201).json({
      message: 'Pattern created successfully',
      pattern: newPattern,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error creating pattern:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create pattern',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /api/v1/patterns/:id - Update pattern
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const patternId = parseInt(id);
    const { name, pattern, type, description, isActive } = req.body;

    if (isNaN(patternId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid pattern ID',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Validate regex pattern if provided
    if (pattern) {
      try {
        new RegExp(pattern);
      } catch (regexError) {
        res.status(422).json({
          error: 'Unprocessable Entity',
          message: 'Invalid regex pattern',
          statusCode: 422,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    const existingPattern = await prisma.pattern.findUnique({
      where: { id: patternId }
    });

    if (!existingPattern) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Pattern not found',
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Prevent modification of default patterns
    if (existingPattern.isDefault) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot modify default patterns',
        statusCode: 403,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (pattern !== undefined) updateData.pattern = pattern;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedPattern = await prisma.pattern.update({
      where: { id: patternId },
      data: updateData
    });

    logger.info(`Pattern updated: ${updatedPattern.name} (ID: ${updatedPattern.id})`);

    res.status(200).json({
      message: 'Pattern updated successfully',
      pattern: updatedPattern,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error updating pattern:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update pattern',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/v1/patterns/:id - Delete pattern
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const patternId = parseInt(id);

    if (isNaN(patternId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid pattern ID',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const existingPattern = await prisma.pattern.findUnique({
      where: { id: patternId }
    });

    if (!existingPattern) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Pattern not found',
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Prevent deletion of default patterns
    if (existingPattern.isDefault) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot delete default patterns',
        statusCode: 403,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await prisma.pattern.delete({
      where: { id: patternId }
    });

    logger.info(`Pattern deleted: ${existingPattern.name} (ID: ${patternId})`);

    res.status(200).json({
      message: 'Pattern deleted successfully',
      patternId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error deleting pattern:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete pattern',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/patterns/test - Test pattern against sample text
 */
router.post('/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const { pattern, testText } = req.body;

    if (!pattern || !testText) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing pattern or testText in request body',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      const regex = new RegExp(pattern, 'g');
      const matches = testText.match(regex) || [];
      
      res.status(200).json({
        message: 'Pattern tested successfully',
        result: {
          pattern,
          matches,
          matchCount: matches.length,
          testText
        },
        timestamp: new Date().toISOString(),
      });

    } catch (regexError) {
      res.status(422).json({
        error: 'Unprocessable Entity',
        message: 'Invalid regex pattern',
        statusCode: 422,
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    logger.error('Error testing pattern:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to test pattern',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;