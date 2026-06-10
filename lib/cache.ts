/**
 * In-memory TTL cache — Redis-compatible interface for easy future swap.
 * Stores serialized JSON values with per-entry expiration.
 */

interface CacheEntry {
  value: string;
  expiresAt: number; // epoch ms
}

class InMemoryCache {
  private store = new Map<string, CacheEntry>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Periodic cleanup every 2 minutes
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 120_000);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value: JSON.stringify(value),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter((k) => regex.test(k));
  }

  async flush(): Promise<void> {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}

// Singleton — shared across all API route invocations in the same process
const globalForCache = globalThis as unknown as { __cache?: InMemoryCache };
if (!globalForCache.__cache) {
  globalForCache.__cache = new InMemoryCache();
}

export const cache = globalForCache.__cache;

// TTL constants (seconds)
export const TTL = {
  OVERVIEW: 300,        // 5 min
  PERSON: 600,          // 10 min
  MODEL: 600,           // 10 min
  ACCOUNT: 300,         // 5 min
  TIMESERIES: 900,      // 15 min
  IDENTITY: 3600,       // 60 min
  PROVIDER_RAW: 180,    // 3 min
} as const;
