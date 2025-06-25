/**
 * FAISS Vector Index Manager
 * Singleton for managing vector similarity search using FAISS
 */

import { IndexFlatL2 } from 'faiss-node';
import { PrismaClient } from '@prisma/client';

interface VectorEntry {
  id: number;
  fileId: string;
  vector: number[];
  text: string;
}

interface SearchResult {
  id: number;
  fileId: string;
  text: string;
  distance: number;
  similarity: number;
}

export class FaissManager {
  private static instance: FaissManager | null = null;
  private index: IndexFlatL2 | null = null;
  private vectors: VectorEntry[] = [];
  private prisma: PrismaClient;
  private isInitialized = false;
  private readonly dimension = 1536; // OpenAI text-embedding-3-small dimension

  private constructor() {
    this.prisma = new PrismaClient();
  }

  public static getInstance(): FaissManager {
    if (!FaissManager.instance) {
      FaissManager.instance = new FaissManager();
    }
    return FaissManager.instance;
  }

  /**
   * Initialize FAISS index and load existing embeddings from database
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      console.log('[FAISS] Manager already initialized');
      return;
    }

    try {
      console.log('[FAISS] Initializing FAISS manager...');

      // Create FAISS index with L2 distance
      this.index = new IndexFlatL2(this.dimension);
      console.log(`[FAISS] Created IndexFlatL2 with dimension ${this.dimension}`);

      // Load existing embeddings from database
      const embeddings = await this.prisma.textEmbedding.findMany({
        orderBy: { id: 'asc' }
      });

      console.log(`[FAISS] Loading ${embeddings.length} embeddings from database`);

      // Add vectors to index and store metadata
      for (const embedding of embeddings) {
        const vectorEntry: VectorEntry = {
          id: embedding.id,
          fileId: `embedding_${embedding.id}`,
          vector: embedding.vector,
          text: embedding.text
        };

        this.vectors.push(vectorEntry);
        
        // Add vector to FAISS index - convert to regular array
        this.index.add(embedding.vector);
      }

      this.isInitialized = true;
      console.log(`[FAISS] Initialization complete. Index contains ${this.index.ntotal()} vectors`);

    } catch (error) {
      console.error('[FAISS] Initialization failed:', error);
      throw new Error(`FAISS initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add or update vector in the index
   */
  public async upsert(fileId: string, vector: number[], text?: string): Promise<void> {
    if (!this.isInitialized || !this.index) {
      throw new Error('FAISS manager not initialized. Call init() first.');
    }

    try {
      if (vector.length !== this.dimension) {
        throw new Error(`Vector dimension mismatch. Expected ${this.dimension}, got ${vector.length}`);
      }

      // Add new vector (simplified - no updates for now)
      console.log(`[FAISS] Adding new vector for fileId: ${fileId}`);
      
      const vectorEntry: VectorEntry = {
        id: this.vectors.length + 1,
        fileId,
        vector,
        text: text || `File content for ${fileId}`
      };

      this.vectors.push(vectorEntry);
      this.index.add(vector);

      console.log(`[FAISS] Vector upserted. Total vectors: ${this.index.ntotal()}`);

    } catch (error) {
      console.error(`[FAISS] Upsert failed for fileId ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Search for similar vectors
   */
  public async search(queryVector: number[], k: number = 5): Promise<SearchResult[]> {
    if (!this.isInitialized || !this.index) {
      throw new Error('FAISS manager not initialized. Call init() first.');
    }

    try {
      if (queryVector.length !== this.dimension) {
        throw new Error(`Query vector dimension mismatch. Expected ${this.dimension}, got ${queryVector.length}`);
      }

      if (k <= 0) {
        throw new Error('k must be greater than 0');
      }

      const actualK = Math.min(k, this.index.ntotal());
      if (actualK === 0) {
        console.log('[FAISS] No vectors in index, returning empty results');
        return [];
      }

      console.log(`[FAISS] Searching for ${actualK} similar vectors`);

      // Perform search
      const searchResult = this.index.search(queryVector, actualK);
      
      // Convert results to SearchResult format
      const results: SearchResult[] = [];
      
      if (searchResult && searchResult.labels && searchResult.distances) {
        for (let i = 0; i < searchResult.labels.length; i++) {
          const vectorIndex = searchResult.labels[i];
          const distance = searchResult.distances[i];
          
          if (typeof vectorIndex === 'number' && typeof distance === 'number' && 
              vectorIndex >= 0 && vectorIndex < this.vectors.length) {
            const vectorEntry = this.vectors[vectorIndex];
            
            if (vectorEntry) {
              // Convert L2 distance to similarity score (0-1, higher = more similar)
              const similarity = 1 / (1 + distance);
              
              results.push({
                id: vectorEntry.id,
                fileId: vectorEntry.fileId,
                text: vectorEntry.text,
                distance,
                similarity
              });
            }
          }
        }
      }

      console.log(`[FAISS] Found ${results.length} similar vectors`);
      return results.sort((a, b) => b.similarity - a.similarity);

    } catch (error) {
      console.error('[FAISS] Search failed:', error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  public getStats(): { vectorCount: number; dimension: number; isInitialized: boolean } {
    return {
      vectorCount: this.index ? this.index.ntotal() : 0,
      dimension: this.dimension,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Rebuild index from database (useful for periodic maintenance)
   */
  public async rebuild(): Promise<void> {
    console.log('[FAISS] Rebuilding index from database...');
    
    this.isInitialized = false;
    this.index = null;
    this.vectors = [];
    
    await this.init();
  }

  /**
   * Close connections and cleanup
   */
  public async close(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
    
    this.isInitialized = false;
    this.index = null;
    this.vectors = [];
    
    console.log('[FAISS] Manager closed');
  }
}

/**
 * Get singleton FAISS manager instance
 */
export function getFaissManager(): FaissManager {
  return FaissManager.getInstance();
}