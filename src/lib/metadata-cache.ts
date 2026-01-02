/**
 * Metadata Cache - Server-side cache for review metadata
 * Stores metadata so we don't re-fetch posters on style changes
 */

import { ReviewMetadata } from '@/types/review';

interface CacheEntry {
    metadata: ReviewMetadata;
    timestamp: number;
}

// Simple in-memory cache
const metadataCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Store metadata in cache
 */
export function cacheMetadata(url: string, metadata: ReviewMetadata): string {
    // Generate a unique session ID for this metadata
    const sessionId = generateSessionId();

    // Clean old entries
    cleanOldEntries();

    // Store the metadata
    metadataCache.set(sessionId, {
        metadata,
        timestamp: Date.now(),
    });

    console.log(`Cached metadata for session ${sessionId}, total cached: ${metadataCache.size}`);

    return sessionId;
}

/**
 * Get metadata from cache
 */
export function getCachedMetadata(sessionId: string): ReviewMetadata | null {
    const entry = metadataCache.get(sessionId);

    if (!entry) {
        return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        metadataCache.delete(sessionId);
        return null;
    }

    return entry.metadata;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Clean expired entries
 */
function cleanOldEntries(): void {
    const now = Date.now();
    for (const [key, entry] of metadataCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL) {
            metadataCache.delete(key);
        }
    }
}
