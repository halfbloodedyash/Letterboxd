/**
 * POST /api/metadata - Fetch metadata from a Letterboxd URL
 * Returns a session ID that can be used for fast re-renders
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeUrl, UrlNormalizationError } from '@/lib/url-normalizer';
import { parseReview, ReviewParseError } from '@/lib/review-parser';
import { cacheMetadata } from '@/lib/metadata-cache';
import { ApiError } from '@/types/review';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url) {
            const error: ApiError = {
                error: 'URL is required',
                code: 'MISSING_URL',
            };
            return NextResponse.json(error, { status: 400 });
        }

        console.log('Fetching metadata for:', url);

        // Normalize URL
        const normalizedUrl = await normalizeUrl(url);

        // Parse review and get metadata (includes fetching poster as base64)
        const metadata = await parseReview(normalizedUrl);

        // Cache the metadata on the server and get a session ID
        const sessionId = cacheMetadata(normalizedUrl, metadata);

        console.log('Metadata cached with session:', sessionId);

        // Return session ID and basic info (NOT the full metadata with base64 images)
        return NextResponse.json({
            success: true,
            sessionId,
            filmTitle: metadata.filmTitle,
            filmYear: metadata.filmYear,
            authorUsername: metadata.authorUsername,
            hasPoster: !!metadata.posterUrl,
        });

    } catch (error) {
        if (error instanceof UrlNormalizationError) {
            return NextResponse.json({
                error: error.message,
                code: error.code,
            } as ApiError, { status: 400 });
        }

        if (error instanceof ReviewParseError) {
            return NextResponse.json({
                error: error.message,
                code: error.code,
            } as ApiError, { status: 400 });
        }

        console.error('Metadata fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch review metadata',
            code: 'INTERNAL_ERROR',
        } as ApiError, { status: 500 });
    }
}
