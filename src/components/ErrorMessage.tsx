'use client';

interface ErrorMessageProps {
    message: string;
    onDismiss?: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
    return (
        <div className="error-message">
            <div className="error-content">
                <span className="error-icon">⚠️</span>
                <span className="error-text">{message}</span>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="error-dismiss" aria-label="Dismiss">
                    ✕
                </button>
            )}
        </div>
    );
}
