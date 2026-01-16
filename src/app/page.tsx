'use client';

import { useState, useRef, useCallback } from 'react';
import ReviewForm from '@/components/ReviewForm';
import ImagePreview from '@/components/ImagePreview';
import ErrorMessage from '@/components/ErrorMessage';
import PreviewModal from '@/components/PreviewModal';
import { SizePreset, FontSize, CardStyle, ReviewMetadata } from '@/types/review';
import { renderCardToCanvas } from '@/lib/client-canvas-renderer';

export default function Home() {
    const [isLoading, setIsLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentPreset, setCurrentPreset] = useState<SizePreset>('square');
    const [currentFontSize, setCurrentFontSize] = useState<FontSize>(100);
    const [currentCardStyle, setCurrentCardStyle] = useState<CardStyle>('classic');
    const [imageBlob, setImageBlob] = useState<Blob | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const lastUrlRef = useRef<string>('');

    // Generate image using hybrid approach: server-side parsing + client-side Canvas rendering
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
            // Parse review metadata (server-side - uses cheerio)
            const parseResponse = await fetch('/api/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            if (!parseResponse.ok) {
                const errorData = await parseResponse.json();
                throw new Error(errorData.error || 'Failed to parse review');
            }

            const metadata: ReviewMetadata = await parseResponse.json();

            // Render to canvas (client-side - eliminates Playwright costs!)
            const blob = await renderCardToCanvas(metadata, preset, fontSize, cardStyle);
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

    const handlePreview = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    return (
        <main className="main-container">

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
                            onPreview={handlePreview}
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

            {isModalOpen && imageUrl && (
                <PreviewModal
                    imageUrl={imageUrl}
                    onClose={handleCloseModal}
                    onDownload={handleDownload}
                />
            )}
        </main>
    );
}
