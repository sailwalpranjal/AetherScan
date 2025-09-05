'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHome, FiMap, FiSearch, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';

// ==========================================
// INTERFACES & TYPES
// ==========================================

interface NotFoundPageProps {
  readonly searchParams?: Record<string, string | string[] | undefined>;
  readonly params?: Record<string, string | undefined>;
}

interface QuickLink {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly icon: React.ComponentType<{ size?: number; className?: string }>;
  readonly external?: boolean;
}

interface NavigationState {
  readonly canGoBack: boolean;
  readonly referrer: string | null;
  readonly hasHistory: boolean;
}

// ==========================================
// CONSTANTS
// ==========================================

const ANIMATION_VARIANTS = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3 },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12,
      },
    },
  },
  illustration: {
    hidden: { opacity: 0, scale: 0.8, rotateY: -15 },
    visible: {
      opacity: 1,
      scale: 1,
      rotateY: 0,
      transition: {
        type: 'spring',
        stiffness: 120,
        damping: 15,
        duration: 0.8,
      },
    },
  },
  satellite: {
    float: {
      y: [-10, 10, -10], // Removed readonly to fix Framer Motion compatibility
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
    rotate: {
      rotate: 360,
      transition: {
        duration: 20,
        repeat: Infinity,
        ease: 'linear',
      },
    },
  },
};

const QUICK_LINKS: readonly QuickLink[] = [
  {
    id: 'dashboard',
    title: 'Air Quality Dashboard',
    description: 'Real-time monitoring and analytics',
    href: '/dashboard',
    icon: FiMap,
  },
  {
    id: 'search',
    title: 'Search Locations',
    description: 'Find air quality data for your area',
    href: '/search',
    icon: FiSearch,
  },
  {
    id: 'home',
    title: 'Home Page',
    description: 'Return to the main page',
    href: '/',
    icon: FiHome,
  },
] as const;

const ERROR_SUGGESTIONS = [
  'Double-check the URL for any typos or errors',
  'Use the search function to find specific locations',
  'Browse our interactive air quality map',
  'Check our main dashboard for real-time data',
  'Contact support if you believe this is an error',
] as const;

// ==========================================
// CUSTOM HOOKS
// ==========================================

function useNavigationState(): NavigationState {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    canGoBack: false,
    referrer: null,
    hasHistory: false,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const referrer = document.referrer || null;
      const hasHistory = window.history.length > 1;
      const canGoBack = hasHistory && referrer !== null;

      setNavigationState({
        canGoBack,
        referrer,
        hasHistory,
      });
    }
  }, []);

  return navigationState;
}

function useErrorReporting(searchParams?: Record<string, string | string[] | undefined>) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const errorData = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer || 'direct',
        userAgent: navigator.userAgent,
        searchParams: searchParams || {},
        viewportSize: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      };

      // Log to console for development
      console.warn('404 Error - Page Not Found:', errorData);

      // In production, this would be sent to your error tracking service
      // Example: analytics.track('404_page_viewed', errorData);
    }
  }, [searchParams]);
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function NotFoundPage({ searchParams }: NotFoundPageProps): React.JSX.Element {
  const router = useRouter();
  const navigationState = useNavigationState();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Custom hooks
  useErrorReporting(searchParams);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ==========================================
  // NAVIGATION HANDLERS
  // ==========================================


  const handleGoBack = useCallback(async () => {
    try {
      setIsLoading('back');
      
      if (navigationState.canGoBack) {
        window.history.back();
      } else {
        await router.push('/');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = '/';
    } finally {
      setTimeout(() => setIsLoading(null), 1000); // Allow time for history.back()
    }
  }, [router, navigationState.canGoBack]);

  const handleQuickLink = useCallback(async (href: string, external?: boolean) => {
    try {
      setIsLoading(href);
      
      if (external) {
        window.open(href, '_blank', 'noopener,noreferrer');
        setIsLoading(null);
        return;
      }

      await router.push(href);
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = href;
    } finally {
      setTimeout(() => setIsLoading(null), 500);
    }
  }, [router]);

  const handleRefresh = useCallback(() => {
    setIsLoading('refresh');
    window.location.reload();
  }, []);

  // ==========================================
  // MEMOIZED VALUES
  // ==========================================

  const currentUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.pathname + window.location.search;
  }, [mounted]);

  const backButtonText = useMemo(() => {
    return navigationState.canGoBack ? 'Go Back' : 'Go Home';
  }, [navigationState.canGoBack]);

  // ==========================================
  // RENDER GUARDS
  // ==========================================

  if (!mounted) {
    return (
      <div className="not-found-page not-found-loading">
        <div className="loading-spinner" aria-label="Loading...">
          <motion.div
            className="spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="not-found-page"
        variants={ANIMATION_VARIANTS.container}
        initial="hidden"
        animate="visible"
        exit="exit"
        role="main"
        aria-labelledby="not-found-title"
        aria-describedby="not-found-description"
      >
        <div className="not-found-container">
          <motion.div className="not-found-content" variants={ANIMATION_VARIANTS.item}>
            
            {/* 404 Illustration */}
            <motion.div 
              className="not-found-illustration"
              variants={ANIMATION_VARIANTS.illustration}
              aria-hidden="true"
            >
              <div className="illustration-404">
                <span className="four" aria-hidden="true">4</span>
                <div className="zero">
                  <motion.div 
                    className="satellite-icon"
                    variants={ANIMATION_VARIANTS.satellite}
                    animate={['float', 'rotate']}
                    aria-hidden="true"
                  >
                    🛰️
                  </motion.div>
                  <div className="orbit-ring" aria-hidden="true" />
                </div>
                <span className="four" aria-hidden="true">4</span>
              </div>
              
              <motion.div 
                className="illustration-subtitle"
                variants={ANIMATION_VARIANTS.item}
              >
                Signal not found
              </motion.div>
            </motion.div>

            {/* Main Content */}
            <motion.div className="not-found-text" variants={ANIMATION_VARIANTS.item}>
              <h1 id="not-found-title" className="not-found-title">
                Page Not Found
              </h1>
              <p id="not-found-description" className="not-found-description">
                The page you're looking for seems to have drifted out of our monitoring range. 
                It might have been moved, deleted, or the URL might be incorrect.
              </p>
              
              {currentUrl && (
                <div className="url-display" aria-label="Current URL">
                  <strong>Attempted URL:</strong>{' '}
                  <code className="url-code">{currentUrl}</code>
                </div>
              )}
            </motion.div>

            {/* Suggestions */}
            <motion.div className="suggestions" variants={ANIMATION_VARIANTS.item}>
              <h2 className="suggestions-title">What you can do:</h2>
              <ul className="suggestions-list" role="list">
                {ERROR_SUGGESTIONS.map((suggestion, index) => (
                  <motion.li
                    key={index}
                    variants={ANIMATION_VARIANTS.item}
                    custom={index}
                    role="listitem"
                  >
                    {suggestion}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Action Buttons */}
            <motion.div className="not-found-actions" variants={ANIMATION_VARIANTS.item}>
              <Button
                variant="primary"
                size="lg"
                leftIcon={navigationState.canGoBack ? <FiArrowLeft /> : <FiHome />}
                onClick={handleGoBack}
                loading={isLoading === 'back' || isLoading === 'home'}
                disabled={!!isLoading}
                className="primary-action"
                ariaLabel={backButtonText}
              >
                {backButtonText}
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                leftIcon={<FiRefreshCw />}
                onClick={handleRefresh}
                loading={isLoading === 'refresh'}
                disabled={!!isLoading}
                ariaLabel="Refresh page"
              >
                Refresh Page
              </Button>
            </motion.div>

            {/* Quick Links */}
            <motion.div className="quick-links" variants={ANIMATION_VARIANTS.item}>
              <h2 className="quick-links-title">Or try these popular sections:</h2>
              <div className="quick-links-grid" role="list">
                {QUICK_LINKS.map((link, index) => (
                  <motion.div
                    key={link.id}
                    className="quick-link-card"
                    variants={ANIMATION_VARIANTS.item}
                    custom={index}
                    whileHover={{ 
                      y: -4, 
                      scale: 1.02,
                      transition: { type: 'spring', stiffness: 300, damping: 20 }
                    }}
                    whileTap={{ scale: 0.98 }}
                    role="listitem"
                  >
                    <button
                      onClick={() => handleQuickLink(link.href, link.external)}
                      disabled={!!isLoading}
                      className="quick-link-button"
                      aria-label={`Navigate to ${link.title}: ${link.description}`}
                    >
                      <div className="quick-link-icon" aria-hidden="true">
                        <link.icon size={24} />
                      </div>
                      <div className="quick-link-content">
                        <h3 className="quick-link-title">{link.title}</h3>
                        <p className="quick-link-description">{link.description}</p>
                      </div>
                      {isLoading === link.href && (
                        <div className="quick-link-loading" aria-hidden="true">
                          <motion.div
                            className="loading-spinner-small"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          />
                        </div>
                      )}
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Styles */}
        <style>{`
          .not-found-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--space-xl);
            background: radial-gradient(ellipse at center, rgba(0, 212, 170, 0.05) 0%, transparent 70%),
                        linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
            position: relative;
            overflow: hidden;
          }

          .not-found-page::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: 
              radial-gradient(circle at 20% 20%, rgba(0, 212, 170, 0.1) 0%, transparent 30%),
              radial-gradient(circle at 80% 80%, rgba(108, 92, 231, 0.1) 0%, transparent 30%);
            pointer-events: none;
            z-index: -1;
          }

          .not-found-loading {
            background: var(--color-bg-primary);
          }

          .loading-spinner {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .spinner,
          .loading-spinner-small {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(0, 212, 170, 0.2);
            border-top-color: var(--color-primary);
            border-radius: 50%;
          }

          .loading-spinner-small {
            width: 20px;
            height: 20px;
            border-width: 2px;
          }

          .not-found-container {
            max-width: 900px;
            width: 100%;
            text-align: center;
            position: relative;
            z-index: 1;
          }

          .not-found-content {
            padding: var(--space-3xl);
            background: var(--glass-bg);
            backdrop-filter: var(--glass-backdrop-filter);
            border: 1px solid var(--glass-border);
            border-radius: var(--border-radius-2xl);
            box-shadow: var(--glass-shadow);
          }

          /* 404 Illustration */
          .not-found-illustration {
            margin-bottom: var(--space-3xl);
          }

          .illustration-404 {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-lg);
            margin-bottom: var(--space-md);
          }

          .four {
            font-size: 8rem;
            font-weight: var(--font-weight-extrabold);
            color: var(--color-primary);
            text-shadow: 0 0 30px rgba(0, 212, 170, 0.3);
            line-height: 1;
          }

          .zero {
            position: relative;
            width: 120px;
            height: 120px;
            border: 6px solid var(--color-primary);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: visible;
          }

          .orbit-ring {
            position: absolute;
            inset: -6px;
            border-radius: 50%;
            border: 2px solid transparent;
            background: conic-gradient(from 0deg, var(--color-primary), transparent, var(--color-primary));
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: xor;
            -webkit-mask-composite: xor;
            animation: orbit-rotate 4s linear infinite;
          }

          .satellite-icon {
            font-size: var(--font-size-3xl);
            z-index: 2;
          }

          .illustration-subtitle {
            font-size: var(--font-size-lg);
            color: var(--color-text-secondary);
            font-weight: var(--font-weight-medium);
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }

          /* Content */
          .not-found-text {
            margin-bottom: var(--space-3xl);
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
          }

          .not-found-title {
            font-size: var(--font-size-3xl);
            font-weight: var(--font-weight-bold);
            color: var(--color-text-primary);
            margin-bottom: var(--space-lg);
            line-height: var(--line-height-tight);
          }

          .not-found-description {
            font-size: var(--font-size-lg);
            color: var(--color-text-secondary);
            line-height: var(--line-height-relaxed);
            margin-bottom: var(--space-xl);
          }

          .url-display {
            background: rgba(255, 255, 255, 0.05);
            padding: var(--space-md);
            border-radius: var(--border-radius-md);
            border: 1px solid var(--color-border);
            font-size: var(--font-size-sm);
            color: var(--color-text-secondary);
          }

          .url-code {
            font-family: var(--font-family-mono);
            background: rgba(0, 0, 0, 0.2);
            padding: var(--space-xs) var(--space-sm);
            border-radius: var(--border-radius-sm);
            color: var(--color-primary);
            word-break: break-all;
          }

          /* Suggestions */
          .suggestions {
            text-align: left;
            background: rgba(255, 255, 255, 0.05);
            padding: var(--space-xl);
            border-radius: var(--border-radius-lg);
            border: 1px solid var(--color-border);
            margin-bottom: var(--space-3xl);
          }

          .suggestions-title {
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-semibold);
            color: var(--color-text-primary);
            margin-bottom: var(--space-md);
          }

          .suggestions-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .suggestions-list li {
            font-size: var(--font-size-sm);
            color: var(--color-text-secondary);
            line-height: var(--line-height-relaxed);
            margin-bottom: var(--space-xs);
            position: relative;
            padding-left: var(--space-lg);
          }

          .suggestions-list li::before {
            content: '→';
            position: absolute;
            left: 0;
            color: var(--color-primary);
            font-weight: bold;
          }

          /* Actions */
          .not-found-actions {
            display: flex;
            gap: var(--space-lg);
            margin-bottom: var(--space-3xl);
            flex-wrap: wrap;
            justify-content: center;
          }

          .primary-action {
            position: relative;
            overflow: hidden;
          }

          /* Quick Links */
          .quick-links {
            width: 100%;
          }

          .quick-links-title {
            font-size: var(--font-size-lg);
            font-weight: var(--font-weight-semibold);
            color: var(--color-text-primary);
            margin-bottom: var(--space-lg);
          }

          .quick-links-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: var(--space-lg);
            max-width: 100%;
          }

          .quick-link-card {
            position: relative;
          }

          .quick-link-button {
            width: 100%;
            padding: var(--space-lg);
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--color-border);
            border-radius: var(--border-radius-lg);
            color: inherit;
            text-align: left;
            cursor: pointer;
            transition: all var(--transition-normal);
            display: flex;
            align-items: flex-start;
            gap: var(--space-md);
            position: relative;
          }

          .quick-link-button:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--color-primary);
          }

          .quick-link-button:focus-visible {
            outline: 2px solid var(--color-primary);
            outline-offset: 2px;
          }

          .quick-link-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .quick-link-icon {
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 212, 170, 0.1);
            border-radius: var(--border-radius-md);
            color: var(--color-primary);
          }

          .quick-link-content {
            flex: 1;
            min-width: 0;
          }

          .quick-link-title {
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-semibold);
            color: var(--color-text-primary);
            margin-bottom: var(--space-xs);
          }

          .quick-link-description {
            font-size: var(--font-size-sm);
            color: var(--color-text-secondary);
            line-height: var(--line-height-relaxed);
          }

          .quick-link-loading {
            position: absolute;
            right: var(--space-lg);
            top: 50%;
            transform: translateY(-50%);
          }

          /* Animations */
          @keyframes orbit-rotate {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          /* Responsive Design */
          @media (max-width: 768px) {
            .not-found-page {
              padding: var(--space-lg);
            }

            .not-found-content {
              padding: var(--space-xl);
            }

            .four {
              font-size: 6rem;
            }

            .zero {
              width: 100px;
              height: 100px;
            }

            .not-found-title {
              font-size: var(--font-size-2xl);
            }

            .not-found-actions {
              flex-direction: column;
              align-items: stretch;
            }

            .quick-links-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 480px) {
            .illustration-404 {
              flex-direction: column;
              gap: var(--space-md);
            }

            .four {
              font-size: 4rem;
            }

            .zero {
              width: 80px;
              height: 80px;
            }
          }

          /* High contrast mode support */
          @media (prefers-contrast: high) {
            .not-found-content {
              border-width: 2px;
              border-color: currentColor;
            }

            .quick-link-button {
              border-width: 2px;
            }

            .orbit-ring {
              border-width: 3px;
            }
          }

          /* Reduced motion support */
          @media (prefers-reduced-motion: reduce) {
            .orbit-ring {
              animation: none;
            }

            .satellite-icon {
              animation: none;
            }
          }

          /* Print styles */
          @media print {
            .not-found-page {
              background: white;
              color: black;
              min-height: auto;
            }

            .not-found-content {
              background: white;
              box-shadow: none;
              border: 1px solid black;
            }

            .not-found-actions,
            .quick-links {
              display: none;
            }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}