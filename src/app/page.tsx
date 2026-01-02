'use client';

import { useState, useRef, useCallback } from 'react';
import ReviewForm from '@/components/ReviewForm';
import ImagePreview from '@/components/ImagePreview';
import ErrorMessage from '@/components/ErrorMessage';
import ThemeToggle from '@/components/ThemeToggle';
import { SizePreset, FontSize, CardStyle } from '@/types/review';

interface MetadataInfo {
    sessionId: string;
    filmTitle: string;
    filmYear?: number;
    authorUsername: string;
    hasPoster: boolean;
}

export default function Home() {
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentPreset, setCurrentPreset] = useState<SizePreset>('square');
    const [currentFontSize, setCurrentFontSize] = useState<FontSize>(100);
    const [currentCardStyle, setCurrentCardStyle] = useState<CardStyle>('classic');
    const [imageBlob, setImageBlob] = useState<Blob | null>(null);
    const [metadataInfo, setMetadataInfo] = useState<MetadataInfo | null>(null);

    // Cache the session ID for fast re-renders
    const sessionIdRef = useRef<string | null>(null);

    // Render image using cached session ID (FAST - no poster re-fetch!)
    const renderWithSession = useCallback(async (
        sessionId: string,
        preset: SizePreset,
        fontSize: FontSize,
        cardStyle: CardStyle
    ) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/render-from-metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, preset, fontSize, cardStyle }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to render image');
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

    // First-time generation: fetch metadata then render
    const handleGenerate = async (url: string, preset: SizePreset, fontSize: FontSize, cardStyle: CardStyle) => {
        setIsFetchingMetadata(true);
        setError(null);

        try {
            // Step 1: Fetch metadata and cache on server (this fetches the poster)
            const metadataResponse = await fetch('/api/metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            if (!metadataResponse.ok) {
                const errorData = await metadataResponse.json();
                throw new Error(errorData.error || 'Failed to fetch review');
            }

            const data = await metadataResponse.json();

            // Store the session ID for fast re-renders
            sessionIdRef.current = data.sessionId;
            setMetadataInfo({
                sessionId: data.sessionId,
                filmTitle: data.filmTitle,
                filmYear: data.filmYear,
                authorUsername: data.authorUsername,
                hasPoster: data.hasPoster,
            });

            setIsFetchingMetadata(false);

            // Step 2: Render image using session ID
            await renderWithSession(data.sessionId, preset, fontSize, cardStyle);

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Something went wrong';
            setError(message);
            setIsLoading(false);
            setIsFetchingMetadata(false);
        }
    };

    // Instant style changes using cached session
    const handlePresetChange = (newPreset: SizePreset, fontSize: FontSize, cardStyle: CardStyle) => {
        if (sessionIdRef.current && !isLoading) {
            renderWithSession(sessionIdRef.current, newPreset, fontSize, cardStyle);
        }
    };

    const handleFontSizeChange = (newFontSize: FontSize) => {
        if (sessionIdRef.current && !isLoading) {
            renderWithSession(sessionIdRef.current, currentPreset, newFontSize, currentCardStyle);
        }
    };

    const handleCardStyleChange = (newCardStyle: CardStyle) => {
        if (sessionIdRef.current && !isLoading) {
            renderWithSession(sessionIdRef.current, currentPreset, currentFontSize, newCardStyle);
        }
    };

    const handleDownload = () => {
        if (!imageBlob || !metadataInfo) return;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(imageBlob);
        const safeName = metadataInfo.filmTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        link.download = `${safeName}-${currentCardStyle}-${currentPreset}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isProcessing = isLoading || isFetchingMetadata;

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

                        {/* Show loaded movie info */}
                        {metadataInfo && (
                            <div className="metadata-preview">
                                <span className="metadata-film">{metadataInfo.filmTitle}</span>
                                {metadataInfo.filmYear && <span className="metadata-year">({metadataInfo.filmYear})</span>}
                                <span className="metadata-user">by @{metadataInfo.authorUsername}</span>
                                {metadataInfo.hasPoster && <span className="metadata-badge">🎬 Poster loaded</span>}
                            </div>
                        )}

                        <ReviewForm
                            onSubmit={handleGenerate}
                            onPresetChange={handlePresetChange}
                            onFontSizeChange={handleFontSizeChange}
                            onCardStyleChange={handleCardStyleChange}
                            isLoading={isProcessing}
                            hasGeneratedImage={sessionIdRef.current !== null}
                        />

                        {/* Loading status */}
                        {isFetchingMetadata && (
                            <div className="loading-status">
                                <span className="spinner small"></span>
                                <span>Fetching review & poster...</span>
                            </div>
                        )}
                        {isLoading && !isFetchingMetadata && (
                            <div className="loading-status fast">
                                <span className="spinner small"></span>
                                <span>Rendering... (using cached poster ⚡)</span>
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
                                <span className="step-text">Style changes use cached data ⚡</span>
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
