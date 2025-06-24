/**
 * Data Repository
 * Database operations for File and Detection entities
 */

import { prisma } from './database';
import { PIIDetection, DetectionSession } from './detectPII';

// Prisma types
export type FileRecord = {
  id: number;
  filename: string;
  originalName: string | null;
  zipSource: string | null;
  mimeType: string | null;
  size: number | null;
  uploadedAt: Date;
  processedAt: Date | null;
  sessionId: string | null;
  totalFiles: number | null;
};

export type DetectionRecord = {
  id: number;
  titular: string;
  documento: string;
  valor: string;
  arquivo: string;
  timestamp: Date;
  fileId: number;
};

/**
 * Repository class for database operations
 */
export class PIIRepository {
  
  /**
   * Create a new file record
   */
  async createFile(data: {
    filename: string;
    originalName?: string;
    zipSource?: string;
    mimeType?: string;
    size?: number;
    sessionId?: string;
    totalFiles?: number;
  }): Promise<FileRecord> {
    return await prisma.file.create({
      data: {
        filename: data.filename,
        originalName: data.originalName || null,
        zipSource: data.zipSource || null,
        mimeType: data.mimeType || null,
        size: data.size || null,
        sessionId: data.sessionId || null,
        totalFiles: data.totalFiles || null,
      },
    });
  }

  /**
   * Update file processing status
   */
  async markFileAsProcessed(fileId: number): Promise<FileRecord> {
    return await prisma.file.update({
      where: { id: fileId },
      data: { processedAt: new Date() },
    });
  }

  /**
   * Create detection records in batch
   */
  async createDetections(detections: PIIDetection[], fileId: number): Promise<DetectionRecord[]> {
    const detectionsData = detections.map(detection => ({
      titular: detection.titular,
      documento: detection.documento,
      valor: detection.valor,
      arquivo: detection.arquivo,
      timestamp: new Date(detection.timestamp),
      fileId: fileId,
    }));

    await prisma.detection.createMany({
      data: detectionsData,
    });

    // Return the created detections
    return await prisma.detection.findMany({
      where: { fileId: fileId },
      orderBy: { id: 'desc' },
      take: detectionsData.length,
    });
  }

  /**
   * Save complete detection session
   */
  async saveDetectionSession(session: DetectionSession): Promise<{ file: FileRecord; detections: DetectionRecord[] }> {
    // Create file record
    const file = await this.createFile({
      filename: session.zipFile,
      sessionId: session.sessionId,
      totalFiles: session.totalFiles,
      zipSource: session.zipFile,
    });

    // Create detection records
    const detections = session.detections.length > 0 
      ? await this.createDetections(session.detections, file.id)
      : [];

    // Mark file as processed
    await this.markFileAsProcessed(file.id);

    return { file, detections };
  }

  /**
   * Get all detections with optional filtering
   */
  async getDetections(filters?: {
    documento?: string;
    valor?: string;
    titular?: string;
    fileId?: number;
  }): Promise<DetectionRecord[]> {
    const where: any = {};

    if (filters?.documento) {
      where.documento = filters.documento;
    }
    if (filters?.valor) {
      where.valor = { contains: filters.valor, mode: 'insensitive' as const };
    }
    if (filters?.titular) {
      where.titular = { contains: filters.titular, mode: 'insensitive' as const };
    }
    if (filters?.fileId) {
      where.fileId = filters.fileId;
    }

    return await prisma.detection.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Get detections grouped by titular for report
   */
  async getDetectionsGroupedByTitular(filters?: {
    emailDomain?: string;
    cnpj?: string;
  }): Promise<Array<{
    titular: string;
    detections: DetectionRecord[];
    totalDetections: number;
  }>> {
    const whereConditions: any[] = [];

    // OR filtering between domain and CNPJ
    if (filters?.emailDomain && filters?.cnpj) {
      whereConditions.push({
        OR: [
          {
            AND: [
              { documento: 'Email' },
              { valor: { contains: `@${filters.emailDomain}`, mode: 'insensitive' as const } }
            ]
          },
          {
            AND: [
              { documento: 'CNPJ' },
              { valor: { contains: filters.cnpj, mode: 'insensitive' as const } }
            ]
          }
        ]
      });
    } else if (filters?.emailDomain) {
      whereConditions.push({
        AND: [
          { documento: 'Email' },
          { valor: { contains: `@${filters.emailDomain}`, mode: 'insensitive' as const } }
        ]
      });
    } else if (filters?.cnpj) {
      whereConditions.push({
        AND: [
          { documento: 'CNPJ' },
          { valor: { contains: filters.cnpj, mode: 'insensitive' as const } }
        ]
      });
    }

    const where = whereConditions.length > 0 ? { OR: whereConditions } : {};

    const detections = await prisma.detection.findMany({
      where,
      orderBy: [{ titular: 'asc' }, { timestamp: 'desc' }],
    });

    // Group by titular
    const grouped = detections.reduce((acc, detection) => {
      if (!acc[detection.titular]) {
        acc[detection.titular] = [];
      }
      acc[detection.titular]!.push(detection);
      return acc;
    }, {} as Record<string, DetectionRecord[]>);

    return Object.entries(grouped).map(([titular, detections]) => ({
      titular,
      detections,
      totalDetections: detections.length,
    }));
  }

  /**
   * Get all files with optional pagination
   */
  async getFiles(options?: {
    skip?: number;
    take?: number;
    includeDetections?: boolean;
  }): Promise<FileRecord[]> {
    const query: any = {
      skip: options?.skip || 0,
      include: {
        detections: options?.includeDetections || false,
      },
      orderBy: { uploadedAt: 'desc' },
    };

    if (options?.take !== undefined) {
      query.take = options.take;
    }

    return await prisma.file.findMany(query);
  }

  /**
   * Get file by ID
   */
  async getFileById(id: number): Promise<(FileRecord & { detections: DetectionRecord[] }) | null> {
    return await prisma.file.findUnique({
      where: { id },
      include: { detections: true },
    }) as (FileRecord & { detections: DetectionRecord[] }) | null;
  }

  /**
   * Delete file and all associated detections
   */
  async deleteFile(id: number): Promise<void> {
    await prisma.file.delete({
      where: { id },
    });
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    totalFiles: number;
    totalDetections: number;
    detectionsByType: Record<string, number>;
  }> {
    const [totalFiles, totalDetections, detectionsByType] = await Promise.all([
      prisma.file.count(),
      prisma.detection.count(),
      prisma.detection.groupBy({
        by: ['documento'],
        _count: { documento: true },
      }),
    ]);

    const detectionsByTypeMap = detectionsByType.reduce((acc, item) => {
      acc[item.documento] = item._count.documento;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalFiles,
      totalDetections,
      detectionsByType: detectionsByTypeMap,
    };
  }
}

// Export singleton instance
export const piiRepository = new PIIRepository();