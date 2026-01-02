/**
 * Cinematic Card Renderer - Backdrop-style card layout
 */

import { ReviewMetadata, SizePreset, SIZE_DIMENSIONS, FontSize, getFontMultiplier } from '@/types/review';

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

function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Cinematic card layout (full poster with title overlay)
 */
export function generateCinematicCard(
  metadata: ReviewMetadata,
  preset: SizePreset,
  fontSize: FontSize
): string {
  const dimensions = SIZE_DIMENSIONS[preset];
  const { width, height } = dimensions;
  const fontMultiplier = getFontMultiplier(fontSize);

  const scale = (size: number) => Math.round(size * fontMultiplier);

  const baseMaxLength = preset === 'story' ? 1000 : preset === 'portrait' ? 700 : 400;
  const maxTextLength = Math.round(baseMaxLength / fontMultiplier);

  const truncatedReview = truncateText(metadata.reviewText, maxTextLength);
  const stars = generateStars(metadata.rating);
  const yearDisplay = metadata.filmYear ? `(${metadata.filmYear})` : '';

  // Header section takes up ~50% of the height for the poster
  const headerHeight = Math.floor(height * 0.5);
  const posterWidth = Math.floor(headerHeight * 0.67); // 2:3 aspect ratio

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: transparent; }
    
    #card {
      width: ${width}px;
      height: ${height}px;
      background: linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%);
      color: #e5e5e5;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: 24px;
    }
    
    .header-section {
      display: flex;
      padding: 32px;
      gap: 28px;
      height: ${headerHeight}px;
      background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%);
    }
    
    .poster-wrapper {
      flex-shrink: 0;
      width: ${posterWidth}px;
      height: 100%;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    }
    
    .poster-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .poster-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 64px;
      color: #333;
    }
    
    .title-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding-bottom: 16px;
    }
    
    .film-title {
      font-size: ${scale(preset === 'story' ? 56 : preset === 'portrait' ? 48 : 42)}px;
      font-weight: 800;
      color: #fff;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }
    
    .film-year {
      font-size: ${scale(32)}px;
      color: #666;
      margin-top: 8px;
      font-weight: 500;
    }
    
    .content-section {
      flex: 1;
      padding: 0 32px 24px 32px;
      display: flex;
      flex-direction: column;
    }
    
    .author-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .author-avatar {
      width: ${scale(44)}px;
      height: ${scale(44)}px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid rgba(255, 107, 53, 0.4);
    }
    
    .author-text { font-size: ${scale(18)}px; color: #888; }
    .author-name { color: #ff6b35; font-weight: 600; }
    
    .rating-row {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .stars { font-size: ${scale(28)}px; letter-spacing: 2px; }
    .star { color: #ffb400; }
    .star.empty { color: #444; }
    .star.half {
      background: linear-gradient(90deg, #ffb400 50%, #444 50%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .review-text {
      flex: 1;
      font-size: ${scale(preset === 'story' ? 22 : 20)}px;
      line-height: 1.7;
      color: #ccc;
      overflow: hidden;
    }
    
    .review-text p { margin-bottom: ${scale(16)}px; }
    .review-quote::before { content: '"'; color: #ff6b35; font-size: 1.3em; font-weight: 700; }
    .review-quote::after { content: '"'; color: #ff6b35; font-size: 1.3em; font-weight: 700; }
    
    .card-footer {
      display: flex;
      justify-content: flex-end;
      padding: 20px 32px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    
    .letterboxd-branding {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #555;
      font-size: ${scale(18)}px;
      font-weight: 600;
    }
    
    .letterboxd-logo { display: flex; gap: 4px; }
    .logo-dot { width: ${scale(14)}px; height: ${scale(14)}px; border-radius: 50%; }
    .logo-dot.orange { background: #ff8000; }
    .logo-dot.green { background: #00e054; }
    .logo-dot.blue { background: #40bcf4; }
  </style>
</head>
<body>
  <div id="card">
    <div class="header-section">
      <div class="poster-wrapper">
        ${metadata.posterUrl
      ? `<img class="poster-image" src="${escapeHtml(metadata.posterUrl)}" alt="Movie Poster" />`
      : `<div class="poster-placeholder">🎬</div>`
    }
      </div>
      <div class="title-section">
        <div class="film-title">${escapeHtml(metadata.filmTitle)}</div>
        <div class="film-year">${yearDisplay}</div>
      </div>
    </div>
    
    <div class="content-section">
      <div class="author-row">
        ${metadata.avatarUrl ? `<img class="author-avatar" src="${escapeHtml(metadata.avatarUrl)}" />` : ''}
        <span class="author-text">Review by <span class="author-name">@${escapeHtml(metadata.authorUsername)}</span></span>
      </div>
      
      ${stars ? `<div class="rating-row"><div class="stars">${stars}</div></div>` : ''}
      
      <div class="review-text">
        ${truncatedReview
      ? `<p class="review-quote">${escapeHtml(truncatedReview)}</p>`
      : '<p style="color: #555;">No review text available</p>'
    }
      </div>
    </div>
    
    <div class="card-footer">
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
</body>
</html>`;
}
