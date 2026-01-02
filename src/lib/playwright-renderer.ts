/**
 * Playwright Renderer - Screenshots the card HTML to PNG
 */

import { chromium, Browser, Page } from 'playwright';
import { SizePreset, SIZE_DIMENSIONS } from '@/types/review';

// Browser singleton for reuse across requests
let browserInstance: Browser | null = null;
let browserInitPromise: Promise<Browser> | null = null;

// Page pool for concurrent requests
const pagePool: Page[] = [];
const MAX_PAGES = 5;
const RENDER_TIMEOUT = 30000; // 30 seconds

export class RenderError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'RenderError';
    }
}

/**
 * Gets or creates the browser instance
 */
async function getBrowser(): Promise<Browser> {
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }

    // Prevent multiple simultaneous browser launches
    if (browserInitPromise) {
        return browserInitPromise;
    }

    browserInitPromise = chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
        ],
    });

    try {
        browserInstance = await browserInitPromise;

        // Handle disconnection
        browserInstance.on('disconnected', () => {
            browserInstance = null;
            browserInitPromise = null;
            pagePool.length = 0;
        });

        return browserInstance;
    } finally {
        browserInitPromise = null;
    }
}

/**
 * Gets a page from the pool or creates a new one
 */
async function getPage(browser: Browser): Promise<Page> {
    // Try to get an existing page from pool
    const existingPage = pagePool.pop();
    if (existingPage && !existingPage.isClosed()) {
        return existingPage;
    }

    // Create a new page
    return browser.newPage();
}

/**
 * Returns a page to the pool or closes it
 */
async function releasePage(page: Page): Promise<void> {
    if (page.isClosed()) {
        return;
    }

    if (pagePool.length < MAX_PAGES) {
        pagePool.push(page);
    } else {
        await page.close();
    }
}

/**
 * Renders HTML to a PNG buffer
 */
export async function renderToImage(
    html: string,
    preset: SizePreset
): Promise<Buffer> {
    const dimensions = SIZE_DIMENSIONS[preset];
    const browser = await getBrowser();
    const page = await getPage(browser);

    try {
        // Set viewport with high DPI for crisp text
        await page.setViewportSize({
            width: dimensions.width,
            height: dimensions.height,
        });

        // Set the HTML content
        await page.setContent(html, {
            waitUntil: 'networkidle',
            timeout: RENDER_TIMEOUT,
        });

        // Wait a bit for fonts to load
        await page.waitForTimeout(500);

        // Screenshot the card element
        const cardElement = page.locator('#card');

        const buffer = await cardElement.screenshot({
            type: 'png',
            scale: 'device',
            timeout: RENDER_TIMEOUT,
        });

        return Buffer.from(buffer);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('timeout')) {
                throw new RenderError('Render timed out', 'RENDER_TIMEOUT');
            }
            throw new RenderError(error.message, 'RENDER_FAILED');
        }
        throw new RenderError('Unknown render error', 'RENDER_FAILED');
    } finally {
        await releasePage(page);
    }
}

/**
 * Checks if Playwright browser is available
 */
export async function checkBrowserHealth(): Promise<boolean> {
    try {
        const browser = await getBrowser();
        return browser.isConnected();
    } catch {
        return false;
    }
}

/**
 * Closes the browser instance (for cleanup)
 */
export async function closeBrowser(): Promise<void> {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
        browserInitPromise = null;
        pagePool.length = 0;
    }
}
