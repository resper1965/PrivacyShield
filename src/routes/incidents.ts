/**
 * Incidents Routes
 * Cybersecurity incident management with LGPD compliance
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/incidents
 * List incidents with filtering and pagination
 */
router.get('/incidents', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      organizationId, 
      type, 
      riskLevel, 
      assigneeId,
      isDraft,
      search
    } = req.query;

    const where: any = {};
    
    if (organizationId) where.organizationId = organizationId;
    if (type) where.type = type;
    if (riskLevel) where.riskLevel = riskLevel;
    if (assigneeId) where.assigneeId = assigneeId;
    if (isDraft !== undefined) where.isDraft = isDraft === 'true';
    
    if (search) {
      where.OR = [
        { description: { contains: search as string, mode: 'insensitive' } },
        { type: { contains: search as string, mode: 'insensitive' } },
        { semanticContext: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        include: {
          organization: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.incident.count({ where })
    ]);

    res.status(200).json({
      incidents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/v1/incidents/:id
 * Get incident details
 */
router.get('/incidents/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } }
      }
    });

    if (!incident) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    res.status(200).json(incident);
  } catch (error) {
    logger.error('Error fetching incident:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/v1/incidents
 * Create new incident
 */
router.post('/incidents',
  body('organizationId').isUUID().withMessage('Organization ID must be a valid UUID'),
  body('date').isISO8601().withMessage('Date must be in ISO8601 format'),
  body('type').isString().notEmpty().withMessage('Type is required'),
  body('description').isString().isLength({ min: 50 }).withMessage('Description must be at least 50 characters'),
  body('assigneeId').optional().isUUID().withMessage('Assignee ID must be a valid UUID'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const {
        organizationId,
        date,
        type,
        description,
        attachments = [],
        assigneeId,
        semanticContext,
        lgpdArticles = [],
        dataCategories = [],
        numSubjects,
        riskLevel,
        immediateMeasures,
        actionPlan,
        isDraft = false,
      } = req.body;

      // Validate that organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      });

      if (!organization) {
        res.status(400).json({ error: 'Organization not found' });
        return;
      }

      // Validate assignee if provided
      if (assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: assigneeId }
        });

        if (!assignee) {
          res.status(400).json({ error: 'Assignee not found' });
          return;
        }
      }

      // Validate date is not in the future
      const incidentDate = new Date(date);
      if (incidentDate > new Date()) {
        res.status(400).json({ error: 'Incident date cannot be in the future' });
        return;
      }

      const incident = await prisma.incident.create({
        data: {
          organizationId,
          date: incidentDate,
          type,
          description,
          attachments,
          assigneeId,
          semanticContext,
          lgpdArticles,
          dataCategories,
          numSubjects,
          riskLevel,
          immediateMeasures,
          actionPlan,
          isDraft,
        },
        include: {
          organization: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } }
        }
      });

      logger.info(`Incident created: ${incident.id} for organization ${organization.name}`);
      res.status(201).json(incident);
    } catch (error) {
      logger.error('Error creating incident:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * PUT /api/v1/incidents/:id
 * Update incident
 */
router.put('/incidents/:id',
  body('date').optional().isISO8601().withMessage('Date must be in ISO8601 format'),
  body('type').optional().isString().notEmpty().withMessage('Type cannot be empty'),
  body('description').optional().isString().isLength({ min: 50 }).withMessage('Description must be at least 50 characters'),
  body('assigneeId').optional().isUUID().withMessage('Assignee ID must be a valid UUID'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const updateData = { ...req.body };

      // Remove organizationId from update data as it shouldn't be changed
      delete updateData.organizationId;

      // Validate date if provided
      if (updateData.date) {
        const incidentDate = new Date(updateData.date);
        if (incidentDate > new Date()) {
          res.status(400).json({ error: 'Incident date cannot be in the future' });
          return;
        }
        updateData.date = incidentDate;
      }

      const incident = await prisma.incident.update({
        where: { id },
        data: updateData,
        include: {
          organization: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } }
        }
      });

      logger.info(`Incident updated: ${incident.id}`);
      res.status(200).json(incident);
    } catch (error) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }
      logger.error('Error updating incident:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * DELETE /api/v1/incidents/:id
 * Delete incident
 */
router.delete('/incidents/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    await prisma.incident.delete({
      where: { id }
    });

    logger.info(`Incident deleted: ${id}`);
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }
    logger.error('Error deleting incident:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/v1/organizations
 * List organizations for dropdown
 */
router.get('/organizations', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    
    const where = search 
      ? { name: { contains: search as string, mode: 'insensitive' } }
      : {};

    const organizations = await prisma.organization.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 50
    });

    res.status(200).json(organizations);
  } catch (error) {
    logger.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/v1/organizations
 * Create organization
 */
router.post('/organizations',
  body('name').isString().notEmpty().withMessage('Name is required'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name } = req.body;

      const organization = await prisma.organization.create({
        data: { name }
      });

      logger.info(`Organization created: ${organization.name}`);
      res.status(201).json(organization);
    } catch (error) {
      if (error.code === 'P2002') {
        res.status(400).json({ error: 'Organization name already exists' });
        return;
      }
      logger.error('Error creating organization:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * GET /api/v1/users
 * List users for assignee dropdown
 */
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    
    const where = search 
      ? { 
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } }
          ]
        }
      : {};

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
      take: 50
    });

    res.status(200).json(users);
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/v1/users
 * Create user
 */
router.post('/users',
  body('name').isString().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, email } = req.body;

      const user = await prisma.user.create({
        data: { name, email }
      });

      logger.info(`User created: ${user.name} (${user.email})`);
      res.status(201).json(user);
    } catch (error) {
      if (error.code === 'P2002') {
        res.status(400).json({ error: 'Email already exists' });
        return;
      }
      logger.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * GET /api/v1/incidents/stats
 * Get incident statistics
 */
router.get('/incidents/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalIncidents,
      draftIncidents,
      incidentsByType,
      incidentsByRisk,
      recentIncidents
    ] = await Promise.all([
      prisma.incident.count(),
      prisma.incident.count({ where: { isDraft: true } }),
      prisma.incident.groupBy({
        by: ['type'],
        _count: { type: true },
        orderBy: { _count: { type: 'desc' } }
      }),
      prisma.incident.groupBy({
        by: ['riskLevel'],
        _count: { riskLevel: true },
        where: { riskLevel: { not: null } }
      }),
      prisma.incident.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);

    const stats = {
      totalIncidents,
      draftIncidents,
      publishedIncidents: totalIncidents - draftIncidents,
      recentIncidents,
      byType: incidentsByType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {} as Record<string, number>),
      byRiskLevel: incidentsByRisk.reduce((acc, item) => {
        acc[item.riskLevel!] = item._count.riskLevel;
        return acc;
      }, {} as Record<string, number>)
    };

    res.status(200).json(stats);
  } catch (error) {
    logger.error('Error fetching incident stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;