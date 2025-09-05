// app/hooks/usePrefersReducedMotion.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ==========================================
// ENTERPRISE-GRADE TYPE DEFINITIONS
// ==========================================

interface MotionPreferences {
  readonly prefersReducedMotion: boolean;
  readonly mediaQuery: string;
  readonly isSupported: boolean;
  readonly hasChanged: boolean;
}

interface UseMotionPreferencesOptions {
  readonly includeMetadata?: boolean;
  readonly onPreferenceChange?: (prefersReduced: boolean) => void;
  readonly defaultValue?: boolean;
  readonly enableTransitionOverride?: boolean;
  readonly enableSystemSync?: boolean;
}

interface MediaQueryState {
  mediaQuery: MediaQueryList | null;
  isModernAPI: boolean;
  hasListener: boolean;
  listenerFunction: ((event: MediaQueryListEvent) => void) | null;
  legacyListenerFunction: ((mql: MediaQueryList) => void) | null;
}

// ==========================================
// PRODUCTION-GRADE CONSTANTS
// ==========================================

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const CSS_TRANSITION_OVERRIDE = `
  *, *::before, *::after {
    animation-duration: var(--motion-duration, 0.01ms) !important;
    animation-delay: var(--motion-delay, 0s) !important;
    transition-duration: var(--motion-duration, 0.01ms) !important;
    transition-delay: var(--motion-delay, 0s) !important;
  }
`;

// ==========================================
// CROSS-BROWSER COMPATIBILITY UTILITIES
// ==========================================

const detectMediaQuerySupport = (): boolean => {
  try {
    return typeof window !== 'undefined' && 
           'matchMedia' in window && 
           typeof window.matchMedia === 'function';
  } catch {
    return false;
  }
};

const createMediaQuery = (query: string): MediaQueryList | null => {
  try {
    return window.matchMedia(query);
  } catch (error) {
    console.warn('Failed to create media query:', error);
    return null;
  }
};

// ==========================================
// HIGH-PERFORMANCE REDUCED MOTION DETECTION
// ==========================================

export function usePrefersReducedMotion(defaultValue = false): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
    // SSR-safe initialization with immediate sync check
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    // Immediate synchronous check for optimal first render
    try {
      const mediaQuery = createMediaQuery(REDUCED_MOTION_QUERY);
      return mediaQuery?.matches ?? defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const stateRef = useRef<MediaQueryState>({
    mediaQuery: null,
    isModernAPI: false,
    hasListener: false,
    listenerFunction: null,
    legacyListenerFunction: null
  });

  // ==========================================
  // ADVANCED EVENT HANDLER WITH PERFORMANCE OPTIMIZATION
  // ==========================================

  const handleMediaQueryChange = useCallback((event: MediaQueryListEvent) => {
    // Use RAF to prevent layout thrashing during rapid preference changes
    requestAnimationFrame(() => {
      setPrefersReduced(event.matches);
      
      // Update CSS custom properties for real-time transition control
      try {
        const duration = event.matches ? '0.01ms' : '';
        document.documentElement.style.setProperty('--motion-duration', duration);
      } catch (error) {
        console.warn('Failed to update motion CSS properties:', error);
      }
    });
  }, []);

  // Legacy handler for older browsers with proper typing
  const handleLegacyMediaQueryChange = useCallback((mql: MediaQueryList) => {
    handleMediaQueryChange({ matches: mql.matches } as MediaQueryListEvent);
  }, [handleMediaQueryChange]);

  // ==========================================
  // ENTERPRISE-GRADE LIFECYCLE MANAGEMENT
  // ==========================================

  useEffect(() => {
    // Client-side only execution with comprehensive error handling
    if (typeof window === 'undefined' || !detectMediaQuerySupport()) {
      return;
    }

    const state = stateRef.current;
    
    try {
      // Create media query with error boundaries
      const mediaQuery = createMediaQuery(REDUCED_MOTION_QUERY);
      if (!mediaQuery) {
        console.warn('Media query creation failed, falling back to default value');
        setPrefersReduced(defaultValue);
        return;
      }

      state.mediaQuery = mediaQuery;
      
      // Synchronize initial state
      if (mediaQuery.matches !== prefersReduced) {
        setPrefersReduced(mediaQuery.matches);
      }

      // Detect API capabilities with comprehensive browser compatibility
      const supportsModernEventListener = 'addEventListener' in mediaQuery;
      const supportsLegacyListener = 'addListener' in mediaQuery;
      
      if (supportsModernEventListener) {
        // Modern addEventListener approach (preferred)
        state.isModernAPI = true;
        state.listenerFunction = handleMediaQueryChange;
        
        mediaQuery.addEventListener('change', handleMediaQueryChange, {
          passive: true,
          capture: false
        });
        state.hasListener = true;
        
      } else if (supportsLegacyListener) {
        // Legacy addListener approach for older browsers
        state.isModernAPI = false;
        state.legacyListenerFunction = handleLegacyMediaQueryChange;
        
        // TypeScript type assertion for legacy API compatibility
        (mediaQuery as any).addListener(handleLegacyMediaQueryChange);
        state.hasListener = true;
        
      } else {
        console.warn('No compatible media query listener API available');
      }

      // Initialize CSS custom properties
      const initialDuration = mediaQuery.matches ? '0.01ms' : '';
      document.documentElement.style.setProperty('--motion-duration', initialDuration);

    } catch (error) {
      console.error('Failed to initialize motion preference detection:', error);
      setPrefersReduced(defaultValue);
    }

    // ==========================================
    // COMPREHENSIVE CLEANUP WITH ERROR BOUNDARIES
    // ==========================================
    
    return () => {
      const state = stateRef.current;
      
      if (state.mediaQuery && state.hasListener) {
        try {
          if (state.isModernAPI && state.listenerFunction) {
            // Modern removeEventListener cleanup
            state.mediaQuery.removeEventListener('change', state.listenerFunction);
          } else if (!state.isModernAPI && state.legacyListenerFunction) {
            // Legacy removeListener cleanup with type safety
            const legacyMediaQuery = state.mediaQuery as any;
            if (legacyMediaQuery.removeListener) {
              legacyMediaQuery.removeListener(state.legacyListenerFunction);
            }
          }
        } catch (error) {
          console.warn('Non-critical error during media query cleanup:', error);
        }
      }
      
      // Reset state for garbage collection
      state.mediaQuery = null;
      state.hasListener = false;
      state.listenerFunction = null;
      state.legacyListenerFunction = null;
      
      // Clean up CSS custom properties
      try {
        document.documentElement.style.removeProperty('--motion-duration');
      } catch (error) {
        console.warn('Failed to cleanup motion CSS properties:', error);
      }
    };
  }, [handleMediaQueryChange, handleLegacyMediaQueryChange, prefersReduced, defaultValue]);

  return prefersReduced;
}

// ==========================================
// ADVANCED MOTION PREFERENCES WITH METADATA
// ==========================================

export function useMotionPreferences(
  options: UseMotionPreferencesOptions = {}
): MotionPreferences {
  const {
    onPreferenceChange,
    defaultValue = false,
    enableTransitionOverride = true,
    enableSystemSync = true
  } = options;

  const [preferences, setPreferences] = useState<MotionPreferences>(() => {
    const initialReduced = typeof window !== 'undefined' 
      ? window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? defaultValue
      : defaultValue;

    return {
      prefersReducedMotion: initialReduced,
      mediaQuery: REDUCED_MOTION_QUERY,
      isSupported: detectMediaQuerySupport(),
      hasChanged: false
    };
  });

  const changeCountRef = useRef(0);
  const mediaQueryRef = useRef<MediaQueryList | null>(null);
  const styleElementRef = useRef<HTMLStyleElement | null>(null);

  // ==========================================
  // ENHANCED CHANGE HANDLER WITH ANALYTICS
  // ==========================================

  const handlePreferenceChange = useCallback((event: MediaQueryListEvent) => {
    const newPreference = event.matches;
    changeCountRef.current += 1;

    // Batch updates with RAF for optimal performance
    requestAnimationFrame(() => {
      setPreferences(prev => ({
        ...prev,
        prefersReducedMotion: newPreference,
        hasChanged: changeCountRef.current > 0
      }));

      // Trigger callback with error boundary
      if (onPreferenceChange) {
        try {
          onPreferenceChange(newPreference);
        } catch (error) {
          console.error('Error in motion preference change callback:', error);
        }
      }

      // Apply global transition override if enabled
      if (enableTransitionOverride) {
        updateGlobalTransitions(newPreference);
      }

      // System-wide synchronization
      if (enableSystemSync) {
        synchronizeWithSystem(newPreference);
      }
    });
  }, [onPreferenceChange, enableTransitionOverride, enableSystemSync]);

  // ==========================================
  // ADVANCED TRANSITION CONTROL SYSTEM
  // ==========================================

  const updateGlobalTransitions = useCallback((prefersReduced: boolean) => {
    try {
      // Remove existing style element
      if (styleElementRef.current) {
        document.head.removeChild(styleElementRef.current);
        styleElementRef.current = null;
      }

      if (prefersReduced) {
        // Create new style element for reduced motion
        const styleElement = document.createElement('style');
        styleElement.setAttribute('data-motion-preference', 'reduced');
        styleElement.textContent = CSS_TRANSITION_OVERRIDE;
        
        document.head.appendChild(styleElement);
        styleElementRef.current = styleElement;
      }

      // Update CSS custom properties
      document.documentElement.style.setProperty(
        '--motion-reduced',
        prefersReduced ? '1' : '0'
      );
      
      document.documentElement.style.setProperty(
        '--motion-duration',
        prefersReduced ? '0.01ms' : ''
      );

    } catch (error) {
      console.error('Failed to update global transitions:', error);
    }
  }, []);

  // ==========================================
  // SYSTEM SYNCHRONIZATION
  // ==========================================

  const synchronizeWithSystem = useCallback((prefersReduced: boolean) => {
    try {
      // Dispatch custom event for third-party libraries
      const event = new CustomEvent('motionPreferenceChange', {
        detail: { prefersReducedMotion: prefersReduced },
        bubbles: true
      });
      
      document.dispatchEvent(event);

      // Update data attribute for CSS targeting
      document.documentElement.setAttribute(
        'data-motion-preference',
        prefersReduced ? 'reduced' : 'full'
      );

    } catch (error) {
      console.warn('Failed to synchronize with system:', error);
    }
  }, []);

  // ==========================================
  // ENTERPRISE-GRADE SETUP AND TEARDOWN
  // ==========================================

  useEffect(() => {
    if (!detectMediaQuerySupport()) {
      setPreferences(prev => ({
        ...prev,
        isSupported: false,
        prefersReducedMotion: defaultValue
      }));
      return;
    }

    let mediaQuery: MediaQueryList | null = null;

    try {
      mediaQuery = createMediaQuery(REDUCED_MOTION_QUERY);
      if (!mediaQuery) {
        throw new Error('Media query creation failed');
      }
      
      mediaQueryRef.current = mediaQuery;

      // Validate and sync initial state
      if (mediaQuery.matches !== preferences.prefersReducedMotion) {
        setPreferences(prev => ({
          ...prev,
          prefersReducedMotion: mediaQuery!.matches,
          isSupported: true
        }));
      }

      // Initialize global systems
      if (enableTransitionOverride) {
        updateGlobalTransitions(mediaQuery.matches);
      }
      
      if (enableSystemSync) {
        synchronizeWithSystem(mediaQuery.matches);
      }

      // Attach listener with cross-browser compatibility
      const supportsModernAPI = 'addEventListener' in mediaQuery;
      
      if (supportsModernAPI) {
        mediaQuery.addEventListener('change', handlePreferenceChange, { passive: true });
      } else {
        // Legacy API support with proper typing
        const legacyHandler = (mql: MediaQueryList) => {
          handlePreferenceChange({ matches: mql.matches } as MediaQueryListEvent);
        };
        (mediaQuery as any).addListener?.(legacyHandler);
      }

    } catch (error) {
      console.error('Failed to initialize advanced motion preference detection:', error);
      setPreferences(prev => ({
        ...prev,
        isSupported: false,
        prefersReducedMotion: defaultValue
      }));
    }

    // Production-grade cleanup with comprehensive error handling
    return () => {
      if (mediaQuery) {
        try {
          if ('removeEventListener' in mediaQuery) {
            mediaQuery.removeEventListener('change', handlePreferenceChange);
          } else {
            (mediaQuery as any).removeListener?.(handlePreferenceChange);
          }
        } catch (error) {
          console.warn('Non-critical error during advanced media query cleanup:', error);
        }
      }

      // Clean up global modifications
      if (styleElementRef.current) {
        try {
          document.head.removeChild(styleElementRef.current);
        } catch (error) {
          console.warn('Failed to cleanup style element:', error);
        }
        styleElementRef.current = null;
      }

      // Clean up CSS custom properties
      try {
        document.documentElement.style.removeProperty('--motion-reduced');
        document.documentElement.style.removeProperty('--motion-duration');
        document.documentElement.removeAttribute('data-motion-preference');
      } catch (error) {
        console.warn('Failed to cleanup system modifications:', error);
      }

      mediaQueryRef.current = null;
    };
  }, [
    handlePreferenceChange, 
    preferences.prefersReducedMotion, 
    defaultValue, 
    enableTransitionOverride, 
    enableSystemSync,
    updateGlobalTransitions,
    synchronizeWithSystem
  ]);

  return preferences;
}

// ==========================================
// UTILITY FUNCTIONS FOR CONDITIONAL ANIMATIONS
// ==========================================

export function getMotionConfig<T>(
  reducedConfig: T,
  fullConfig: T,
  prefersReduced?: boolean
): T {
  const shouldReduce = prefersReduced ?? 
    (typeof window !== 'undefined' && window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches);
  
  return shouldReduce ? reducedConfig : fullConfig;
}

// Advanced motion-aware animation factory
export function createMotionAwareAnimation<T extends Record<string, any>>(
  normalAnimation: T,
  reducedAnimation: Partial<T> = {}
): T {
  const prefersReduced = typeof window !== 'undefined' && 
    window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches;
  
  if (!prefersReduced) return normalAnimation;
  
  // Merge animations with reduced motion overrides
  return {
    ...normalAnimation,
    ...reducedAnimation,
    duration: reducedAnimation.duration ?? 0.01,
    delay: reducedAnimation.delay ?? 0,
    transition: {
      ...normalAnimation.transition,
      duration: 0.01,
      ease: 'linear'
    }
  };
}

// ==========================================
// PRODUCTION-READY EXPORTS
// ==========================================

export type { MotionPreferences, UseMotionPreferencesOptions };