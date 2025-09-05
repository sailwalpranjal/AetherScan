'use client';

import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {OptimizedAnimations} from '../Hero/Hero';


// ==========================================
// ADVANCED TYPE DEFINITIONS
// ==========================================

interface FloatingCard {
  readonly id: string;
  readonly icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  readonly title: string;
  readonly value: string;
  readonly trend: 'up' | 'down' | 'stable';
  readonly position: { x: number; y: number };
  readonly delay: number;
}

interface FloatingElementsProps {
  readonly cards: readonly FloatingCard[];
  readonly mouseX: number;
  readonly mouseY: number;
  readonly animations: OptimizedAnimations;
  readonly reduceMotion?: boolean;
  readonly performance?: 'low' | 'medium' | 'high';
}

interface CardMetrics {
  renderTime: number;
  animationFrames: number;
  interactionCount: number;
}

// ==========================================
// PERFORMANCE OPTIMIZATION CONSTANTS
// ==========================================

const PERFORMANCE_CONFIGS = {
  low: {
    maxCards: 3,
    animationQuality: 'basic',
    updateThreshold: 16,
    enableInteractions: false,
    enableParallax: false
  },
  medium: {
    maxCards: 4,
    animationQuality: 'enhanced',
    updateThreshold: 8,
    enableInteractions: true,
    enableParallax: true
  },
  high: {
    maxCards: 6,
    animationQuality: 'premium',
    updateThreshold: 4,
    enableInteractions: true,
    enableParallax: true
  }
} as const;

// ==========================================
// ADVANCED ANIMATION VARIANTS
// ==========================================

const cardVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 100,
    rotateX: -15,
    rotateY: 15,
    filter: 'blur(8px)',
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 100
    }
  },
  visible: (delay: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    rotateX: 0,
    rotateY: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      damping: 15,
      stiffness: 120,
      mass: 0.8,
      delay,
      when: 'beforeChildren',
      staggerChildren: 0.1
    }
  }),
  hover: {
    scale: 1.05,
    rotateX: -5,
    rotateY: 5,
    y: -8,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      damping: 12,
      stiffness: 400,
      mass: 0.6
    }
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
      ease: 'easeInOut'
    }
  }
};

const iconVariants = {
  hidden: { 
    scale: 0, 
    rotate: -180,
    filter: 'saturate(0)'
  },
  visible: { 
    scale: 1, 
    rotate: 0,
    filter: 'saturate(1)',
    transition: {
      type: 'spring',
      damping: 10,
      stiffness: 200,
      delay: 0.2
    }
  },
  hover: {
    scale: 1.2,
    rotate: 360,
    filter: 'saturate(1.5)',
    transition: {
      type: 'spring',
      damping: 8,
      stiffness: 300
    }
  }
};

const contentVariants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      delay: 0.3,
      duration: 0.6,
      ease: [0.25, 1, 0.5, 1]
    }
  }
};

// ==========================================
// PERFORMANCE MONITORING HOOK
// ==========================================

const usePerformanceMonitoring = (cardId: string, enabled: boolean) => {
  const metricsRef = useRef<CardMetrics>({
    renderTime: 0,
    animationFrames: 0,
    interactionCount: 0
  });
  
  const startTime = useRef<number>(0);
  
  const trackRender = useCallback(() => {
    if (!enabled) return;
    startTime.current = performance.now();
  }, [enabled]);
  
  const trackRenderComplete = useCallback(() => {
    if (!enabled || !startTime.current) return;
    const renderTime = performance.now() - startTime.current;
    metricsRef.current = { ...metricsRef.current, renderTime };
    
    if (process.env.NODE_ENV === 'development' && renderTime > 16) {
      console.warn(`Floating card ${cardId} render time: ${renderTime.toFixed(2)}ms (> 16ms)`);
    }
  }, [enabled, cardId]);
  
  const trackInteraction = useCallback(() => {
    if (!enabled) return;
    metricsRef.current = { 
      ...metricsRef.current, 
      interactionCount: metricsRef.current.interactionCount + 1 
    };
  }, [enabled]);
  
  return {
    trackRender,
    trackRenderComplete,
    trackInteraction,
    metrics: metricsRef.current
  };
};

// ==========================================
// INDIVIDUAL FLOATING CARD COMPONENT
// ==========================================

interface FloatingCardComponentProps {
  readonly card: FloatingCard;
  readonly mouseX: number;
  readonly mouseY: number;
  readonly isVisible: boolean;
  readonly performance: keyof typeof PERFORMANCE_CONFIGS;
  readonly reduceMotion: boolean;
}

const FloatingCardComponent: React.FC<FloatingCardComponentProps> = ({
  card,
  mouseX,
  mouseY,
  isVisible,
  performance,
  reduceMotion
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const config = PERFORMANCE_CONFIGS[performance];
  
  // Performance monitoring
  const { trackRender, trackRenderComplete, trackInteraction } = 
    usePerformanceMonitoring(card.id, performance === 'high');
  
  // Mouse-based parallax motion values
  const parallaxX = useMotionValue(0);
  const parallaxY = useMotionValue(0);
  const mouseXMotion = useMotionValue(mouseX);
  const mouseYMotion = useMotionValue(mouseY);
  
  // Update motion values when props change
  useEffect(() => {
    mouseXMotion.set(mouseX);
    mouseYMotion.set(mouseY);
  }, [mouseX, mouseY, mouseXMotion, mouseYMotion]);
  
  // Transform motion values for smooth parallax
  const cardX = useTransform(
    [parallaxX, mouseXMotion], 
    (values: readonly number[]) => {
        const [px = 0, mx = 0] = values;
        return px + (config.enableParallax && !reduceMotion ? mx * 0.02 : 0);
    }
    );

    const cardY = useTransform(
    [parallaxY, mouseYMotion], 
    (values: readonly number[]) => {
        const [py = 0, my = 0] = values;
        return py + (config.enableParallax && !reduceMotion ? my * 0.015 : 0);
    }
    );


  
  const rotateX = useTransform(
    mouseYMotion, 
    [-0.5, 0.5], 
    config.enableParallax && !reduceMotion ? [5, -5] : [0, 0]
  );
  
  const rotateY = useTransform(
    mouseXMotion, 
    [-0.5, 0.5], 
    config.enableParallax && !reduceMotion ? [-5, 5] : [0, 0]
  );

  // Dynamic background based on trend
  const getTrendGradient = (trend: FloatingCard['trend']) => {
    switch (trend) {
      case 'up':
        return 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)';
      case 'down':
        return 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)';
      default:
        return 'linear-gradient(135deg, rgba(107, 114, 128, 0.1) 0%, rgba(107, 114, 128, 0.05) 100%)';
    }
  };

  const getTrendColor = (trend: FloatingCard['trend']) => {
    switch (trend) {
      case 'up': return '#22c55e';
      case 'down': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Optimized event handlers
  const handleHover = useCallback(() => {
    if (!config.enableInteractions || reduceMotion) return;
    trackInteraction();
  }, [config.enableInteractions, reduceMotion, trackInteraction]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    trackInteraction();
    
    // Add ripple effect for feedback
    if (cardRef.current && !reduceMotion) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: 100px;
        height: 100px;
        background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
        z-index: 10;
      `;
      
      cardRef.current.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }
  }, [trackInteraction, reduceMotion]);

  // Performance-optimized render tracking
  useEffect(() => {
    trackRender();
    return () => trackRenderComplete();
  });

  return (
    <motion.div
      ref={cardRef}
      className="floating-card"
      style={{
        position: 'absolute',
        left: `${card.position.x}%`,
        top: `${card.position.y}%`,
        transform: `translate(-50%, -50%)`,
        x: cardX,
        y: cardY,
        rotateX: rotateX,
        rotateY: rotateY,
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        willChange: 'transform'
      }}
      variants={cardVariants}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      whileHover={config.enableInteractions && !reduceMotion ? "hover" : undefined}
      whileTap={config.enableInteractions && !reduceMotion ? "tap" : undefined}
      custom={card.delay}
      onHoverStart={handleHover}
      onClick={handleClick}
    >
      <div
        style={{
          padding: '1.5rem',
          background: `
            ${getTrendGradient(card.trend)},
            rgba(255, 255, 255, 0.08)
          `,
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '1rem',
          boxShadow: `
            0 0 0 1px rgba(255, 255, 255, 0.05),
            0 8px 32px -8px rgba(0, 0, 0, 0.2),
            0 16px 64px -16px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `,
          cursor: config.enableInteractions ? 'pointer' : 'default',
          userSelect: 'none',
          minWidth: '200px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Animated background highlight */}
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: `conic-gradient(
              from 45deg,
              transparent 0deg,
              ${getTrendColor(card.trend)}20 90deg,
              transparent 180deg,
              ${getTrendColor(card.trend)}10 270deg,
              transparent 360deg
            )`,
            animation: reduceMotion ? 'none' : 'rotate 8s linear infinite',
            opacity: 0.5
          }}
        />
        
        {/* Card content */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <motion.div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.75rem'
            }}
            variants={contentVariants}
          >
            <motion.div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5rem',
                height: '2.5rem',
                background: `linear-gradient(135deg, ${getTrendColor(card.trend)}30, ${getTrendColor(card.trend)}10)`,
                borderRadius: '0.75rem',
                color: getTrendColor(card.trend)
              }}
              variants={iconVariants}
            >
              <card.icon 
                className="w-5 h-5"
                style={{ 
                  filter: `drop-shadow(0 0 8px ${getTrendColor(card.trend)}40)`
                }} 
              />
            </motion.div>
            
            <motion.div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
              variants={contentVariants}
            >
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.9)',
                  letterSpacing: '0.01em'
                }}
              >
                {card.title}
              </div>
              
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: getTrendColor(card.trend),
                  letterSpacing: '-0.01em',
                  textShadow: `0 0 20px ${getTrendColor(card.trend)}30`
                }}
              >
                {card.value}
              </div>
            </motion.div>
          </motion.div>
          
          {/* Trend indicator */}
          {card.trend !== 'stable' && (
            <motion.div
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '50%',
                background: getTrendColor(card.trend),
                boxShadow: `0 0 12px ${getTrendColor(card.trend)}60`,
                animation: reduceMotion ? 'none' : `pulse 2s infinite`
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: card.delay + 0.5 }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ==========================================
// MAIN FLOATING ELEMENTS COMPONENT
// ==========================================

const FloatingElements: React.FC<FloatingElementsProps> = ({
  cards,
  mouseX,
  mouseY,
  animations,
  reduceMotion = false,
  performance = 'medium'
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const config = PERFORMANCE_CONFIGS[performance];
  
  // Visibility detection for performance optimization
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
    rootMargin: '-100px 0px'
  });
  
  // Filter cards based on performance setting
  const visibleCards = useMemo(() => 
    cards.slice(0, config.maxCards),
    [cards, config.maxCards]
  );
  
  // CSS-in-JS optimization for keyframes
  useEffect(() => {
    if (reduceMotion) return;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes pulse {
        0%, 100% { 
          opacity: 1; 
          transform: scale(1);
        }
        50% { 
          opacity: 0.6; 
          transform: scale(1.2);
        }
      }
      
      @keyframes ripple {
        to {
          transform: translate(-50%, -50%) scale(4);
          opacity: 0;
        }
      }
    `;
    
    document.head.appendChild(styleElement);
    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, [reduceMotion]);

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        inViewRef(node);
      }}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 2,
        opacity: animations.opacity?.opacity ?? 1
      }}
    >
      {inView && visibleCards.map((card) => (
        <FloatingCardComponent
          key={card.id}
          card={card}
          mouseX={mouseX}
          mouseY={mouseY}
          isVisible={inView}
          performance={performance}
          reduceMotion={reduceMotion}
        />
      ))}
      
      {/* Performance debugging overlay (development only) */}
      {process.env.NODE_ENV === 'development' && performance === 'high' && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            pointerEvents: 'auto',
            zIndex: 9999
          }}
        >
          <div>Floating Elements: {visibleCards.length}/{cards.length}</div>
          <div>Performance: {performance}</div>
          <div>Reduce Motion: {reduceMotion.toString()}</div>
          <div>In View: {inView.toString()}</div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// PERFORMANCE-OPTIMIZED EXPORTS
// ==========================================

export { FloatingElements };
export type { FloatingElementsProps, FloatingCard };