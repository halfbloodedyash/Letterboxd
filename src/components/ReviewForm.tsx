'use client';

import { useState, FormEvent, useEffect, useRef, useCallback } from 'react';
import { SizePreset, FontSize, CardStyle } from '@/types/review';

interface ReviewFormProps {
    onSubmit: (url: string, preset: SizePreset, fontSize: FontSize, cardStyle: CardStyle) => void;
    onPresetChange?: (preset: SizePreset, fontSize: FontSize, cardStyle: CardStyle) => void;
    onFontSizeChange?: (fontSize: FontSize) => void;
    onCardStyleChange?: (cardStyle: CardStyle) => void;
    isLoading: boolean;
    hasGeneratedImage?: boolean;
}

const PRESETS = [
    { value: 'square', label: 'Square (1:1)', desc: '1080×1080' },
    { value: 'portrait', label: 'Portrait (4:5)', desc: '1080×1350' },
    { value: 'story', label: 'Story (9:16)', desc: '1080×1920' },
];

const CARD_STYLES = [
    { value: 'classic', label: 'Classic', desc: 'Poster + Info' },
    { value: 'cinematic', label: 'Cinematic', desc: 'Backdrop Style' },
];

export default function ReviewForm({
    onSubmit,
    onPresetChange,
    onFontSizeChange,
    onCardStyleChange,
    isLoading,
    hasGeneratedImage = false
}: ReviewFormProps) {
    const [url, setUrl] = useState('');
    const [preset, setPreset] = useState<SizePreset>('square');
    const [fontSize, setFontSize] = useState<FontSize>(100);
    const [cardStyle, setCardStyle] = useState<CardStyle>('classic');

    // Debounce timer ref
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            onSubmit(url.trim(), preset, fontSize, cardStyle);
        }
    };

    const handlePresetChange = (newPreset: SizePreset) => {
        setPreset(newPreset);
        if (hasGeneratedImage && onPresetChange) {
            onPresetChange(newPreset, fontSize, cardStyle);
        }
    };

    // Debounced font size change - waits 300ms after slider stops
    const debouncedFontSizeChange = useCallback((newFontSize: FontSize) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            if (hasGeneratedImage && onFontSizeChange) {
                onFontSizeChange(newFontSize);
            }
        }, 300);
    }, [hasGeneratedImage, onFontSizeChange]);

    const handleFontSizeSliderChange = (newFontSize: FontSize) => {
        setFontSize(newFontSize);
        debouncedFontSizeChange(newFontSize);
    };

    const handleCardStyleChange = (newCardStyle: CardStyle) => {
        setCardStyle(newCardStyle);
        if (hasGeneratedImage && onCardStyleChange) {
            onCardStyleChange(newCardStyle);
        }
    };

    const isValidUrl = (input: string): boolean => {
        if (!input.trim()) return true;
        try {
            const parsed = new URL(input);
            return parsed.hostname.includes('letterboxd.com') ||
                parsed.hostname === 'boxd.it';
        } catch {
            return false;
        }
    };

    const urlValid = isValidUrl(url);

    useEffect(() => {
        (window as unknown as { __lastReviewUrl?: string }).__lastReviewUrl = url;
    }, [url]);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    return (
        <form onSubmit={handleSubmit} className="review-form">
            {/* URL Input */}
            <div className="form-group">
                <label htmlFor="review-url" className="form-label">
                    Letterboxd Review URL
                </label>
                <div className="input-wrapper">
                    <input
                        type="url"
                        id="review-url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://letterboxd.com/username/film/movie-name/"
                        className={`url-input ${!urlValid ? 'invalid' : ''}`}
                        disabled={isLoading}
                        required
                    />
                    {url && !urlValid && (
                        <span className="validation-error">
                            Please enter a valid Letterboxd or boxd.it URL
                        </span>
                    )}
                </div>
            </div>

            {/* Options Row */}
            <div className="options-row">
                {/* Card Style Dropdown */}
                <div className="form-group compact">
                    <label htmlFor="card-style" className="form-label">
                        Card Style
                    </label>
                    <select
                        id="card-style"
                        value={cardStyle}
                        onChange={(e) => handleCardStyleChange(e.target.value as CardStyle)}
                        className="form-select"
                        disabled={isLoading}
                    >
                        {CARD_STYLES.map((style) => (
                            <option key={style.value} value={style.value}>
                                {style.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Image Size Dropdown */}
                <div className="form-group compact">
                    <label htmlFor="image-size" className="form-label">
                        Image Size
                    </label>
                    <select
                        id="image-size"
                        value={preset}
                        onChange={(e) => handlePresetChange(e.target.value as SizePreset)}
                        className="form-select"
                        disabled={isLoading}
                    >
                        {PRESETS.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Font Size Slider */}
            <div className="form-group">
                <label htmlFor="font-size-slider" className="form-label">
                    Font Size
                    <span className="font-size-value">{fontSize}%</span>
                </label>
                <div className="slider-container">
                    <span className="slider-label-min">50%</span>
                    <input
                        type="range"
                        id="font-size-slider"
                        min={50}
                        max={150}
                        step={5}
                        value={fontSize}
                        onChange={(e) => handleFontSizeSliderChange(parseInt(e.target.value))}
                        className="font-slider"
                        disabled={isLoading}
                    />
                    <span className="slider-label-max">150%</span>
                </div>
                {hasGeneratedImage && (
                    <span className="slider-hint">Drag to adjust • Updates automatically</span>
                )}
            </div>

            {/* Generate Button */}
            <button
                type="submit"
                className="generate-btn"
                disabled={isLoading || !url.trim() || !urlValid}
            >
                {isLoading ? (
                    <>
                        <span className="spinner"></span>
                        <span>Generating...</span>
                    </>
                ) : (
                    <>
                        <span className="btn-icon">✨</span>
                        <span>Generate Image</span>
                    </>
                )}
            </button>
        </form>
    );
}
