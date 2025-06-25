/**
 * Vector Search API Routes
 * Semantic search using FAISS and OpenAI embeddings
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import OpenAI from 'openai';
import { getFaissManager } from '../faissManager';

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'],
});

/**
 * POST /api/v1/search/semantic
 * Perform semantic search using text query
 */
router.post(
  '/api/v1/search/semantic',
  [
    body('query')
      .isString()
      .trim()
      .isLength({ min: 1, max: 8000 })
      .withMessage('Query must be between 1 and 8000 characters'),
    body('k')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('k must be between 1 and 50')
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

      const { query: searchQuery, k = 5 } = req.body;

      console.log(`[Search] Semantic search for: "${searchQuery}" (k=${k})`);

      // Generate embedding for search query
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: searchQuery,
        encoding_format: "float"
      });

      const queryVector = embeddingResponse.data[0]?.embedding;
      
      if (!queryVector) {
        throw new Error('Failed to generate embedding for search query');
      }

      // Perform vector search
      const faissManager = getFaissManager();
      const searchResults = await faissManager.search(queryVector, k);

      console.log(`[Search] Found ${searchResults.length} results`);

      res.status(200).json({
        success: true,
        query: searchQuery,
        results: searchResults,
        stats: {
          totalResults: searchResults.length,
          queryDimensions: queryVector.length,
          executionTime: Date.now()
        }
      });

    } catch (error) {
      console.error('[Search] Semantic search failed:', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to perform semantic search'
      });
    }
  }
);

/**
 * POST /api/v1/search/vector
 * Direct vector search (for when you already have embeddings)
 */
router.post(
  '/api/v1/search/vector',
  [
    body('vector')
      .isArray()
      .withMessage('Vector must be an array'),
    body('vector.*')
      .isFloat()
      .withMessage('Vector elements must be numbers'),
    body('k')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('k must be between 1 and 50')
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

      const { vector, k = 5 } = req.body;

      console.log(`[Search] Vector search with ${vector.length} dimensions (k=${k})`);

      // Perform vector search
      const faissManager = getFaissManager();
      const searchResults = await faissManager.search(vector, k);

      console.log(`[Search] Found ${searchResults.length} results`);

      res.status(200).json({
        success: true,
        results: searchResults,
        stats: {
          totalResults: searchResults.length,
          queryDimensions: vector.length,
          executionTime: Date.now()
        }
      });

    } catch (error) {
      console.error('[Search] Vector search failed:', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to perform vector search'
      });
    }
  }
);

/**
 * GET /api/v1/search/stats
 * Get FAISS index statistics
 */
router.get('/api/v1/search/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const faissManager = getFaissManager();
    const stats = faissManager.getStats();

    res.status(200).json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Search] Stats request failed:', error);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get search statistics'
    });
  }
});

/**
 * POST /api/v1/search/rebuild
 * Rebuild FAISS index from database
 */
router.post('/api/v1/search/rebuild', async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log('[Search] Rebuilding FAISS index...');
    
    const faissManager = getFaissManager();
    await faissManager.rebuild();

    const stats = faissManager.getStats();

    res.status(200).json({
      success: true,
      message: 'FAISS index rebuilt successfully',
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Search] Index rebuild failed:', error);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to rebuild search index'
    });
  }
});

export default router;