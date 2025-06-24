/**
 * Mock Redis for Development
 * In-memory Redis implementation for BullMQ when Redis server is not available
 */

export class MockRedis {
  private data: Map<string, any> = new Map();
  private subscribers: Map<string, Function[]> = new Map();

  async ping(): Promise<string> {
    return 'PONG';
  }

  async set(key: string, value: any): Promise<string> {
    this.data.set(key, value);
    return 'OK';
  }

  async get(key: string): Promise<any> {
    return this.data.get(key);
  }

  async del(key: string): Promise<number> {
    const existed = this.data.has(key);
    this.data.delete(key);
    return existed ? 1 : 0;
  }

  async lpush(key: string, ...values: any[]): Promise<number> {
    const list = this.data.get(key) || [];
    list.unshift(...values);
    this.data.set(key, list);
    return list.length;
  }

  async rpop(key: string): Promise<any> {
    const list = this.data.get(key) || [];
    const value = list.pop();
    this.data.set(key, list);
    return value;
  }

  async llen(key: string): Promise<number> {
    const list = this.data.get(key) || [];
    return list.length;
  }

  on(event: string, callback: Function): void {
    // Mock event handling
    if (event === 'connect') {
      setTimeout(() => callback(), 100);
    }
  }

  async disconnect(): Promise<void> {
    this.data.clear();
    this.subscribers.clear();
  }
}

// Create mock Redis instance for development
export const mockRedis = new MockRedis();