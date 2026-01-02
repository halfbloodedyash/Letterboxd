/**
 * Card Renderer - Generates HTML/CSS for the review card
 */

import { ReviewMetadata, SizePreset, SIZE_DIMENSIONS, FontSize, getFontMultiplier, CardStyle } from '@/types/review';
import { generateCinematicCard } from './card-renderer-cinematic';

/**
 * Generates star rating display
 */
function generateStars(rating?: number): string {
  if (rating === undefined) return '';

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let stars = '';
  for (let i = 0; i < fullStars; i++) {
    stars += '<span class="star full">★</span>';
  }
  if (hasHalfStar) {
    stars += '<span class="star half">★</span>';
  }
  for (let i = 0; i < emptyStars; i++) {
    stars += '<span class="star empty">★</span>';
  }

  return stars;
}

/**
 * Truncates text to a maximum number of characters
 */
function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Escapes HTML entities
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates the review card HTML with embedded CSS
 */
export function generateCardHtml(
  metadata: ReviewMetadata,
  preset: SizePreset,
  fontSize: FontSize = 100,
  cardStyle: CardStyle = 'classic'
): string {
  if (cardStyle === 'cinematic') {
    return generateCinematicCard(metadata, preset, fontSize);
  }
  const dimensions = SIZE_DIMENSIONS[preset];
  const { width, height } = dimensions;
  const fontMultiplier = getFontMultiplier(fontSize);

  // Helper function to scale font sizes
  const scale = (size: number) => Math.round(size * fontMultiplier);

  // Calculate max review text length based on preset and font size
  const baseMaxLength = preset === 'story' ? 2000 : preset === 'portrait' ? 1400 : 900;
  const maxTextLength = Math.round(baseMaxLength / fontMultiplier); // Smaller font = more text

  const truncatedReview = truncateText(metadata.reviewText, maxTextLength);
  const stars = generateStars(metadata.rating);
  const yearDisplay = metadata.filmYear ? ` (${metadata.filmYear})` : '';

  // Format watched date if available
  let dateDisplay = '';
  if (metadata.watchedDate) {
    try {
      const date = new Date(metadata.watchedDate);
      dateDisplay = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      dateDisplay = metadata.watchedDate;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    
    #card {
      width: ${width}px;
      height: ${height}px;
      background: linear-gradient(145deg, #0d0d0d 0%, #141414 100%);
      color: #e5e5e5;
      padding: ${preset === 'story' ? '40px' : '36px'};
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }
    
    /* Subtle grain texture overlay */
    #card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 1;
    }
    
    /* Accent glow */
    .accent-glow {
      position: absolute;
      top: -200px;
      right: -200px;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 70%);
      pointer-events: none;
    }
    
    .card-content {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    
    .card-header {
      display: flex;
      gap: 28px;
      height: ${Math.floor(height / 3) - 40}px;
      margin-bottom: 24px;
      align-items: stretch;
    }
    
    .poster-container {
      flex-shrink: 0;
      width: auto;
      height: 100%;
      aspect-ratio: 2/3;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
      background: #1a1a1a;
    }
    
    .poster {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .poster-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%);
      color: #444;
      font-size: 48px;
    }
    
    .film-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    
    .film-title {
      font-size: ${scale(preset === 'story' ? 56 : preset === 'portrait' ? 50 : 44)}px;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 12px;
      color: #ffffff;
      letter-spacing: -0.03em;
    }
    
    .film-year {
      color: #888;
      font-weight: 500;
      font-size: ${scale(preset === 'story' ? 42 : preset === 'portrait' ? 38 : 34)}px;
    }
    
    .rating-container {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 20px;
    }
    
    .stars {
      font-size: ${preset === 'story' ? '36px' : '32px'};
      letter-spacing: 3px;
      display: flex;
      gap: 4px;
    }
    
    .star {
      color: #ff6b35;
    }
    
    .star.empty {
      color: #333;
    }
    
    .star.half {
      background: linear-gradient(90deg, #ff6b35 50%, #333 50%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .liked-badge {
      color: #ff6b35;
      font-size: ${preset === 'story' ? '36px' : '32px'};
    }
    
    .card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .author-info {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      color: #888;
      font-size: ${scale(22)}px;
    }
    
    .author-avatar {
      width: ${scale(44)}px;
      height: ${scale(44)}px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255, 107, 53, 0.3);
    }
    
    .author-name {
      color: #ff6b35;
      font-weight: 600;
      font-size: ${scale(24)}px;
    }
    
    .review-text {
      flex: 1;
      font-size: ${scale(preset === 'story' ? 24 : preset === 'portrait' ? 22 : 20)}px;
      line-height: 1.75;
      color: #d4d4d4;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }
    
    .review-text p {
      margin-bottom: ${scale(20)}px;
    }
    
    .review-text p:last-child {
      margin-bottom: 0;
    }
    
    .spoiler-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,107,53,0.15);
      color: #ff6b35;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
      border: 1px solid rgba(255,107,53,0.3);
    }
    
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    
    .watched-date {
      color: #666;
      font-size: ${scale(18)}px;
    }
    
    .letterboxd-branding {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #666;
      font-size: ${scale(20)}px;
      font-weight: 600;
    }
    
    .letterboxd-logo {
      display: flex;
      gap: 4px;
    }
    
    .logo-dot {
      width: ${scale(16)}px;
      height: ${scale(16)}px;
      border-radius: 50%;
    }
    
    .logo-dot.orange { background: #ff8000; }
    .logo-dot.green { background: #00e054; }
    .logo-dot.blue { background: #40bcf4; }
  </style>
</head>
<body>
  <div id="card">
    <div class="accent-glow"></div>
    <div class="card-content">
      <div class="card-header">
        <div class="poster-container">
          ${metadata.posterUrl
      ? `<img class="poster" src="${escapeHtml(metadata.posterUrl)}" alt="Film poster" crossorigin="anonymous" />`
      : `<div class="poster-placeholder">🎬</div>`
    }
        </div>
        <div class="film-info">
          <h1 class="film-title">
            ${escapeHtml(metadata.filmTitle)}<span class="film-year">${yearDisplay}</span>
          </h1>
          ${stars ? `
          <div class="rating-container">
            <div class="stars">${stars}</div>
            ${metadata.liked ? '<span class="liked-badge">♥</span>' : ''}
          </div>
          ` : metadata.liked ? '<div class="rating-container"><span class="liked-badge">♥</span></div>' : ''}
        </div>
      </div>
      
      <div class="card-body">
        <div class="author-info">
          ${metadata.avatarUrl ? `<img class="author-avatar" src="${escapeHtml(metadata.avatarUrl)}" alt="${escapeHtml(metadata.authorUsername)}" crossorigin="anonymous" />` : ''}
          <span>Review by</span>
          <span class="author-name">@${escapeHtml(metadata.authorUsername)}</span>
        </div>
        
        ${metadata.spoiler ? '<div class="spoiler-badge">⚠️ Contains Spoilers</div>' : ''}
        
        <div class="review-text">
          ${truncatedReview ? truncatedReview.split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('') : '<p style="color: #555; font-style: italic;">No review text available</p>'}
        </div>
      </div>
      
      <div class="card-footer">
        <span class="watched-date">${dateDisplay ? `Watched ${dateDisplay}` : ''}</span>
        <div class="letterboxd-branding">
          <div class="letterboxd-logo">
            <div class="logo-dot orange"></div>
            <div class="logo-dot green"></div>
            <div class="logo-dot blue"></div>
          </div>
          <span>letterboxd</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
