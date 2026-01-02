/**
 * Review Parser for Letterboxd pages
 * Extracts metadata from review HTML using Cheerio
 */

import * as cheerio from 'cheerio';
import { ReviewMetadata } from '@/types/review';
import { getMoviePosterAsBase64 } from '@/lib/tmdb';

export class ReviewParseError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'ReviewParseError';
    }
}

/**
 * Fetches and parses a Letterboxd review page
 * @param url - The normalized Letterboxd review URL
 * @returns Parsed review metadata
 */
export async function parseReview(url: string): Promise<ReviewMetadata> {
    // Fetch the HTML
    const html = await fetchReviewPage(url);

    // Parse with Cheerio
    const $ = cheerio.load(html);

    // Extract metadata
    const metadata = extractMetadata($, url);

    // Use TMDB API to get high-quality poster
    try {
        const tmdbPoster = await getMoviePosterAsBase64(
            metadata.filmTitle,
            metadata.filmYear
        );
        if (tmdbPoster) {
            metadata.posterUrl = tmdbPoster;
            console.log(`✓ Fetched poster from TMDB for: ${metadata.filmTitle}`);
        } else {
            console.log(`✗ No TMDB poster found for: ${metadata.filmTitle}`);
            // Fallback: try to fetch from Letterboxd if we have a URL
            if (metadata.posterUrl) {
                const base64Poster = await fetchImageAsBase64(metadata.posterUrl);
                if (base64Poster) {
                    metadata.posterUrl = base64Poster;
                }
            }
        }
    } catch (e) {
        console.error('Failed to fetch poster from TMDB:', e);
        // Fallback: try to fetch from Letterboxd
        if (metadata.posterUrl) {
            try {
                const base64Poster = await fetchImageAsBase64(metadata.posterUrl);
                if (base64Poster) {
                    metadata.posterUrl = base64Poster;
                }
            } catch {
                // Keep original URL as last resort
            }
        }
    }

    // Fetch avatar as base64 too
    if (metadata.avatarUrl) {
        try {
            const base64Avatar = await fetchImageAsBase64(metadata.avatarUrl);
            if (base64Avatar) {
                metadata.avatarUrl = base64Avatar;
            }
        } catch (e) {
            console.error('Failed to fetch avatar:', e);
        }
    }

    return metadata;
}

/**
 * Fetches an image and returns it as a base64 data URL
 */
async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*',
            },
        });

        if (!response.ok) {
            return null;
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return `data:${contentType};base64,${base64}`;
    } catch {
        return null;
    }
}

/**
 * Fetches the review page HTML
 */
async function fetchReviewPage(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
        });

        if (!response.ok) {
            if (response.status === 403) {
                throw new ReviewParseError(
                    'Access denied by Letterboxd - may be rate limited',
                    'ACCESS_DENIED'
                );
            }
            if (response.status === 404) {
                throw new ReviewParseError('Review not found', 'NOT_FOUND');
            }
            throw new ReviewParseError(
                `HTTP error: ${response.status}`,
                'HTTP_ERROR'
            );
        }

        return await response.text();
    } catch (error) {
        if (error instanceof ReviewParseError) {
            throw error;
        }
        throw new ReviewParseError(
            'Failed to fetch review page',
            'FETCH_FAILED'
        );
    }
}

/**
 * Converts a URL slug (e.g., "marty-supreme") to a title (e.g., "Marty Supreme").
 */
function slugToTitle(slug: string): string {
    if (!slug) return 'Unknown Film';

    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Extracts metadata from parsed HTML
 */
function extractMetadata($: cheerio.CheerioAPI, url: string): ReviewMetadata {
    // Parse URL to extract username and film slug
    // URL format: https://letterboxd.com/{username}/film/{film-slug}/
    const urlParts = new URL(url).pathname.split('/').filter(Boolean);
    const authorUsername = urlParts[0] || 'unknown';
    const filmSlug = urlParts[2] || ''; // The film slug is after "film"

    // Convert film slug to title (most reliable method!)
    // e.g., "marty-supreme" -> "Marty Supreme"
    let filmTitle = slugToTitle(filmSlug);

    // Try to get better title from HTML if available
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const filmPosterTitle = $('.film-poster').attr('data-film-name');
    const filmDetailLink = $('h1.headline-1 a').text().trim();
    const pageTitle = $('title').text().trim();

    // Use HTML sources if they provide a better title (with proper casing)
    if (filmPosterTitle) {
        filmTitle = filmPosterTitle;
    } else if (filmDetailLink) {
        filmTitle = filmDetailLink;
    } else if (ogTitle) {
        // Parse from og:title: "'Film Name' review by username" or "Review of Film Name"
        // Pattern: 'Film Name' (with quotes)
        const quotedMatch = ogTitle.match(/['"](.+?)['"]/);
        if (quotedMatch) {
            filmTitle = quotedMatch[1];
        } else {
            // Pattern: "Review of TITLE by USER"
            const reviewOfMatch = ogTitle.match(/Review of (.+?) by /i);
            if (reviewOfMatch) {
                filmTitle = reviewOfMatch[1].replace(/\s*\(\d{4}\)\s*$/, '').trim();
            }
        }
    } else if (pageTitle) {
        // Pattern: "'Film Name' review by username"
        const quotedMatch = pageTitle.match(/['"](.+?)['"]/);
        if (quotedMatch) {
            filmTitle = quotedMatch[1];
        }
    }

    // Fallback to slug-based title if still unknown
    if (!filmTitle && filmSlug) { // Check if filmTitle is empty or undefined
        filmTitle = slugToTitle(filmSlug);
    }

    // Extract film year from various sources
    let filmYear: number | undefined;
    const yearFromPoster = $('.film-poster').attr('data-film-release-year');
    const yearFromOgTitle = ogTitle.match(/\((\d{4})\)/);
    const yearFromPage = pageTitle.match(/\((\d{4})\)/);

    if (yearFromPoster) {
        filmYear = parseInt(yearFromPoster, 10);
    } else if (yearFromOgTitle) {
        filmYear = parseInt(yearFromOgTitle[1], 10);
    } else if (yearFromPage) {
        filmYear = parseInt(yearFromPage[1], 10);
    }

    // Extract author display name
    const authorName =
        $('a.name').first().text().trim() ||
        $('.person-summary strong').first().text().trim() ||
        authorUsername;

    // Extract rating (star rating)
    let rating: number | undefined;

    // Try multiple rating selectors
    const ratingSpan = $('span.rating');
    if (ratingSpan.length > 0) {
        const ratingClass = ratingSpan.attr('class') || '';
        const ratingMatch = ratingClass.match(/rated-(\d+)/);
        if (ratingMatch) {
            // Letterboxd uses rated-1 to rated-10 (half-star increments)
            rating = parseInt(ratingMatch[1], 10) / 2;
        }
    }

    // Check for like (heart)
    const liked = $('.icon-liked').length > 0 ||
        $('[data-liked="true"]').length > 0 ||
        $('.like-link-target.icon-liked').length > 0;

    // Extract watched date
    const watchedDate =
        $('time').attr('datetime') ||
        $('time.date-day-month-year').attr('datetime') ||
        $('a.date span').text().trim() ||
        undefined;

    // Extract review text
    const reviewParagraphs: string[] = [];
    $('.review .body-text p, .review-body p, .body-text > div > p').each((_, el) => {
        const text = $(el).text().trim();
        if (text) {
            reviewParagraphs.push(text);
        }
    });

    let reviewText = reviewParagraphs.join('\n\n');

    // Fallback: try to get text from body-text div directly
    if (!reviewText) {
        reviewText = $('.body-text').first().text().trim();
    }

    // Check for spoiler
    const spoiler =
        $('.spoiler-warning').length > 0 ||
        $('.contains-spoilers').length > 0 ||
        $('[data-spoiler]').length > 0 ||
        $('body').text().toLowerCase().includes('this review may contain spoilers');

    // Extract poster URL - use multiple strategies
    let posterUrl: string | undefined;

    // Strategy 1: Get from film-poster element's data attribute
    const posterSlug = $('.film-poster').attr('data-film-slug');
    const posterFromData = $('.film-poster img').attr('src') ||
        $('.film-poster img').attr('data-src');

    // Strategy 2: Get from og:image meta tag
    const ogImage = $('meta[property="og:image"]').attr('content');

    // Strategy 3: Look for any poster image
    const posterFromImg = $('img.image').attr('src');

    if (posterFromData) {
        posterUrl = posterFromData;
    } else if (ogImage && !ogImage.includes('avatar')) {
        posterUrl = ogImage;
    } else if (posterFromImg) {
        posterUrl = posterFromImg;
    }

    // Upgrade to high-quality poster if it's from Letterboxd CDN
    if (posterUrl && posterUrl.includes('ltrbxd.com')) {
        // Convert to larger poster size (460x690)
        posterUrl = posterUrl.replace(/-0-\d+-0-\d+-crop/, '-0-460-0-690-crop');
        // Ensure HTTPS
        posterUrl = posterUrl.replace(/^http:/, 'https:');
    }

    // Extract author avatar URL
    const avatarUrl = $('a.avatar img').attr('src') ||
        $('.avatar img').attr('src') ||
        $('img.avatar').attr('src') ||
        undefined;

    return {
        filmTitle,
        filmYear,
        authorName,
        authorUsername,
        avatarUrl,
        rating,
        liked,
        watchedDate,
        reviewText,
        spoiler,
        posterUrl,
    };
}
