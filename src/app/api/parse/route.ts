/**
 * POST /api/parse - Parse Letterboxd review metadata (server-side parsing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeUrl, UrlNormalizationError } from '@/lib/url-normalizer';
import { parseReview, ReviewParseError } from '@/lib/review-parser';
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

        // Normalize URL
        const normalizedUrl = await normalizeUrl(url);

        // Parse review (server-side with cheerio)
        const metadata = await parseReview(normalizedUrl);

        // Return metadata as JSON
        return NextResponse.json(metadata, {
            status: 200,
            headers: {
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('Parse error:', error);

        if (error instanceof UrlNormalizationError) {
            const apiError: ApiError = {
                error: error.message,
                code: error.code,
            };
            return NextResponse.json(apiError, { status: 400 });
        }

        if (error instanceof ReviewParseError) {
            const apiError: ApiError = {
                error: error.message,
                code: error.code,
            };
            return NextResponse.json(apiError, {
                status: error.code === 'NOT_FOUND' ? 404 : 500
            });
        }

        const apiError: ApiError = {
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
        };
        return NextResponse.json(apiError, { status: 500 });
    }
}
