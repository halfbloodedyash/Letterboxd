/**
 * POST /api/render - Render a Letterboxd review to PNG
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeUrl, UrlNormalizationError } from '@/lib/url-normalizer';
import { parseReview, ReviewParseError } from '@/lib/review-parser';
import { generateCardHtml } from '@/lib/card-renderer';
import { renderToImage, RenderError } from '@/lib/playwright-renderer';
import { imageCache, generateCacheKey } from '@/lib/cache';
import { RenderRequest, SizePreset, FontSize, CardStyle, ApiError } from '@/types/review';

// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = requestCounts.get(ip);

    if (!record || now > record.resetAt) {
        requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
        return true;
    }

    if (record.count >= RATE_LIMIT) {
        return false;
    }

    record.count++;
    return true;
}

function getClientIp(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';
}

export async function POST(request: NextRequest) {
    // Proxy to Render if RENDER_API_URL is configured (for Vercel deployment)
    const renderApiUrl = process.env.RENDER_API_URL;
    if (renderApiUrl) {
        try {
            const body = await request.json();
            const proxyResponse = await fetch(`${renderApiUrl}/api/render`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Forward client IP for rate limiting on Render
                    'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
                    'X-Real-IP': request.headers.get('x-real-ip') || '',
                },
                body: JSON.stringify(body),
            });

            // Forward the response from Render
            const responseHeaders = new Headers();
            responseHeaders.set('Content-Type', proxyResponse.headers.get('Content-Type') || 'application/json');
            if (proxyResponse.headers.get('Cache-Control')) {
                responseHeaders.set('Cache-Control', proxyResponse.headers.get('Cache-Control')!);
            }
            responseHeaders.set('X-Proxy', 'vercel-to-render');

            if (!proxyResponse.ok) {
                const errorData = await proxyResponse.json();
                return NextResponse.json(errorData, {
                    status: proxyResponse.status,
                    headers: responseHeaders
                });
            }

            const imageBuffer = await proxyResponse.arrayBuffer();
            return new NextResponse(imageBuffer, {
                status: 200,
                headers: responseHeaders,
            });
        } catch (error) {
            console.error('Proxy error:', error);
            const apiError: ApiError = {
                error: 'Failed to proxy request to render service',
                code: 'PROXY_ERROR',
                details: error instanceof Error ? error.message : 'Unknown error',
            };
            return NextResponse.json(apiError, { status: 502 });
        }
    }

    // Local rendering (for Render deployment or local dev without proxy)
    const ip = getClientIp(request);

    // Check rate limit
    if (!checkRateLimit(ip)) {
        const error: ApiError = {
            error: 'Rate limit exceeded',
            code: 'RATE_LIMITED',
            details: 'Please wait before making more requests',
        };
        return NextResponse.json(error, {
            status: 429,
            headers: { 'Retry-After': '60' },
        });
    }

    try {
        // Parse request body
        const body = await request.json() as RenderRequest;
        const { url, preset = 'square', fontSize = 100, cardStyle = 'classic', templateVersion = 'v1' } = body;

        // Validate required fields
        if (!url) {
            const error: ApiError = {
                error: 'URL is required',
                code: 'MISSING_URL',
            };
            return NextResponse.json(error, { status: 400 });
        }

        // Validate preset
        const validPresets: SizePreset[] = ['square', 'portrait', 'story'];
        if (!validPresets.includes(preset)) {
            const error: ApiError = {
                error: 'Invalid preset',
                code: 'INVALID_PRESET',
                details: `Valid presets are: ${validPresets.join(', ')}`,
            };
            return NextResponse.json(error, { status: 400 });
        }

        // Check cache (include fontSize and cardStyle in cache key)
        const cacheKey = generateCacheKey(url, `${preset}-${fontSize}-${cardStyle}`, templateVersion);
        const cachedImage = imageCache.get(cacheKey);
        if (cachedImage) {
            return new NextResponse(new Uint8Array(cachedImage), {
                status: 200,
                headers: {
                    'Content-Type': 'image/png',
                    'Cache-Control': 'public, max-age=3600',
                    'X-Cache': 'HIT',
                },
            });
        }

        // Normalize URL
        const normalizedUrl = await normalizeUrl(url);

        // Parse review
        const metadata = await parseReview(normalizedUrl);

        // Generate card HTML with font size and card style
        const cardHtml = generateCardHtml(metadata, preset, fontSize, cardStyle);

        // Render to image
        const imageBuffer = await renderToImage(cardHtml, preset);

        // Cache the result
        imageCache.set(cacheKey, imageBuffer);

        // Return PNG
        return new NextResponse(new Uint8Array(imageBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=3600',
                'X-Cache': 'MISS',
            },
        });
    } catch (error) {
        console.error('Render error:', error);

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

        if (error instanceof RenderError) {
            const apiError: ApiError = {
                error: 'Failed to render image',
                code: error.code,
                details: error.message,
            };
            return NextResponse.json(apiError, { status: 500 });
        }

        const apiError: ApiError = {
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
        };
        return NextResponse.json(apiError, { status: 500 });
    }
}
