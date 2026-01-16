/**
 * Client-Side Canvas Renderer
 * Renders review cards entirely in the browser using HTML5 Canvas API
 */

import { ReviewMetadata, SizePreset, SIZE_DIMENSIONS, FontSize, getFontMultiplier, CardStyle } from '@/types/review';

/**
 * Load an image from URL with CORS support
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => resolve(img);
        img.onerror = (error) => {
            console.warn(`Failed to load image: ${url}`, error);
            reject(error);
        };

        // For external images, try to proxy through our API to avoid CORS issues
        // For now, attempt direct loading
        img.src = url;
    });
}

/**
 * Load a font and ensure it's ready to use
 */
async function loadFont(fontFamily: string): Promise<void> {
    try {
        await document.fonts.load(`16px ${fontFamily}`);
    } catch (error) {
        console.warn(`Failed to load font: ${fontFamily}`, error);
    }
}

/**
 * Draw rounded rectangle
 */
function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Wrap text to fit within a width
 */
function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

/**
 * Truncate text to fit within a maximum number of lines
 */
function truncateTextToLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxLines: number,
    lineHeight: number
): string[] {
    const paragraphs = text.split('\n\n');
    const allLines: string[] = [];

    for (const paragraph of paragraphs) {
        const lines = wrapText(ctx, paragraph, maxWidth);
        allLines.push(...lines);

        if (allLines.length >= maxLines) {
            break;
        }
    }

    // Truncate to max lines
    if (allLines.length > maxLines) {
        const truncated = allLines.slice(0, maxLines);
        truncated[maxLines - 1] = truncated[maxLines - 1] + '...';
        return truncated;
    }

    return allLines;
}

/**
 * Draw stars for rating
 */
function drawStars(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rating: number,
    starSize: number,
    gap: number
): number {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    ctx.font = `${starSize}px Arial`;
    ctx.textBaseline = 'middle';

    let currentX = x;

    // Draw full stars
    for (let i = 0; i < fullStars; i++) {
        ctx.fillStyle = '#ff6b35';
        ctx.fillText('★', currentX, y);
        currentX += starSize + gap;
    }

    // Draw half star
    if (hasHalfStar) {
        // Draw empty star
        ctx.fillStyle = '#333';
        ctx.fillText('★', currentX, y);

        // Clip and draw half filled
        ctx.save();
        ctx.beginPath();
        ctx.rect(currentX, y - starSize / 2, starSize / 2, starSize);
        ctx.clip();
        ctx.fillStyle = '#ff6b35';
        ctx.fillText('★', currentX, y);
        ctx.restore();

        currentX += starSize + gap;
    }

    // Draw empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        ctx.fillStyle = '#333';
        ctx.fillText('★', currentX, y);
        currentX += starSize + gap;
    }

    return currentX - x; // Return total width
}

/**
 * Render classic card style
 */
async function renderClassicCard(
    ctx: CanvasRenderingContext2D,
    metadata: ReviewMetadata,
    preset: SizePreset,
    fontSize: FontSize
): Promise<void> {
    const dimensions = SIZE_DIMENSIONS[preset];
    const { width, height } = dimensions;
    const fontMultiplier = getFontMultiplier(fontSize);

    const scale = (size: number) => Math.round(size * fontMultiplier);
    const padding = preset === 'story' ? 40 : 36;

    // Load fonts
    await loadFont('Inter');

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0d0d0d');
    gradient.addColorStop(1, '#141414');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw grain texture overlay (simplified)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.01)';
    for (let i = 0; i < 1000; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        ctx.fillRect(x, y, 1, 1);
    }

    // Draw accent glow
    const glowGradient = ctx.createRadialGradient(width - 100, 100, 0, width - 100, 100, 300);
    glowGradient.addColorStop(0, 'rgba(255, 107, 53, 0.08)');
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, width, height);

    // Calculate header height
    const headerHeight = Math.floor(height / 3) - 40;
    const posterHeight = headerHeight;
    const posterWidth = (posterHeight * 2) / 3;

    // Draw poster
    let currentY = padding;
    if (metadata.posterUrl) {
        try {
            const posterImg = await loadImage(metadata.posterUrl);

            // Draw rounded rectangle background
            ctx.save();
            drawRoundedRect(ctx, padding, currentY, posterWidth, posterHeight, 12);
            ctx.clip();

            // Draw shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 10;

            ctx.drawImage(posterImg, padding, currentY, posterWidth, posterHeight);
            ctx.restore();
        } catch (error) {
            // Draw placeholder
            ctx.fillStyle = '#1a1a1a';
            ctx.save();
            drawRoundedRect(ctx, padding, currentY, posterWidth, posterHeight, 12);
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = '#444';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🎬', padding + posterWidth / 2, currentY + posterHeight / 2);
        }
    }

    // Film title and info
    const filmInfoX = padding + posterWidth + 28;
    const filmInfoWidth = width - filmInfoX - padding;
    const filmInfoY = currentY + posterHeight / 2;

    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${scale(preset === 'story' ? 56 : preset === 'portrait' ? 50 : 44)}px Inter, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Wrap title if needed
    const titleLines = wrapText(ctx, metadata.filmTitle, filmInfoWidth);
    let titleY = filmInfoY - (titleLines.length > 1 ? 30 : 0);

    for (const line of titleLines.slice(0, 2)) {
        ctx.fillText(line, filmInfoX, titleY);
        titleY += scale(preset === 'story' ? 60 : preset === 'portrait' ? 54 : 48);
    }

    // Year
    if (metadata.filmYear) {
        ctx.fillStyle = '#888';
        ctx.font = `500 ${scale(preset === 'story' ? 42 : preset === 'portrait' ? 38 : 34)}px Inter, sans-serif`;
        ctx.fillText(`(${metadata.filmYear})`, filmInfoX, titleY);
        titleY += scale(50);
    }

    // Rating stars
    if (metadata.rating) {
        const starY = titleY + 20;
        const starSize = preset === 'story' ? 36 : 32;
        let starsX = filmInfoX;

        const starsWidth = drawStars(ctx, starsX, starY, metadata.rating, starSize, 4);

        // Liked badge
        if (metadata.liked) {
            ctx.fillStyle = '#ff6b35';
            ctx.font = `${starSize}px Arial`;
            ctx.fillText('♥', starsX + starsWidth + 16, starY);
        }
    } else if (metadata.liked) {
        const starY = titleY + 20;
        ctx.fillStyle = '#ff6b35';
        ctx.font = `${preset === 'story' ? 36 : 32}px Arial`;
        ctx.fillText('♥', filmInfoX, starY);
    }

    // Author info
    currentY = padding + headerHeight + 24;

    let authorX = padding;

    // Avatar
    if (metadata.avatarUrl) {
        try {
            const avatarImg = await loadImage(metadata.avatarUrl);
            const avatarSize = scale(44);

            ctx.save();
            ctx.beginPath();
            ctx.arc(authorX + avatarSize / 2, currentY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            ctx.drawImage(avatarImg, authorX, currentY, avatarSize, avatarSize);
            ctx.restore();

            // Border
            ctx.strokeStyle = 'rgba(255, 107, 53, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(authorX + avatarSize / 2, currentY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.stroke();

            authorX += avatarSize + 12;
        } catch (error) {
            // Skip avatar if failed to load
        }
    }

    // Author text
    ctx.fillStyle = '#888';
    ctx.font = `${scale(22)}px Inter, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Review by', authorX, currentY + scale(22));

    ctx.fillStyle = '#ff6b35';
    ctx.font = `600 ${scale(24)}px Inter, sans-serif`;
    ctx.fillText(`@${metadata.authorUsername}`, authorX + ctx.measureText('Review by ').width, currentY + scale(22));

    currentY += scale(44) + 20;

    // Spoiler badge
    if (metadata.spoiler) {
        ctx.fillStyle = 'rgba(255, 107, 53, 0.15)';
        const badgeWidth = 200;
        const badgeHeight = 36;
        drawRoundedRect(ctx, padding, currentY, badgeWidth, badgeHeight, 20);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 107, 53, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ff6b35';
        ctx.font = '600 14px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚠️ Contains Spoilers', padding + 16, currentY + badgeHeight / 2);

        currentY += badgeHeight + 16;
    }

    // Review text
    const reviewFontSize = scale(preset === 'story' ? 24 : preset === 'portrait' ? 22 : 20);
    const lineHeight = reviewFontSize * 1.75;
    const reviewWidth = width - padding * 2;
    const remainingHeight = height - currentY - 80; // Reserve space for footer
    const maxLines = Math.floor(remainingHeight / lineHeight);

    ctx.fillStyle = '#d4d4d4';
    ctx.font = `${reviewFontSize}px Inter, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    if (metadata.reviewText) {
        const reviewLines = truncateTextToLines(ctx, metadata.reviewText, reviewWidth, maxLines, lineHeight);

        for (const line of reviewLines) {
            ctx.fillText(line, padding, currentY);
            currentY += lineHeight;
        }
    } else {
        ctx.fillStyle = '#555';
        ctx.font = `italic ${reviewFontSize}px Inter, sans-serif`;
        ctx.fillText('No review text available', padding, currentY);
    }

    // Footer
    const footerY = height - padding - 20;

    // Draw separator line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, footerY - 20);
    ctx.lineTo(width - padding, footerY - 20);
    ctx.stroke();

    // Watched date
    if (metadata.watchedDate) {
        try {
            const date = new Date(metadata.watchedDate);
            const dateStr = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            ctx.fillStyle = '#666';
            ctx.font = `${scale(18)}px Inter, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`Watched ${dateStr}`, padding, footerY);
        } catch (error) {
            // Skip date if invalid
        }
    }

    // Letterboxd branding
    ctx.fillStyle = '#666';
    ctx.font = `600 ${scale(20)}px Inter, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const brandingText = 'letterboxd';
    const textWidth = ctx.measureText(brandingText).width;
    const brandingX = width - padding;

    ctx.fillText(brandingText, brandingX, footerY);

    // Logo dots
    const dotSize = scale(16);
    const dotGap = 4;
    const dotsWidth = dotSize * 3 + dotGap * 2;
    let dotX = brandingX - textWidth - 12 - dotsWidth;

    // Orange dot
    ctx.fillStyle = '#ff8000';
    ctx.beginPath();
    ctx.arc(dotX + dotSize / 2, footerY, dotSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Green dot
    dotX += dotSize + dotGap;
    ctx.fillStyle = '#00e054';
    ctx.beginPath();
    ctx.arc(dotX + dotSize / 2, footerY, dotSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Blue dot
    dotX += dotSize + dotGap;
    ctx.fillStyle = '#40bcf4';
    ctx.beginPath();
    ctx.arc(dotX + dotSize / 2, footerY, dotSize / 2, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Main rendering function - creates canvas and renders review card
 */
export async function renderCardToCanvas(
    metadata: ReviewMetadata,
    preset: SizePreset,
    fontSize: FontSize = 100,
    cardStyle: CardStyle = 'classic'
): Promise<Blob> {
    const dimensions = SIZE_DIMENSIONS[preset];
    const { width, height } = dimensions;

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Render based on card style
    if (cardStyle === 'classic') {
        await renderClassicCard(ctx, metadata, preset, fontSize);
    } else {
        // TODO: Implement cinematic style
        await renderClassicCard(ctx, metadata, preset, fontSize);
    }

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Failed to create blob from canvas'));
            }
        }, 'image/png');
    });
}
