'use client';

import { SizePreset } from '@/types/review';

interface ImagePreviewProps {
    imageUrl: string | null;
    preset: SizePreset;
    onPreview: () => void;
    onDownload: () => void;
}

export default function ImagePreview({ imageUrl, preset, onPreview, onDownload }: ImagePreviewProps) {
    if (!imageUrl) {
        return (
            <div className="preview-placeholder">
                <div className="placeholder-content">
                    <div className="placeholder-icon">🎬</div>
                    <p className="placeholder-text">Your generated image will appear here</p>
                    <p className="placeholder-hint">
                        Paste a Letterboxd review URL and click Generate
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="preview-container">
            <div className={`preview-wrapper ${preset}`}>
                <img
                    src={imageUrl}
                    alt="Generated review card"
                    className="preview-image"
                />
            </div>
            <div className="preview-actions">
                <button onClick={onPreview} className="preview-action-btn">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 3C4.5 3 1.5 5.5 0.5 8C1.5 10.5 4.5 13 8 13C11.5 13 14.5 10.5 15.5 8C14.5 5.5 11.5 3 8 3ZM8 11C6.34 11 5 9.66 5 8C5 6.34 6.34 5 8 5C9.66 5 11 6.34 11 8C11 9.66 9.66 11 8 11ZM8 6.5C7.17 6.5 6.5 7.17 6.5 8C6.5 8.83 7.17 9.5 8 9.5C8.83 9.5 9.5 8.83 9.5 8C9.5 7.17 8.83 6.5 8 6.5Z" fill="currentColor" />
                    </svg>
                    <span>Preview</span>
                </button>
                <button onClick={onDownload} className="download-btn">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 11V14H2V11H0V14C0 15.1 0.9 16 2 16H14C15.1 16 16 15.1 16 14V11H14ZM13 7L11.59 5.59L9 8.17V0H7V8.17L4.41 5.59L3 7L8 12L13 7Z" fill="currentColor" />
                    </svg>
                    <span>Download PNG</span>
                </button>
            </div>
        </div>
    );
}
