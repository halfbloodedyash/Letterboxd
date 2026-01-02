'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReviewForm from '@/components/ReviewForm';
import ImagePreview from '@/components/ImagePreview';
import ErrorMessage from '@/components/ErrorMessage';
import ThemeToggle from '@/components/ThemeToggle';
import { SizePreset, FontSize, CardStyle } from '@/types/review';

export default function Home() {
    const [isLoading, setIsLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentPreset, setCurrentPreset] = useState<SizePreset>('square');
    const [currentFontSize, setCurrentFontSize] = useState<FontSize>(100);
    const [currentCardStyle, setCurrentCardStyle] = useState<CardStyle>('classic');
    const [imageBlob, setImageBlob] = useState<Blob | null>(null);

    const lastUrlRef = useRef<string>('');

    // Generate image from URL
    const generateImage = useCallback(async (
        url: string,
        preset: SizePreset,
        fontSize: FontSize,
        cardStyle: CardStyle
    ) => {
        setIsLoading(true);
        setError(null);
        lastUrlRef.current = url;

        try {
            const response = await fetch('/api/render', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, preset, fontSize, cardStyle }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate image');
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }

            setImageBlob(blob);
            setImageUrl(objectUrl);
            setCurrentPreset(preset);
            setCurrentFontSize(fontSize);
            setCurrentCardStyle(cardStyle);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Something went wrong';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [imageUrl]);

    // First-time generation
    const handleGenerate = async (url: string, preset: SizePreset, fontSize: FontSize, cardStyle: CardStyle) => {
        await generateImage(url, preset, fontSize, cardStyle);
    };

    // Style changes - regenerate with same URL
    const handlePresetChange = (newPreset: SizePreset, fontSize: FontSize, cardStyle: CardStyle) => {
        if (lastUrlRef.current && !isLoading) {
            generateImage(lastUrlRef.current, newPreset, fontSize, cardStyle);
        }
    };

    const handleFontSizeChange = (newFontSize: FontSize) => {
        if (lastUrlRef.current && !isLoading) {
            generateImage(lastUrlRef.current, currentPreset, newFontSize, currentCardStyle);
        }
    };

    const handleCardStyleChange = (newCardStyle: CardStyle) => {
        if (lastUrlRef.current && !isLoading) {
            generateImage(lastUrlRef.current, currentPreset, currentFontSize, newCardStyle);
        }
    };

    const handleDownload = () => {
        if (!imageBlob) return;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(imageBlob);
        link.download = `letterboxd-review-${currentCardStyle}-${currentPreset}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <main className="main-container">
            <ThemeToggle />

            <section className="hero">
                <div className="hero-glow"></div>
                <div className="hero-content">
                    <div className="logo-container">
                        <div className="logo-dots">
                            <span className="dot orange"></span>
                            <span className="dot green"></span>
                            <span className="dot blue"></span>
                        </div>
                        <h1 className="site-title">Letterboxd Image Generator</h1>
                    </div>
                    <p className="site-description">
                        Transform your Letterboxd reviews into beautiful, shareable images.
                        Perfect for Instagram, Twitter, and Stories.
                    </p>
                </div>
            </section>

            <div className="content-grid">
                <section className="form-section">
                    <div className="section-card">
                        <h2 className="section-title">Create Your Image</h2>

                        <ReviewForm
                            onSubmit={handleGenerate}
                            onPresetChange={handlePresetChange}
                            onFontSizeChange={handleFontSizeChange}
                            onCardStyleChange={handleCardStyleChange}
                            isLoading={isLoading}
                            hasGeneratedImage={lastUrlRef.current !== ''}
                        />

                        {isLoading && (
                            <div className="loading-status">
                                <span className="spinner small"></span>
                                <span>Generating image...</span>
                            </div>
                        )}

                        {error && (
                            <ErrorMessage
                                message={error}
                                onDismiss={() => setError(null)}
                            />
                        )}
                    </div>

                    <div className="section-card how-it-works">
                        <h3 className="subsection-title">How it works</h3>
                        <ol className="steps-list">
                            <li>
                                <span className="step-number">1</span>
                                <span className="step-text">Paste a Letterboxd review URL</span>
                            </li>
                            <li>
                                <span className="step-number">2</span>
                                <span className="step-text">Choose style, size & font</span>
                            </li>
                            <li>
                                <span className="step-number">3</span>
                                <span className="step-text">Download your beautiful card</span>
                            </li>
                        </ol>
                    </div>
                </section>

                <section className="preview-section">
                    <div className="section-card preview-card">
                        <h2 className="section-title">Preview</h2>
                        <ImagePreview
                            imageUrl={imageUrl}
                            preset={currentPreset}
                            onDownload={handleDownload}
                        />
                    </div>
                </section>
            </div>

            <footer className="footer">
                <p>
                    Made with ♥ for film lovers. Not affiliated with Letterboxd.
                </p>
            </footer>
        </main>
    );
}
