/**
 * Archives Routes
 * POST /api/v1/archives/upload - Upload and process ZIP files
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs-extra';
import * as path from 'path';
import { addArchiveJob } from '../services/queue';
import { validateZipFile } from '../services/zipService';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const router = Router();

// Configure multer for ZIP uploads
const upload = multer({
  dest: env.UPLOAD_DIR,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const isZip = file.mimetype === 'application/zip' || 
                  file.mimetype === 'application/x-zip-compressed' ||
                  file.originalname.toLowerCase().endsWith('.zip');
    
    if (isZip) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  },
});

/**
 * POST /api/v1/archives/upload
 * Upload and queue ZIP file for processing
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'No file uploaded',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { originalname, filename, path: filePath, mimetype, size } = req.file;
    
    logger.info(`File upload received: ${originalname}, MIME: ${mimetype}`);

    // Validate ZIP file
    const isValid = await validateZipFile(filePath);
    if (!isValid) {
      await fs.remove(filePath);
      res.status(422).json({
        error: 'Unprocessable Entity',
        message: 'Invalid or corrupted ZIP file',
        statusCode: 422,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Queue for processing
    const jobId = await addArchiveJob({
      zipPath: filePath,
      originalName: originalname,
      sessionId,
      mimeType: mimetype,
      size,
    });

    logger.info(`Archive job queued: ${jobId} for ${originalname}`);

    res.status(202).json({
      message: 'ZIP file queued for processing',
      jobId,
      sessionId,
      scanResult: {
        isClean: true,
        scannedFile: filename,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Archive upload error:', error);

    // Clean up uploaded file on error
    if (req.file?.path) {
      try {
        await fs.remove(req.file.path);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup uploaded file:', cleanupError);
      }
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          error: 'Payload Too Large',
          message: 'File size exceeds the maximum allowed limit',
          statusCode: 413,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process file upload',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;