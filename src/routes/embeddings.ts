/**
 * Embeddings API Routes
 * OpenAI embeddings generation and vector storage
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'],
});

/**
 * POST /api/v1/embeddings
 * Generate embeddings for text and store in database
 */
router.post(
  '/api/v1/embeddings',
  [
    body('text')
      .isString()
      .trim()
      .isLength({ min: 1, max: 8000 })
      .withMessage('Text must be between 1 and 8000 characters')
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { text } = req.body;

      // Create hash for text to avoid duplicates
      const textHash = crypto.createHash('sha256').update(text).digest('hex');

      // Check if embedding already exists
      const existingEmbedding = await prisma.textEmbedding.findUnique({
        where: { hash: textHash }
      });

      if (existingEmbedding) {
        res.status(200).json({
          success: true,
          message: 'Embedding retrieved from cache',
          data: {
            id: existingEmbedding.id,
            vector: existingEmbedding.vector,
            cached: true,
            createdAt: existingEmbedding.createdAt
          }
        });
        return;
      }

      // Generate embedding using OpenAI
      console.log(`[Embeddings] Generating embedding for text (${text.length} chars)`);
      
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small", // Latest and most cost-effective model
        input: text,
        encoding_format: "float"
      });

      const vector = embeddingResponse.data[0]?.embedding;
      
      if (!vector) {
        throw new Error('No embedding data received from OpenAI');
      }

      // Store embedding in database
      const textEmbedding = await prisma.textEmbedding.create({
        data: {
          text,
          vector,
          hash: textHash
        }
      });

      console.log(`[Embeddings] Created embedding ${textEmbedding.id} for text hash ${textHash.substring(0, 8)}`);

      res.status(201).json({
        success: true,
        message: 'Embedding generated and stored successfully',
        data: {
          id: textEmbedding.id,
          vector: textEmbedding.vector,
          cached: false,
          createdAt: textEmbedding.createdAt,
          dimensions: vector.length,
          model: "text-embedding-3-small"
        }
      });

    } catch (error) {
      console.error('[Embeddings] Error generating embedding:', error);
      
      if (error instanceof Error) {
        // OpenAI specific errors
        if (error.message.includes('API key')) {
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or missing OpenAI API key'
          });
          return;
        }

        if (error.message.includes('rate limit')) {
          res.status(429).json({
            error: 'Rate Limited',
            message: 'OpenAI API rate limit exceeded'
          });
          return;
        }
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate embedding'
      });
    }
  }
);

/**
 * GET /api/v1/embeddings/:id
 * Retrieve embedding by ID
 */
router.get('/api/v1/embeddings/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Embedding ID is required'
      });
      return;
    }
    
    const embeddingId = parseInt(id);

    if (isNaN(embeddingId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid embedding ID'
      });
      return;
    }

    const embedding = await prisma.textEmbedding.findUnique({
      where: { id: embeddingId }
    });

    if (!embedding) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Embedding not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: embedding.id,
        text: embedding.text,
        vector: embedding.vector,
        createdAt: embedding.createdAt,
        dimensions: embedding.vector.length
      }
    });

  } catch (error) {
    console.error('[Embeddings] Error retrieving embedding:', error);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve embedding'
    });
  }
});

/**
 * GET /api/v1/embeddings/health
 * Health check for embeddings service
 */
router.get('/api/v1/embeddings/health', (_req: Request, res: Response): void => {
  const hasApiKey = !!process.env['OPENAI_API_KEY'];
  
  res.status(200).json({
    status: 'healthy',
    service: 'embeddings-api',
    openai_configured: hasApiKey,
    timestamp: new Date().toISOString()
  });
});

export default router;