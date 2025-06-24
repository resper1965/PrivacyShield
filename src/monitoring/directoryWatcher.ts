/**
 * Directory Watcher System
 * Monitors configured directories for new files and processes them automatically
 */

import * as chokidar from 'chokidar';
import * as cron from 'node-cron';
import * as fs from 'fs-extra';
import * as path from 'path';
import { processFileWithAI } from '../processor';
import { saveDetectionSession } from '../detectPII';

export interface WatchedDirectory {
  id: string;
  path: string;
  name: string;
  isActive: boolean;
  cronPattern: string; // e.g., '0 */6 * * *' for every 6 hours
  filePatterns: string[]; // e.g., ['*.txt', '*.docx', '*.pdf']
  processSubdirectories: boolean;
  createdAt: Date;
  lastScan: Date | null;
  totalFilesProcessed: number;
  totalDetections: number;
}

export interface ProcessingResult {
  directoryId: string;
  scanTimestamp: Date;
  filesProcessed: number;
  detectionsFound: number;
  highRiskFiles: string[];
  processingTime: number;
  errors: string[];
}

class DirectoryMonitor {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private watchedDirectories: Map<string, WatchedDirectory> = new Map();
  private processing = false;

  constructor() {
    this.loadConfiguration();
  }

  /**
   * Add a new directory to monitor
   */
  async addWatchedDirectory(config: Omit<WatchedDirectory, 'id' | 'createdAt' | 'lastScan' | 'totalFilesProcessed' | 'totalDetections'>): Promise<string> {
    const id = `dir_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const watchedDir: WatchedDirectory = {
      ...config,
      id,
      createdAt: new Date(),
      lastScan: null,
      totalFilesProcessed: 0,
      totalDetections: 0
    };

    // Validate directory exists
    if (!(await fs.pathExists(config.path))) {
      throw new Error(`Directory does not exist: ${config.path}`);
    }

    // Validate cron pattern
    if (!cron.validate(config.cronPattern)) {
      throw new Error(`Invalid cron pattern: ${config.cronPattern}`);
    }

    this.watchedDirectories.set(id, watchedDir);
    
    if (config.isActive) {
      await this.startWatching(id);
    }

    await this.saveConfiguration();
    console.log(`📁 Added watched directory: ${config.name} (${config.path})`);
    
    return id;
  }

  /**
   * Start watching a directory
   */
  async startWatching(directoryId: string): Promise<void> {
    const config = this.watchedDirectories.get(directoryId);
    if (!config) {
      throw new Error(`Directory not found: ${directoryId}`);
    }

    // Setup file watcher
    const watchPath = config.processSubdirectories ? config.path : `${config.path}/*`;
    const watcher = chokidar.watch(watchPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('add', async (filePath) => {
      if (this.shouldProcessFile(filePath, config)) {
        console.log(`🔍 New file detected: ${filePath}`);
        await this.processFile(filePath, directoryId);
      }
    });

    watcher.on('error', (error) => {
      console.error(`❌ Watcher error for ${config.name}:`, error);
    });

    this.watchers.set(directoryId, watcher);

    // Setup cron job for scheduled scans
    const cronJob = cron.schedule(config.cronPattern, async () => {
      console.log(`⏰ Scheduled scan starting for: ${config.name}`);
      await this.performScheduledScan(directoryId);
    }, {
      delay: 0
    });

    cronJob.start();
    this.cronJobs.set(directoryId, cronJob);

    console.log(`👀 Started watching: ${config.name} (${config.path})`);
    console.log(`⏰ Cron schedule: ${config.cronPattern}`);
  }

  /**
   * Stop watching a directory
   */
  async stopWatching(directoryId: string): Promise<void> {
    const watcher = this.watchers.get(directoryId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(directoryId);
    }

    const cronJob = this.cronJobs.get(directoryId);
    if (cronJob) {
      cronJob.stop();
      this.cronJobs.delete(directoryId);
    }

    const config = this.watchedDirectories.get(directoryId);
    if (config) {
      console.log(`🛑 Stopped watching: ${config.name}`);
    }
  }

  /**
   * Remove a watched directory
   */
  async removeWatchedDirectory(directoryId: string): Promise<void> {
    await this.stopWatching(directoryId);
    this.watchedDirectories.delete(directoryId);
    await this.saveConfiguration();
    console.log(`🗑️ Removed watched directory: ${directoryId}`);
  }

  /**
   * Update directory configuration
   */
  async updateWatchedDirectory(directoryId: string, updates: Partial<WatchedDirectory>): Promise<void> {
    const config = this.watchedDirectories.get(directoryId);
    if (!config) {
      throw new Error(`Directory not found: ${directoryId}`);
    }

    const wasActive = config.isActive;
    Object.assign(config, updates);

    // Restart watching if configuration changed
    if (wasActive) {
      await this.stopWatching(directoryId);
    }
    
    if (config.isActive) {
      await this.startWatching(directoryId);
    }

    await this.saveConfiguration();
    console.log(`📝 Updated watched directory: ${config.name}`);
  }

  /**
   * Perform scheduled scan of directory
   */
  private async performScheduledScan(directoryId: string): Promise<ProcessingResult> {
    if (this.processing) {
      console.log(`⚠️ Scan already in progress, skipping scheduled scan for ${directoryId}`);
      return {
        directoryId,
        scanTimestamp: new Date(),
        filesProcessed: 0,
        detectionsFound: 0,
        highRiskFiles: [],
        processingTime: 0,
        errors: ['Scan already in progress']
      };
    }

    this.processing = true;
    const startTime = Date.now();
    const config = this.watchedDirectories.get(directoryId);
    
    if (!config) {
      this.processing = false;
      throw new Error(`Directory not found: ${directoryId}`);
    }

    const result: ProcessingResult = {
      directoryId,
      scanTimestamp: new Date(),
      filesProcessed: 0,
      detectionsFound: 0,
      highRiskFiles: [],
      processingTime: 0,
      errors: []
    };

    try {
      const files = await this.getFilesToProcess(config);
      
      for (const filePath of files) {
        try {
          const fileResult = await this.processFile(filePath, directoryId);
          result.filesProcessed++;
          result.detectionsFound += fileResult.detectionsFound;
          
          if (fileResult.riskLevel === 'high' || fileResult.riskLevel === 'critical') {
            result.highRiskFiles.push(filePath);
          }
        } catch (error) {
          console.error(`❌ Failed to process file: ${filePath}`, error);
          result.errors.push(`Failed to process ${filePath}: ${error}`);
        }
      }

      // Update statistics
      config.lastScan = new Date();
      config.totalFilesProcessed += result.filesProcessed;
      config.totalDetections += result.detectionsFound;
      
      result.processingTime = Date.now() - startTime;
      
      console.log(`✅ Scheduled scan completed for ${config.name}:`);
      console.log(`   Files processed: ${result.filesProcessed}`);
      console.log(`   Detections found: ${result.detectionsFound}`);
      console.log(`   High risk files: ${result.highRiskFiles.length}`);
      console.log(`   Processing time: ${result.processingTime}ms`);

    } catch (error) {
      console.error(`❌ Scheduled scan failed for ${config.name}:`, error);
      result.errors.push(`Scan failed: ${error}`);
    } finally {
      this.processing = false;
      await this.saveConfiguration();
    }

    return result;
  }

  /**
   * Process a single file
   */
  private async processFile(filePath: string, directoryId: string): Promise<{
    detectionsFound: number;
    riskLevel: string;
  }> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const filename = path.basename(filePath);
      
      const processingResult = await processFileWithAI(content, filename, `watched_dir_${directoryId}`);
      
      if (processingResult.detections.length > 0) {
        // Create detection session for this file
        const sessionId = `watcher_${directoryId}_${Date.now()}`;
        await saveDetectionSession({
          sessionId,
          timestamp: new Date().toISOString(),
          zipFile: `Directory: ${filePath}`,
          totalFiles: 1,
          totalDetections: processingResult.detections.length,
          detections: processingResult.detections.map(d => ({
            titular: d.titular,
            documento: d.documento,
            valor: d.valor,
            arquivo: filename,
            timestamp: d.timestamp,
            zipSource: `watched_dir_${directoryId}`
          }))
        });
      }

      return {
        detectionsFound: processingResult.detections.length,
        riskLevel: processingResult.fileRiskScore.overallRiskLevel
      };

    } catch (error) {
      console.error(`❌ Failed to process file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Check if file should be processed based on patterns
   */
  private shouldProcessFile(filePath: string, config: WatchedDirectory): boolean {
    const filename = path.basename(filePath);
    
    // Check file patterns
    if (config.filePatterns.length > 0) {
      const matches = config.filePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filename);
      });
      if (!matches) return false;
    }

    // Check if it's a text file we can process
    const textExtensions = ['.txt', '.csv', '.json', '.xml', '.log', '.md'];
    const ext = path.extname(filePath).toLowerCase();
    
    return textExtensions.includes(ext);
  }

  /**
   * Get all files to process in a directory
   */
  private async getFilesToProcess(config: WatchedDirectory): Promise<string[]> {
    const files: string[] = [];
    
    const processDirectory = async (dirPath: string) => {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory() && config.processSubdirectories) {
          await processDirectory(fullPath);
        } else if (item.isFile() && this.shouldProcessFile(fullPath, config)) {
          files.push(fullPath);
        }
      }
    };

    await processDirectory(config.path);
    return files;
  }

  /**
   * Get all watched directories
   */
  getWatchedDirectories(): WatchedDirectory[] {
    return Array.from(this.watchedDirectories.values());
  }

  /**
   * Get watched directory by ID
   */
  getWatchedDirectory(id: string): WatchedDirectory | undefined {
    return this.watchedDirectories.get(id);
  }

  /**
   * Load configuration from file
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const configPath = path.join(process.cwd(), 'watched_directories.json');
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        
        for (const dir of config.directories || []) {
          this.watchedDirectories.set(dir.id, {
            ...dir,
            createdAt: new Date(dir.createdAt),
            lastScan: dir.lastScan ? new Date(dir.lastScan) : null
          });
          
          if (dir.isActive) {
            await this.startWatching(dir.id);
          }
        }
        
        console.log(`📁 Loaded ${this.watchedDirectories.size} watched directories`);
      }
    } catch (error) {
      console.error('❌ Failed to load directory configuration:', error);
    }
  }

  /**
   * Save configuration to file
   */
  private async saveConfiguration(): Promise<void> {
    try {
      const configPath = path.join(process.cwd(), 'watched_directories.json');
      const config = {
        directories: Array.from(this.watchedDirectories.values())
      };
      
      await fs.writeJson(configPath, config, { spaces: 2 });
    } catch (error) {
      console.error('❌ Failed to save directory configuration:', error);
    }
  }

  /**
   * Stop all watchers and cron jobs
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down directory monitor...');
    
    for (const [id] of this.watchedDirectories) {
      await this.stopWatching(id);
    }
    
    console.log('✅ Directory monitor shutdown complete');
  }
}

export const directoryMonitor = new DirectoryMonitor();

// Graceful shutdown
process.on('SIGINT', async () => {
  await directoryMonitor.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await directoryMonitor.shutdown();
  process.exit(0);
});