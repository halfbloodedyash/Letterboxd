'use client';

import { SizePreset } from '@/types/review';

interface ImagePreviewProps {
    imageUrl: string | null;
    preset: SizePreset;
    onDownload: () => void;
}

export default function ImagePreview({ imageUrl, preset, onDownload }: ImagePreviewProps) {
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
                <button onClick={onDownload} className="download-btn">
                    <span className="btn-icon">⬇</span>
                    <span>Download PNG</span>
                </button>
            </div>
        </div>
    );
}
