/**
 * TMDB API Helper - Fetches movie posters by name
 * 
 * Get your API key from: https://www.themoviedb.org/settings/api
 */

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Poster sizes available: w92, w154, w185, w342, w500, w780, original
const POSTER_SIZE = 'w500';

// Retry settings
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 10000;

interface TMDBSearchResult {
    id: number;
    title: string;
    original_title: string;
    release_date: string;
    poster_path: string | null;
    backdrop_path: string | null;
    vote_average: number;
}

interface TMDBSearchResponse {
    page: number;
    results: TMDBSearchResult[];
    total_results: number;
    total_pages: number;
}

/**
 * Gets the TMDB API key from environment variables
 */
function getApiKey(): string | null {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey || apiKey === 'your_tmdb_api_key_here') {
        console.warn('TMDB_API_KEY not configured. Posters will not be fetched from TMDB.');
        return null;
    }
    return apiKey;
}

/**
 * Fetch with timeout and retry
 */
async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries = MAX_RETRIES
): Promise<Response | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);

        if (retries > 0) {
            console.log(`TMDB fetch failed, retrying... (${retries} left)`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            return fetchWithRetry(url, options, retries - 1);
        }

        console.error('TMDB fetch failed after retries:', error);
        return null;
    }
}

/**
 * Searches for a movie by title and optional year
 */
export async function searchMovie(
    title: string,
    year?: number
): Promise<TMDBSearchResult | null> {
    try {
        const apiKey = getApiKey();
        if (!apiKey) {
            return null;
        }

        const params = new URLSearchParams({
            api_key: apiKey,
            query: title,
            language: 'en-US',
            page: '1',
            include_adult: 'false',
        });

        if (year) {
            params.set('year', year.toString());
        }

        const response = await fetchWithRetry(
            `${TMDB_API_BASE}/search/movie?${params.toString()}`
        );

        if (!response || !response.ok) {
            if (response) {
                console.error(`TMDB API error: ${response.status}`);
            }
            return null;
        }

        const data: TMDBSearchResponse = await response.json();

        if (data.results.length === 0) {
            // Try without year if no results
            if (year) {
                console.log(`No results for "${title}" (${year}), trying without year...`);
                return searchMovie(title);
            }
            return null;
        }

        // Return the first (best) match
        console.log(`Found TMDB match: "${data.results[0].title}" (${data.results[0].release_date?.slice(0, 4) || 'unknown year'})`);
        return data.results[0];
    } catch (error) {
        console.error('TMDB search error:', error);
        return null;
    }
}

/**
 * Gets the full poster URL for a movie
 */
export function getPosterUrl(posterPath: string | null): string | null {
    if (!posterPath) {
        return null;
    }
    return `${TMDB_IMAGE_BASE}/${POSTER_SIZE}${posterPath}`;
}

/**
 * Searches for a movie and returns the poster URL
 */
export async function getMoviePoster(
    title: string,
    year?: number
): Promise<string | null> {
    const movie = await searchMovie(title, year);
    if (!movie || !movie.poster_path) {
        return null;
    }
    return getPosterUrl(movie.poster_path);
}

/**
 * Fetches a movie poster and returns it as base64 data URL
 * This avoids CORS issues when rendering with Playwright
 */
export async function getMoviePosterAsBase64(
    title: string,
    year?: number
): Promise<string | null> {
    const posterUrl = await getMoviePoster(title, year);
    if (!posterUrl) {
        return null;
    }

    try {
        const response = await fetchWithRetry(posterUrl);
        if (!response || !response.ok) {
            return null;
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return `data:${contentType};base64,${base64}`;
    } catch (error) {
        console.error('Failed to fetch poster as base64:', error);
        return null;
    }
}

/**
 * Gets both poster and backdrop as base64
 */
export async function getMovieImages(
    title: string,
    year?: number
): Promise<{ poster: string | null; backdrop: string | null }> {
    const movie = await searchMovie(title, year);

    if (!movie) {
        return { poster: null, backdrop: null };
    }

    const posterUrl = getPosterUrl(movie.poster_path);
    const backdropUrl = movie.backdrop_path
        ? `${TMDB_IMAGE_BASE}/w1280${movie.backdrop_path}`
        : null;

    const [poster, backdrop] = await Promise.all([
        posterUrl ? fetchImageAsBase64(posterUrl) : Promise.resolve(null),
        backdropUrl ? fetchImageAsBase64(backdropUrl) : Promise.resolve(null),
    ]);

    return { poster, backdrop };
}

/**
 * Helper to fetch any image as base64
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
    try {
        const response = await fetchWithRetry(url);
        if (!response || !response.ok) {
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
