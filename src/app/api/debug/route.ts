/**
 * GET /api/debug - Debug endpoint to see parsed metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeUrl, UrlNormalizationError } from '@/lib/url-normalizer';
import { parseReview, ReviewParseError } from '@/lib/review-parser';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        const normalizedUrl = await normalizeUrl(url);
        const metadata = await parseReview(normalizedUrl);

        // Return metadata without base64 images (too long)
        return NextResponse.json({
            normalizedUrl,
            metadata: {
                ...metadata,
                posterUrl: metadata.posterUrl ?
                    (metadata.posterUrl.startsWith('data:') ? '[BASE64 IMAGE]' : metadata.posterUrl) : null,
                avatarUrl: metadata.avatarUrl ?
                    (metadata.avatarUrl.startsWith('data:') ? '[BASE64 IMAGE]' : metadata.avatarUrl) : null,
            }
        });
    } catch (error) {
        if (error instanceof UrlNormalizationError || error instanceof ReviewParseError) {
            return NextResponse.json({
                error: error.message,
                code: error.code
            }, { status: 400 });
        }
        return NextResponse.json({
            error: 'Internal error',
            details: error instanceof Error ? error.message : 'Unknown'
        }, { status: 500 });
    }
}
