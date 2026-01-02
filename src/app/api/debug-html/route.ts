/**
 * GET /api/debug-html - Debug endpoint to see raw HTML structure
 */

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        // Fetch the page
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: `HTTP ${response.status}` }, { status: 400 });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract various potential title sources
        const debugInfo = {
            url,

            // Meta tags
            ogTitle: $('meta[property="og:title"]').attr('content'),
            ogImage: $('meta[property="og:image"]').attr('content'),
            twitterTitle: $('meta[name="twitter:title"]').attr('content'),
            pageTitle: $('title').text().trim(),

            // Film poster data attributes
            filmPosterName: $('.film-poster').attr('data-film-name'),
            filmPosterSlug: $('.film-poster').attr('data-film-slug'),
            filmPosterYear: $('.film-poster').attr('data-film-release-year'),
            filmPosterImg: $('.film-poster img').attr('src'),

            // Heading elements
            h1Text: $('h1').first().text().trim(),
            h1aText: $('h1 a').first().text().trim(),
            headline1Text: $('h1.headline-1').text().trim(),
            headline1aText: $('h1.headline-1 a').text().trim(),

            // Film title wrappers
            filmTitleWrapper: $('.film-title-wrapper').text().trim(),
            filmTitleWrapperA: $('.film-title-wrapper a').text().trim(),
            spanFilmTitle: $('span.film-title-wrapper a').text().trim(),

            // Review specific
            filmDetail: $('.film-detail').text().trim().substring(0, 200),
            reviewBody: $('.review .body-text').text().trim().substring(0, 200),

            // All h1 elements
            allH1: $('h1').map((i, el) => $(el).text().trim()).get(),

            // All links that might contain film name
            contextLinks: $('a.context').map((i, el) => ({
                text: $(el).text().trim(),
                href: $(el).attr('href')
            })).get(),
        };

        return NextResponse.json(debugInfo, { status: 200 });
    } catch (error) {
        return NextResponse.json({
            error: 'Failed to fetch',
            details: error instanceof Error ? error.message : 'Unknown'
        }, { status: 500 });
    }
}
