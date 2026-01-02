/**
 * Metadata extracted from a Letterboxd review
 */
export interface ReviewMetadata {
  filmTitle: string;
  filmYear?: number;
  authorName: string;
  authorUsername: string;
  avatarUrl?: string; // Author's profile picture
  rating?: number; // 0-5 stars, supports half-stars (e.g., 3.5)
  liked: boolean;
  watchedDate?: string;
  reviewText?: string;
  spoiler: boolean;
  posterUrl?: string;
}

/**
 * Size preset for the generated image
 */
export type SizePreset = 'square' | 'portrait' | 'story';

/**
 * Font size as a percentage (50-150, where 100 is default)
 */
export type FontSize = number;

/**
 * Card style/layout option
 */
export type CardStyle = 'classic' | 'cinematic';

/**
 * Convert font size percentage to multiplier
 */
export function getFontMultiplier(fontSize: FontSize): number {
  return Math.max(0.5, Math.min(1.5, fontSize / 100));
}

/**
 * Dimensions for each size preset
 */
export const SIZE_DIMENSIONS: Record<SizePreset, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};

/**
 * Request body for the render API
 */
export interface RenderRequest {
  url: string;
  preset: SizePreset;
  fontSize?: FontSize;
  cardStyle?: CardStyle;
  templateVersion?: string;
}

/**
 * Template information for the templates API
 */
export interface TemplateInfo {
  preset: SizePreset;
  dimensions: { width: number; height: number };
  description: string;
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  code: string;
  details?: string;
}
