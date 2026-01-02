/**
 * URL Normalizer for Letterboxd URLs
 * Handles both boxd.it short links and full letterboxd.com URLs
 */

export class UrlNormalizationError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'UrlNormalizationError';
    }
}

/**
 * Validates and normalizes a Letterboxd review URL
 * @param inputUrl - The URL to normalize (boxd.it or letterboxd.com)
 * @returns The normalized letterboxd.com URL
 */
export async function normalizeUrl(inputUrl: string): Promise<string> {
    // Trim and validate input
    const trimmedUrl = inputUrl.trim();

    if (!trimmedUrl) {
        throw new UrlNormalizationError('URL cannot be empty', 'EMPTY_URL');
    }

    // Parse the URL
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(trimmedUrl);
    } catch {
        throw new UrlNormalizationError('Invalid URL format', 'INVALID_URL_FORMAT');
    }

    // Validate protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new UrlNormalizationError('URL must use HTTP or HTTPS protocol', 'INVALID_PROTOCOL');
    }

    // Validate domain
    const hostname = parsedUrl.hostname.toLowerCase();
    const allowedDomains = ['letterboxd.com', 'www.letterboxd.com', 'boxd.it'];

    if (!allowedDomains.includes(hostname)) {
        throw new UrlNormalizationError(
            'URL must be from letterboxd.com or boxd.it',
            'INVALID_DOMAIN'
        );
    }

    // If it's a boxd.it short link, follow the redirect
    if (hostname === 'boxd.it') {
        return await followRedirect(trimmedUrl);
    }

    // Validate that it's a review URL pattern
    // Reviews follow: /username/film/filmname/ or /username/film/filmname/reviewNumber/
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);

    if (pathParts.length < 3 || pathParts[1] !== 'film') {
        throw new UrlNormalizationError(
            'URL does not appear to be a Letterboxd review',
            'NOT_REVIEW_URL'
        );
    }

    return trimmedUrl;
}

/**
 * Follows redirects for boxd.it short links
 */
async function followRedirect(shortUrl: string): Promise<string> {
    try {
        const response = await fetch(shortUrl, {
            method: 'HEAD',
            redirect: 'follow',
        });

        const finalUrl = response.url;

        // Validate the final URL is a letterboxd.com URL
        const parsedFinal = new URL(finalUrl);
        if (!parsedFinal.hostname.includes('letterboxd.com')) {
            throw new UrlNormalizationError(
                'Short URL did not redirect to letterboxd.com',
                'INVALID_REDIRECT'
            );
        }

        return finalUrl;
    } catch (error) {
        if (error instanceof UrlNormalizationError) {
            throw error;
        }
        throw new UrlNormalizationError(
            'Failed to resolve short URL',
            'REDIRECT_FAILED'
        );
    }
}

/**
 * Extracts the username from a normalized Letterboxd URL
 */
export function extractUsername(normalizedUrl: string): string | null {
    try {
        const url = new URL(normalizedUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        return pathParts[0] || null;
    } catch {
        return null;
    }
}
