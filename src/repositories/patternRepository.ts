/**
 * Pattern Repository
 * Database operations for PII Pattern management
 */

import { prisma } from '../database';
import { PIIPattern, CreatePatternData, UpdatePatternData, validatePattern } from '../models/patterns';

export class PatternRepository {
  
  /**
   * Get all patterns with optional filtering
   */
  async getAllPatterns(filters?: {
    type?: string;
    isActive?: boolean;
    isDefault?: boolean;
  }): Promise<PIIPattern[]> {
    const where: any = {};
    
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.isDefault !== undefined) {
      where.isDefault = filters.isDefault;
    }

    return await prisma.pattern.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { type: 'asc' },
        { name: 'asc' }
      ],
    }) as PIIPattern[];
  }

  /**
   * Get pattern by ID
   */
  async getPatternById(id: number): Promise<PIIPattern | null> {
    return await prisma.pattern.findUnique({
      where: { id },
    }) as PIIPattern | null;
  }

  /**
   * Get active patterns by type
   */
  async getActivePatternsByType(type: string): Promise<PIIPattern[]> {
    return await prisma.pattern.findMany({
      where: {
        type,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    }) as PIIPattern[];
  }

  /**
   * Create new pattern
   */
  async createPattern(data: CreatePatternData): Promise<PIIPattern> {
    // Validate regex pattern
    if (!validatePattern(data.pattern)) {
      throw new Error('Invalid regex pattern');
    }

    // Check if name already exists
    const existingPattern = await prisma.pattern.findFirst({
      where: { name: data.name },
    });

    if (existingPattern) {
      throw new Error('Pattern name already exists');
    }

    return await prisma.pattern.create({
      data: {
        name: data.name,
        pattern: data.pattern,
        type: data.type,
        description: data.description || null,
        isActive: data.isActive ?? true,
        isDefault: false, // Custom patterns are never default
      },
    }) as PIIPattern;
  }

  /**
   * Update existing pattern
   */
  async updatePattern(id: number, data: UpdatePatternData): Promise<PIIPattern> {
    // Check if pattern exists
    const existingPattern = await this.getPatternById(id);
    if (!existingPattern) {
      throw new Error('Pattern not found');
    }

    // Prevent updating default patterns' core properties
    if (existingPattern.isDefault && (data.pattern || data.type)) {
      throw new Error('Cannot modify pattern or type of default patterns');
    }

    // Validate regex pattern if provided
    if (data.pattern && !validatePattern(data.pattern)) {
      throw new Error('Invalid regex pattern');
    }

    // Check if new name already exists (if name is being changed)
    if (data.name && data.name !== existingPattern.name) {
      const nameExists = await prisma.pattern.findFirst({
        where: { name: data.name },
      });

      if (nameExists) {
        throw new Error('Pattern name already exists');
      }
    }

    return await prisma.pattern.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    }) as PIIPattern;
  }

  /**
   * Delete pattern
   */
  async deletePattern(id: number): Promise<void> {
    // Check if pattern exists
    const existingPattern = await this.getPatternById(id);
    if (!existingPattern) {
      throw new Error('Pattern not found');
    }

    // Prevent deleting default patterns
    if (existingPattern.isDefault) {
      throw new Error('Cannot delete default patterns');
    }

    await prisma.pattern.delete({
      where: { id },
    });
  }

  /**
   * Toggle pattern active status
   */
  async togglePatternStatus(id: number): Promise<PIIPattern> {
    const pattern = await this.getPatternById(id);
    if (!pattern) {
      throw new Error('Pattern not found');
    }

    return await this.updatePattern(id, {
      isActive: !pattern.isActive,
    });
  }

  /**
   * Test pattern against sample text
   */
  async testPattern(id: number, testText: string): Promise<{
    pattern: PIIPattern;
    matches: string[];
    matchCount: number;
  }> {
    const pattern = await this.getPatternById(id);
    if (!pattern) {
      throw new Error('Pattern not found');
    }

    try {
      const regex = new RegExp(pattern.pattern, 'g');
      const matches = testText.match(regex) || [];
      
      return {
        pattern,
        matches,
        matchCount: matches.length,
      };
    } catch (error) {
      throw new Error(`Pattern test failed: ${error}`);
    }
  }

  /**
   * Get patterns statistics
   */
  async getPatternStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    default: number;
    custom: number;
    byType: Record<string, number>;
  }> {
    const [
      total,
      active,
      inactive,
      defaultPatterns,
      custom,
      byType
    ] = await Promise.all([
      prisma.pattern.count(),
      prisma.pattern.count({ where: { isActive: true } }),
      prisma.pattern.count({ where: { isActive: false } }),
      prisma.pattern.count({ where: { isDefault: true } }),
      prisma.pattern.count({ where: { isDefault: false } }),
      prisma.pattern.groupBy({
        by: ['type'],
        _count: { type: true },
      }),
    ]);

    const byTypeMap = byType.reduce((acc, item) => {
      acc[item.type] = item._count.type;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      active,
      inactive,
      default: defaultPatterns,
      custom,
      byType: byTypeMap,
    };
  }
}

// Export singleton instance
export const patternRepository = new PatternRepository();