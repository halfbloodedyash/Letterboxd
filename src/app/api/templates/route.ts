/**
 * GET /api/templates - List available templates and presets
 */

import { NextResponse } from 'next/server';
import { SIZE_DIMENSIONS, TemplateInfo, SizePreset } from '@/types/review';

const templates: TemplateInfo[] = [
    {
        preset: 'square',
        dimensions: SIZE_DIMENSIONS.square,
        description: 'Perfect for Instagram posts (1:1 ratio)',
    },
    {
        preset: 'portrait',
        dimensions: SIZE_DIMENSIONS.portrait,
        description: 'Ideal for Instagram/Facebook posts (4:5 ratio)',
    },
    {
        preset: 'story',
        dimensions: SIZE_DIMENSIONS.story,
        description: 'Optimized for Stories and TikTok (9:16 ratio)',
    },
];

export async function GET() {
    return NextResponse.json({
        templates,
        defaultPreset: 'square' as SizePreset,
        version: 'v1',
    });
}
