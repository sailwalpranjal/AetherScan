'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  FiArrowDown, 
  FiPlay, 
  FiMapPin, 
  FiShield} from 'react-icons/fi';

import { Button } from '@/components/ui/Button';
import { ParticleSystem } from '@/components/animations/ParticleSystem';
import { InteractiveBackground } from '@/components/animations/InteractiveBackground';
import { useMousePosition } from '@/hooks/useMousePosition';
import { useViewportSize } from '@/hooks/useViewportSize';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import styles from './Hero.module.css';


interface AnimationStyles {
  opacity?: number;
  y?: number;
  scale?: number;
  rotateX?: number;
  rotateY?: number;
}

export interface OptimizedAnimations {
  [key: string]: AnimationStyles;
  titleAnimation: AnimationStyles;
  subtitleAnimation: AnimationStyles;
  ctaAnimation: AnimationStyles;
  floatingAnimation: AnimationStyles;
}



// ==========================================
// HERO CONFIGURATION DATA
// ==========================================

const HERO_CONTENT = {
  preTitle: 'Next-Generation Environmental Intelligence',
  title: {
    line1: 'Revolutionary',
    line2: 'Air Quality Monitoring',
    line3: 'Powered by Quantum Computing'
  },
  subtitle: 'Experience the future of environmental monitoring with satellite-powered real-time data, machine learning predictions, and quantum-enhanced processing capabilities.',
  stats: [
    { value: '50+', label: 'Satellite Data Sources' },
    { value: '99.8%', label: 'Prediction Accuracy' },
    { value: '24/7', label: 'Real-time Processing' },
    { value: '190+', label: 'Cities Monitored' }
  ]
} as const;

// ==========================================
// PERFORMANCE OPTIMIZATION HOOKS
// ==========================================

const useOptimizedAnimations = (isVisible: boolean, prefersReducedMotion: boolean): OptimizedAnimations => {
  return useMemo(() => {
    if (prefersReducedMotion) {
      return {
        titleAnimation: { opacity: isVisible ? 1 : 0 },
        subtitleAnimation: { opacity: isVisible ? 1 : 0 },
        ctaAnimation: { opacity: isVisible ? 1 : 0 },
        floatingAnimation: { opacity: isVisible ? 0.8 : 0 }
      };
    }

    return {
      titleAnimation: {
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : 100,
        scale: isVisible ? 1 : 0.9,
        rotateX: isVisible ? 0 : -10
      },
      subtitleAnimation: {
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : 50,
        scale: isVisible ? 1 : 0.95
      },
      ctaAnimation: {
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : 30,
        scale: isVisible ? 1 : 0.9
      },
      floatingAnimation: {
        opacity: isVisible ? 0.9 : 0,
        scale: isVisible ? 1 : 0.8,
        rotateY: isVisible ? 0 : -15
      }
    };
  }, [isVisible, prefersReducedMotion]);
};


// ==========================================
// MAIN HERO COMPONENT
// ==========================================

export default function Hero(): React.JSX.Element {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  // ==========================================
  // HOOKS FOR PERFORMANCE & INTERACTION
  // ==========================================
  
  const { mouseX, mouseY } = useMousePosition({
    throttle: 16,
    includeTouch: true,
    normalize: false,
    smoothing: 0.1
  });
  
  const { width: viewportWidth, height: viewportHeight, isSmallScreen } = useViewportSize({
    throttle: 16,
    includeMetrics: true
  });
  
  const prefersReducedMotion = usePrefersReducedMotion(false);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    layoutEffect: true,
    offset: ['start start', 'end start']
  });

  // ==========================================
  // OPTIMIZED SCROLL ANIMATIONS
  // ==========================================
  
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // ==========================================
  // VIEWPORT DETECTION
  // ==========================================
  
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.3,
    triggerOnce: false,
    rootMargin: '-100px 0px'
  });

  // ==========================================
  // OPTIMIZED ANIMATIONS
  // ==========================================
  
  const animations = useOptimizedAnimations(inView, prefersReducedMotion);

  // ==========================================
  // NORMALIZED MOUSE COORDINATES
  // ==========================================
  
  const normalizedMouseX = useMemo(() => {
    return viewportWidth > 0 ? (mouseX / viewportWidth - 0.5) * 2 : 0;
  }, [mouseX, viewportWidth]);

  const normalizedMouseY = useMemo(() => {
    return viewportHeight > 0 ? (mouseY / viewportHeight - 0.5) * 2 : 0;
  }, [mouseY, viewportHeight]);

  // ==========================================
  // INITIALIZATION EFFECTS
  // ==========================================
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // ==========================================
  // INTERACTION HANDLERS
  // ==========================================
  
  const handleScrollToNext = useCallback(() => {
    const nextSection = document.querySelector('#vision-section');
    if (nextSection) {
      nextSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, []);

  const handleExploreClick = useCallback(() => {
    
    // Navigate to interactive map
    window.location.href = '/map';
  }, []);

  const handleDemoClick = useCallback(() => {
    const demoSection = document.querySelector('#vision-section');
    if (demoSection) {
      demoSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, []);

  // ==========================================
  // LOADING STATE
  // ==========================================
  
  if (!mounted) {
    return (
      <section className={styles.heroSkeleton}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinnerRing} />
          <div className={styles.spinnerText}>Initializing Quantum Interface...</div>
        </div>
      </section>
    );
  }

  // ==========================================
  // MAIN RENDER
  // ==========================================
  
  return (
    <section 
      ref={heroRef}
      className={styles.hero}
      aria-labelledby="hero-title"
      style={{
        '--mouse-x': normalizedMouseX,
        '--mouse-y': normalizedMouseY
      } as React.CSSProperties}
    >
      {/* ==========================================
          INTERACTIVE BACKGROUND LAYERS
          ========================================== */}
      <motion.div 
        className={styles.backgroundContainer}
        style={{ y: backgroundY }}
      >
        <InteractiveBackground 
          mouseX={normalizedMouseX} 
          mouseY={normalizedMouseY}
          reduceMotion={prefersReducedMotion}
          quality={isSmallScreen ? 'medium' : 'high'}
          colorScheme="quantum"
          intensity={1.0}
        />
        
        <ParticleSystem 
          count={prefersReducedMotion ? 50 : (isSmallScreen ? 100 : 200)}
          interactive={!prefersReducedMotion}
          performance={isSmallScreen ? 'medium' : 'high'}
          color="#6c5ce7"
          opacity={0.6}
          size={1.5}
          speed={0.5}
          mouseInfluence={100}
        />
      </motion.div>


      {/* ==========================================
          MAIN CONTENT
          ========================================== */}
      <motion.div 
        className={styles.container}
        ref={inViewRef}
        style={{ y: contentY, opacity }}
      >
        <div className={styles.content}>
          
          {/* Pre-title */}
          <motion.div
            className={styles.preTitle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 20 }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          >
            <FiShield className={styles.preTitleIcon} />
            <span>{HERO_CONTENT.preTitle}</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1 
            id="hero-title"
            className={styles.title}
            initial={{ opacity: 0 }}
            animate={animations.titleAnimation}
            transition={{ 
              delay: 0.3, 
              duration: prefersReducedMotion ? 0.01 : 1.2, 
              ease: [0.25, 1, 0.5, 1] 
            }}
          >
            <motion.span 
              className={styles.titleLine1}
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 100 }}
              animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : (prefersReducedMotion ? 0 : 100) }}
              transition={{ delay: 0.4, duration: prefersReducedMotion ? 0.01 : 0.8, ease: [0.25, 1, 0.5, 1] }}
            >
              {HERO_CONTENT.title.line1}
            </motion.span>
            
            <motion.span 
              className={`${styles.titleLine2} ${styles.gradientText}`}
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 100, scale: prefersReducedMotion ? 1 : 0.9 }}
              animate={{ 
                opacity: inView ? 1 : 0, 
                y: inView ? 0 : (prefersReducedMotion ? 0 : 100), 
                scale: inView ? 1 : (prefersReducedMotion ? 1 : 0.9) 
              }}
              transition={{ delay: 0.6, duration: prefersReducedMotion ? 0.01 : 0.8, ease: [0.25, 1, 0.5, 1] }}
            >
              {HERO_CONTENT.title.line2}
            </motion.span>
            
            <motion.span 
              className={styles.titleLine3}
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 100 }}
              animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : (prefersReducedMotion ? 0 : 100) }}
              transition={{ delay: 0.8, duration: prefersReducedMotion ? 0.01 : 0.8, ease: [0.25, 1, 0.5, 1] }}
            >
              {HERO_CONTENT.title.line3}
            </motion.span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className={styles.subtitle}
            initial={{ opacity: 0 }}
            animate={animations.subtitleAnimation}
            transition={{ 
              delay: 1.0, 
              duration: prefersReducedMotion ? 0.01 : 0.8, 
              ease: [0.25, 1, 0.5, 1] 
            }}
          >
            {HERO_CONTENT.subtitle}
          </motion.p>

          {/* Statistics */}
          <motion.div
            className={styles.statsContainer}
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
            animate={{ 
              opacity: inView ? 1 : 0, 
              y: inView ? 0 : (prefersReducedMotion ? 0 : 30) 
            }}
            transition={{ delay: 1.2, duration: prefersReducedMotion ? 0.01 : 0.8 }}
          >
            {HERO_CONTENT.stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className={styles.statItem}
                initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.8 }}
                animate={{ 
                  opacity: inView ? 1 : 0, 
                  scale: inView ? 1 : (prefersReducedMotion ? 1 : 0.8) 
                }}
                transition={{ 
                  delay: 1.3 + (prefersReducedMotion ? 0 : index * 0.1), 
                  duration: prefersReducedMotion ? 0.01 : 0.6,
                  ease: [0.25, 1, 0.5, 1]
                }}
              >
                <div className={styles.statValue}>{stat.value}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Call-to-Action Buttons */}
          <motion.div
            className={styles.ctaContainer}
            initial={{ opacity: 0 }}
            animate={animations.ctaAnimation}
            transition={{ 
              delay: 1.5, 
              duration: prefersReducedMotion ? 0.01 : 0.8, 
              ease: [0.25, 1, 0.5, 1] 
            }}
          >
            <Button
              variant="primary"
              size="xl"
              leftIcon={<FiMapPin />}
              onClick={handleExploreClick}
              className={styles.primaryCta}
              ariaLabel="Navigate to interactive air quality map"
            >
              Explore Interactive Map
            </Button>
            
            <Button
              variant="secondary"
              size="xl"
              leftIcon={<FiPlay />}
              onClick={handleDemoClick}
              className={styles.secondaryCta}
              ariaLabel="Watch system demonstration"
            >
              Watch Demo
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* ==========================================
          SCROLL INDICATOR
          ========================================== */}
      <motion.div
        className={styles.scrollIndicator}
        initial={{ opacity: 1, y: prefersReducedMotion ? 0 : 20 }}
        animate={{ opacity: inView ? 1 : 0.5, y: inView ? 0 : (prefersReducedMotion ? 0 : 20) }}
        transition={{ delay: 20.0, duration: prefersReducedMotion ? 0.01 : 0.8 }}
      >
        <button
          className={styles.scrollButton}
          onClick={handleScrollToNext}
          aria-label="Scroll to next section"
        >
          <motion.div
            animate={prefersReducedMotion ? {} : { y: [0, 10, 0] }}
            transition={prefersReducedMotion ? {} : { 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <FiArrowDown className={styles.scrollIcon} />
          </motion.div>
          <span className={styles.scrollText}>Discover More</span>
        </button>
      </motion.div>

      {/* ==========================================
          BOTTOM GRADIENT FADE
          ========================================== */}
      <div className={styles.bottomFade} />
    </section>
  );
}