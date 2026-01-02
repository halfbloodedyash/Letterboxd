/**
 * POST /api/render-from-metadata - Render a card using cached metadata
 * Uses session ID to retrieve cached metadata - no re-fetching of posters!
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCardHtml } from '@/lib/card-renderer';
import { renderToImage } from '@/lib/playwright-renderer';
import { getCachedMetadata } from '@/lib/metadata-cache';
import { SizePreset, FontSize, CardStyle, ApiError } from '@/types/review';

interface RenderRequest {
    sessionId: string;
    preset: SizePreset;
    fontSize: FontSize;
    cardStyle: CardStyle;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as RenderRequest;
        const { sessionId, preset = 'square', fontSize = 100, cardStyle = 'classic' } = body;

        if (!sessionId) {
            const error: ApiError = {
                error: 'Session ID is required',
                code: 'MISSING_SESSION',
            };
            return NextResponse.json(error, { status: 400 });
        }

        // Get cached metadata (includes base64 poster - no re-fetch!)
        const metadata = getCachedMetadata(sessionId);

        if (!metadata) {
            const error: ApiError = {
                error: 'Session expired - please generate again',
                code: 'SESSION_EXPIRED',
            };
            return NextResponse.json(error, { status: 404 });
        }

        console.log(`Rendering with cached metadata: ${metadata.filmTitle} (${preset}, ${cardStyle}, ${fontSize})`);

        // Generate card HTML with provided options
        const cardHtml = generateCardHtml(metadata, preset, fontSize, cardStyle);

        // Render to image (this is the only slow part now)
        const imageBuffer = await renderToImage(cardHtml, preset);

        // Return PNG
        return new NextResponse(new Uint8Array(imageBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'no-cache',
            },
        });

    } catch (error) {
        console.error('Render error:', error);
        return NextResponse.json({
            error: 'Failed to render image',
            code: 'RENDER_ERROR',
            details: error instanceof Error ? error.message : 'Unknown error',
        } as ApiError, { status: 500 });
    }
}
