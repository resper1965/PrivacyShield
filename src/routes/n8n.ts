/**
 * N8N Webhook Routes
 * Integration endpoints for n8n workflow automation
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';

const router = Router();

/**
 * POST /api/v1/n8n/webhook/incident
 * Webhook endpoint for registering new incidents from n8n
 */
router.post(
  '/api/v1/n8n/webhook/incident',
  [
    body('fileId')
      .isInt({ min: 1 })
      .withMessage('fileId must be a positive integer')
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

      const { fileId } = req.body;

      // Log the webhook call for audit
      console.log(`[N8N Webhook] New incident webhook called for fileId: ${fileId}`);
      console.log(`[N8N Webhook] Request from: ${req.ip}`);
      console.log(`[N8N Webhook] Timestamp: ${new Date().toISOString()}`);

      // Here you can add business logic such as:
      // - Validate fileId exists in database
      // - Create incident record
      // - Send notifications
      // - Trigger additional workflows
      
      // For now, just acknowledge receipt
      res.status(200).json({
        success: true,
        message: 'Incident webhook received successfully',
        data: {
          fileId,
          timestamp: new Date().toISOString(),
          status: 'processed'
        }
      });

    } catch (error) {
      console.error('[N8N Webhook] Error processing incident webhook:', error);
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process webhook'
      });
    }
  }
);

/**
 * GET /api/v1/n8n/health
 * Health check endpoint for n8n integration
 */
router.get('/api/v1/n8n/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'healthy',
    service: 'n8n-integration',
    timestamp: new Date().toISOString()
  });
});

export default router;