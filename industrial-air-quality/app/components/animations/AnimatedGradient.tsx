'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// ==========================================
// TYPES
// ==========================================

interface AnimatedGradientProps {
  readonly colors?: readonly string[];
  readonly duration?: number;
  readonly opacity?: number;
  readonly className?: string;
  readonly size?: 'small' | 'medium' | 'large';
}

// ==========================================
// ANIMATED GRADIENT COMPONENT
// ==========================================

export function AnimatedGradient({
  colors = [
    'rgba(0, 212, 170, 0.15)',
    'rgba(108, 92, 231, 0.1)',
    'rgba(0, 212, 170, 0.05)',
    'rgba(108, 92, 231, 0.08)'
  ],
  duration = 20,
  opacity = 1,
  className = '',
  size = 'large'
}: AnimatedGradientProps): React.JSX.Element {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div 
        className={className}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0
        }}
      />
    );
  }

  const getSizeMultiplier = () => {
    switch (size) {
      case 'small': return 0.7;
      case 'medium': return 1;
      case 'large': return 1.4;
      default: return 1;
    }
  };

  const sizeMultiplier = getSizeMultiplier();
  
  return (
    <div 
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity,
        overflow: 'hidden',
        mixBlendMode: 'screen'
      }}
      aria-hidden="true"
    >
      {/* Primary gradient orb */}
      <motion.div
        style={{
          position: 'absolute',
          width: `${600 * sizeMultiplier}px`,
          height: `${600 * sizeMultiplier}px`,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors[0]} 0%, transparent 70%)`,
          filter: 'blur(40px)',
          opacity: 0.8,
        }}
        animate={{
          x: ['10%', '80%', '20%', '70%', '10%'],
          y: ['20%', '70%', '80%', '30%', '20%'],
          scale: [1, 1.2, 0.8, 1.1, 1],
        }}
        transition={{
          duration: duration,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatType: 'loop',
        }}
      />

      {/* Secondary gradient orb */}
      <motion.div
        style={{
          position: 'absolute',
          width: `${800 * sizeMultiplier}px`,
          height: `${800 * sizeMultiplier}px`,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors[1]} 0%, transparent 70%)`,
          filter: 'blur(60px)',
          opacity: 0.6,
        }}
        animate={{
          x: ['70%', '10%', '80%', '30%', '70%'],
          y: ['60%', '20%', '70%', '80%', '60%'],
          scale: [1, 0.8, 1.3, 0.9, 1],
        }}
        transition={{
          duration: duration * 1.2,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatType: 'loop',
          delay: 2,
        }}
      />

      {/* Tertiary gradient orb */}
      <motion.div
        style={{
          position: 'absolute',
          width: `${500 * sizeMultiplier}px`,
          height: `${500 * sizeMultiplier}px`,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors[2]} 0%, transparent 70%)`,
          filter: 'blur(30px)',
          opacity: 0.7,
        }}
        animate={{
          x: ['40%', '70%', '10%', '60%', '40%'],
          y: ['10%', '80%', '40%', '20%', '10%'],
          scale: [1, 1.1, 0.9, 1.2, 1],
        }}
        transition={{
          duration: duration * 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatType: 'loop',
          delay: 4,
        }}
      />

      {/* Quaternary gradient orb */}
      <motion.div
        style={{
          position: 'absolute',
          width: `${700 * sizeMultiplier}px`,
          height: `${700 * sizeMultiplier}px`,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors[3] || colors[1]} 0%, transparent 70%)`,
          filter: 'blur(50px)',
          opacity: 0.4,
        }}
        animate={{
          x: ['20%', '60%', '80%', '25%', '20%'],
          y: ['70%', '30%', '60%', '85%', '70%'],
          scale: [1, 1.3, 0.7, 1, 1],
        }}
        transition={{
          duration: duration * 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatType: 'loop',
          delay: 6,
        }}
      />

      {/* Overlay gradient for depth */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(ellipse at top left, ${colors[0]} 0%, transparent 50%),
            radial-gradient(ellipse at top right, ${colors[1]} 0%, transparent 50%),
            radial-gradient(ellipse at bottom left, ${colors[2] || colors[0]} 0%, transparent 50%),
            radial-gradient(ellipse at bottom right, ${colors[3] || colors[1]} 0%, transparent 50%)
          `,
          opacity: 0.3,
          animation: `gradientShift ${duration * 2}s ease-in-out infinite`,
        }}
      />

      {/* CSS animations for browsers that don't support Framer Motion */}
      <style>{`
        @keyframes gradientShift {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1) rotate(0deg);
          }
          25% {
            opacity: 0.4;
            transform: scale(1.05) rotate(90deg);
          }
          50% {
            opacity: 0.3;
            transform: scale(0.95) rotate(180deg);
          }
          75% {
            opacity: 0.35;
            transform: scale(1.02) rotate(270deg);
          }
        }

        @keyframes floatUpDown {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes gradientShift {
            0%, 100% {
              opacity: 0.3;
            }
          }
        }
      `}</style>
    </div>
  );
}