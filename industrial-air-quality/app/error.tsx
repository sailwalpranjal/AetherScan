'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiRefreshCw, FiHome, FiMail } from 'react-icons/fi';

import { Button } from '@/components/ui/Button';
import { createErrorReport } from '@/lib/utils';

// ==========================================
// ERROR PAGE COMPONENT
// ==========================================

interface ErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps): React.JSX.Element {
  
  useEffect(() => {
    // Log error for monitoring and debugging
    const errorReport = createErrorReport(error, {
      component: 'ErrorBoundary',
      digest: error.digest
    });
    
    console.error('Application Error:', errorReport);
    
    // In a production app, you would send this to your error tracking service
    // Example: Sentry.captureException(error, { contexts: { errorReport } });
  }, [error]);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent('Application Error Report');
    const body = encodeURIComponent(`
Error Details:
- Message: ${error.message}
- Timestamp: ${new Date().toISOString()}
- Page: ${window.location.href}
- User Agent: ${navigator.userAgent}

Additional Information:
${error.digest ? `- Digest: ${error.digest}` : ''}
${error.stack ? `- Stack: ${error.stack}` : ''}
    `);
    
    window.location.href = `mailto:team@airquality.monitor?subject=${subject}&body=${body}`;
  };

  return (
    <div className="error-page">
      <div className="error-container">
        <motion.div
          className="error-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Error Icon */}
          <motion.div 
            className="error-icon"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <FiAlertTriangle size={64} />
          </motion.div>

          {/* Error Message */}
          <motion.div
            className="error-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h1 className="error-title">Something went wrong!</h1>
            <p className="error-description">
              We encountered an unexpected error while loading the air quality monitoring system. 
              Our team has been notified and is working to resolve this issue.
            </p>
            
            {error.message && (
              <details className="error-details">
                <summary>Error Details</summary>
                <code className="error-message">{error.message}</code>
                {error.digest && (
                  <p className="error-digest">Error ID: {error.digest}</p>
                )}
              </details>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="error-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <Button
              variant="primary"
              size="lg"
              leftIcon={<FiRefreshCw />}
              onClick={reset}
              className="retry-button"
            >
              Try Again
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              leftIcon={<FiHome />}
              onClick={handleGoHome}
            >
              Go Home
            </Button>
            
            <Button
              variant="ghost"
              size="md"
              leftIcon={<FiMail />}
              onClick={handleContactSupport}
            >
              Contact Support
            </Button>
          </motion.div>
        </motion.div>

        {/* Background Elements */}
        <div className="error-background">
          <div className="floating-shape shape-1" />
          <div className="floating-shape shape-2" />
          <div className="floating-shape shape-3" />
        </div>
      </div>

      <style>{`
        .error-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-background);
          padding: var(--space-lg);
          position: relative;
          overflow: hidden;
        }

        .error-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 600px;
        }

        .error-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: var(--space-3xl);
          background: var(--glass-bg);
          backdrop-filter: var(--glass-backdrop-filter);
          border: 1px solid var(--glass-border);
          border-radius: var(--border-radius-2xl);
          box-shadow: var(--glass-shadow);
        }

        .error-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 120px;
          height: 120px;
          background: rgba(232, 67, 147, 0.1);
          border: 3px solid var(--color-error);
          border-radius: 50%;
          color: var(--color-error);
          margin-bottom: var(--space-2xl);
          position: relative;
        }

        .error-icon::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          padding: 3px;
          background: conic-gradient(from 0deg, var(--color-error), transparent, var(--color-error));
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: xor;
          animation: rotate 3s linear infinite;
        }

        .error-text {
          margin-bottom: var(--space-2xl);
        }

        .error-title {
          font-size: var(--font-size-3xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-text-primary);
          margin-bottom: var(--space-lg);
          line-height: var(--line-height-tight);
        }

        .error-description {
          font-size: var(--font-size-lg);
          color: var(--color-text-secondary);
          line-height: var(--line-height-relaxed);
          margin-bottom: var(--space-lg);
        }

        .error-details {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--color-border);
          border-radius: var(--border-radius-lg);
          padding: var(--space-lg);
          margin-top: var(--space-lg);
          text-align: left;
          max-width: 100%;
        }

        .error-details summary {
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          cursor: pointer;
          margin-bottom: var(--space-md);
        }

        .error-message {
          display: block;
          font-family: var(--font-family-mono);
          font-size: var(--font-size-sm);
          color: var(--color-error);
          background: rgba(232, 67, 147, 0.1);
          padding: var(--space-sm);
          border-radius: var(--border-radius-md);
          word-break: break-all;
          overflow-wrap: break-word;
        }

        .error-digest {
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
          margin-top: var(--space-sm);
          font-family: var(--font-family-mono);
        }

        .error-actions {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          width: 100%;
          max-width: 300px;
        }

        .retry-button {
          position: relative;
          overflow: hidden;
        }

        .retry-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .retry-button:hover::before {
          left: 100%;
        }

        .error-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          overflow: hidden;
        }

        .floating-shape {
          position: absolute;
          border-radius: 50%;
          background: var(--color-error);
          opacity: 0.05;
          animation: float 8s ease-in-out infinite;
        }

        .shape-1 {
          width: 200px;
          height: 200px;
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .shape-2 {
          width: 150px;
          height: 150px;
          top: 60%;
          right: 15%;
          animation-delay: 2s;
        }

        .shape-3 {
          width: 100px;
          height: 100px;
          bottom: 20%;
          left: 20%;
          animation-delay: 4s;
        }

        @keyframes rotate {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          33% {
            transform: translateY(-20px) scale(1.05);
          }
          66% {
            transform: translateY(10px) scale(0.95);
          }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .error-page {
            padding: var(--space-md);
          }

          .error-content {
            padding: var(--space-2xl) var(--space-lg);
          }

          .error-icon {
            width: 100px;
            height: 100px;
          }

          .error-icon svg {
            width: 48px;
            height: 48px;
          }

          .error-title {
            font-size: var(--font-size-2xl);
          }

          .error-description {
            font-size: var(--font-size-base);
          }
        }

        @media (max-width: 480px) {
          .error-actions {
            gap: var(--space-sm);
          }

          .floating-shape {
            display: none;
          }
        }

        /* High Contrast Mode */
        @media (prefers-contrast: high) {
          .error-content {
            background: var(--color-surface);
            border: 2px solid var(--color-border);
          }

          .error-details {
            background: var(--color-surface-elevated);
            border: 2px solid var(--color-border);
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .error-icon::before {
            animation: none;
          }

          .floating-shape {
            animation: none;
          }

          .retry-button::before {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}