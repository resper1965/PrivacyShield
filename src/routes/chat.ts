/**
 * Chat API Routes
 * Semantic search + OpenAI chat for contextual answers
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
 * POST /api/v1/chat
 * Semantic search + AI chat for contextual answers
 */
router.post(
  '/api/v1/chat',
  [
    body('query')
      .isString()
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Query must be between 1 and 2000 characters'),
    body('k')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('k must be between 1 and 10')
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

      const { query, k = 5 } = req.body;

      console.log(`[Chat] Processing query: "${query}" (k=${k})`);

      // Step 1: Generate embedding for the query
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
        encoding_format: "float"
      });

      const queryVector = embeddingResponse.data[0]?.embedding;
      
      if (!queryVector) {
        throw new Error('Failed to generate embedding for query');
      }

      // Step 2: Perform semantic search using FAISS
      const faissManager = getFaissManager();
      const searchResults = await faissManager.search(queryVector, k);

      console.log(`[Chat] Found ${searchResults.length} similar documents`);

      // Step 3: Gather contexts from search results
      const contexts: string[] = [];
      const sources: Array<{ id: number; fileId: string; similarity: number }> = [];

      for (const result of searchResults) {
        // Add text as context
        contexts.push(result.text);
        
        // Track sources
        sources.push({
          id: result.id,
          fileId: result.fileId,
          similarity: result.similarity
        });
      }

      // Step 4: Build the prompt for OpenAI
      const contextText = contexts.join('\n\n---\n\n');
      const systemPrompt = `Você é um assistente especializado em análise de documentos e detecção de PII (Informações Pessoais Identificáveis).

Use APENAS as informações dos contextos fornecidos para responder à pergunta do usuário. Se a informação não estiver disponível nos contextos, diga claramente que não há informações suficientes.

CONTEXTOS DISPONÍVEIS:
${contextText}

Instruções:
- Responda em português brasileiro
- Seja preciso e objetivo
- Cite as informações relevantes dos contextos
- Se não houver informações suficientes, seja honesto sobre isso
- Foque em aspectos relacionados a PII, LGPD e proteção de dados quando relevante`;

      // Step 5: Generate response using OpenAI Chat
      console.log(`[Chat] Generating AI response with ${contexts.length} contexts`);
      
      const chatResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Cost-effective tier
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: query
          }
        ],
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for more focused responses
      });

      const answer = chatResponse.choices[0]?.message?.content;

      if (!answer) {
        throw new Error('Failed to generate AI response');
      }

      console.log(`[Chat] Response generated successfully`);

      // Step 6: Return response with sources
      res.status(200).json({
        success: true,
        query,
        answer,
        sources,
        stats: {
          contextsUsed: contexts.length,
          totalSimilarityScore: sources.reduce((sum, s) => sum + s.similarity, 0),
          averageSimilarity: sources.length > 0 ? sources.reduce((sum, s) => sum + s.similarity, 0) / sources.length : 0,
          queryDimensions: queryVector.length,
          executionTime: Date.now()
        }
      });

    } catch (error) {
      console.error('[Chat] Error processing chat request:', error);
      
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
        message: 'Failed to process chat request'
      });
    }
  }
);

/**
 * GET /api/v1/chat/health
 * Health check for chat service
 */
router.get('/api/v1/chat/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const hasApiKey = !!process.env['OPENAI_API_KEY'];
    const faissManager = getFaissManager();
    const faissStats = faissManager.getStats();

    res.status(200).json({
      status: 'healthy',
      service: 'chat-api',
      dependencies: {
        openai_configured: hasApiKey,
        faiss_initialized: faissStats.isInitialized,
        vector_count: faissStats.vectorCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Chat] Health check failed:', error);
    
    res.status(500).json({
      status: 'unhealthy',
      service: 'chat-api',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;