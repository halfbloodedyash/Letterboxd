/**
 * In-memory cache with TTL and LRU eviction
 */

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
    lastAccessed: number;
}

const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES = 100;

class Cache<T> {
    private store = new Map<string, CacheEntry<T>>();
    private ttl: number;
    private maxEntries: number;

    constructor(ttl = DEFAULT_TTL, maxEntries = MAX_ENTRIES) {
        this.ttl = ttl;
        this.maxEntries = maxEntries;
    }

    /**
     * Gets a value from cache
     */
    get(key: string): T | undefined {
        const entry = this.store.get(key);

        if (!entry) {
            return undefined;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }

        // Update last accessed time (LRU)
        entry.lastAccessed = Date.now();
        return entry.value;
    }

    /**
     * Sets a value in cache
     */
    set(key: string, value: T): void {
        // Evict if at capacity
        if (this.store.size >= this.maxEntries && !this.store.has(key)) {
            this.evictLRU();
        }

        this.store.set(key, {
            value,
            expiresAt: Date.now() + this.ttl,
            lastAccessed: Date.now(),
        });
    }

    /**
     * Evicts the least recently used entry
     */
    private evictLRU(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.store) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.store.delete(oldestKey);
        }
    }

    /**
     * Clears expired entries
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
            }
        }
    }

    /**
     * Clears all entries
     */
    clear(): void {
        this.store.clear();
    }

    /**
     * Returns the number of entries
     */
    get size(): number {
        return this.store.size;
    }
}

// Singleton instances for different cache types
export const metadataCache = new Cache<unknown>(DEFAULT_TTL, MAX_ENTRIES);
export const imageCache = new Cache<Buffer>(DEFAULT_TTL, 50); // Fewer images due to size

/**
 * Generates a cache key for render requests
 */
export function generateCacheKey(url: string, preset: string, templateVersion = 'v1'): string {
    return `${url}::${preset}::${templateVersion}`;
}

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        metadataCache.cleanup();
        imageCache.cleanup();
    }, 5 * 60 * 1000);
}
