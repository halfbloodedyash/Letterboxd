/**
 * GET /api/health - Health check endpoint
 */

import { NextResponse } from 'next/server';
import { checkBrowserHealth } from '@/lib/playwright-renderer';

export async function GET() {
    try {
        const browserHealthy = await checkBrowserHealth();

        if (browserHealthy) {
            return NextResponse.json({
                status: 'healthy',
                browser: 'connected',
                timestamp: new Date().toISOString(),
            });
        } else {
            return NextResponse.json({
                status: 'degraded',
                browser: 'disconnected',
                timestamp: new Date().toISOString(),
            }, { status: 503 });
        }
    } catch (error) {
        console.error('Health check error:', error);
        return NextResponse.json({
            status: 'unhealthy',
            browser: 'error',
            timestamp: new Date().toISOString(),
        }, { status: 503 });
    }
}
