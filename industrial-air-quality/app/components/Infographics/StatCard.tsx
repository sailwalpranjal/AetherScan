'use client';

import { motion } from 'framer-motion';
import { MOTION_VARIANTS } from '@/lib/constants';

// ==========================================
// TYPES
// ==========================================

interface StatCardProps {
  readonly metric: {
    readonly id: string;
    readonly value: string;
    readonly label: string;
    readonly description: string;
    readonly icon: React.ComponentType<{ size?: number }>;
    readonly color: string;
    readonly trend: string;
    readonly trendLabel: string;
  };
  readonly index: number;
  readonly inView: boolean;
}

// ==========================================
// STAT CARD COMPONENT
// ==========================================

export function StatCard({ metric, index, inView }: StatCardProps): React.JSX.Element {
  const IconComponent = metric.icon;

  return (
    <motion.div
      className="stat-card"
      variants={MOTION_VARIANTS['scaleIn'] as unknown as import('framer-motion').Variants}
      style={{
        '--card-color': metric.color,
        '--animation-delay': `${index * 0.1}s`
      } as import('framer-motion').MotionStyle}
      whileHover={{
        scale: 1.05,
        y: -10,
        rotateX: -5,
        rotateY: 5,
        z: 50,
        transition: { 
          type: 'spring', 
          stiffness: 300, 
          damping: 20 
        }
      }}
      whileTap={{
        scale: 0.98
      }}
    >
      {/* Card Background Glow */}
      <div className="stat-card-glow" />
      
      {/* Card Header */}
      <div className="stat-card-header">
        <div className="stat-card-icon">
          <IconComponent size={28} />
        </div>
        <div className="stat-card-trend">
          <span className="trend-value">{metric.trend}</span>
          <span className="trend-label">{metric.trendLabel}</span>
        </div>
      </div>

      {/* Main Value */}
      <div className="stat-card-value">
        <motion.span
          className="value-text"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{
            delay: index * 0.1 + 0.3,
            type: 'spring',
            stiffness: 200,
            damping: 15
          }}
        >
          {metric.value}
        </motion.span>
      </div>

      {/* Label */}
      <h3 className="stat-card-label">{metric.label}</h3>

      {/* Description */}
      <p className="stat-card-description">{metric.description}</p>

      {/* Animated Progress Bar */}
      <motion.div 
        className="stat-card-progress"
        initial={{ width: 0 }}
        animate={inView ? { width: '100%' } : { width: 0 }}
        transition={{
          delay: index * 0.1 + 0.5,
          duration: 1,
          ease: 'easeOut'
        }}
      />

      <style>{`
        .stat-card {
          position: relative;
          padding: var(--space-xl) var(--space-lg);
          background: var(--glass-bg);
          backdrop-filter: var(--glass-backdrop-filter);
          border: 1px solid var(--glass-border);
          border-radius: var(--border-radius-2xl);
          box-shadow: var(--glass-shadow);
          cursor: pointer;
          overflow: hidden;
          transition: all var(--transition-normal);
          transform-style: preserve-3d;
          min-height: 280px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .stat-card:hover {
          border-color: var(--card-color);
          box-shadow: 
            var(--glass-shadow),
            0 0 30px var(--card-color);
        }

        .stat-card-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, var(--card-color) 0%, transparent 70%);
          opacity: 0;
          filter: blur(60px);
          transform: translate(-50%, -50%);
          transition: opacity var(--transition-slow);
          z-index: -1;
        }

        .stat-card:hover .stat-card-glow {
          opacity: 0.15;
        }

        .stat-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-lg);
        }

        .stat-card-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid var(--card-color);
          border-radius: var(--border-radius-xl);
          color: var(--card-color);
          transition: all var(--transition-normal);
        }

        .stat-card:hover .stat-card-icon {
          background: var(--card-color);
          color: var(--color-text-inverse);
          transform: scale(1.1);
          box-shadow: 0 0 20px rgba(0, 212, 170, 0.3);
        }

        .stat-card-trend {
          text-align: right;
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .trend-value {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-bold);
          color: var(--card-color);
          line-height: 1;
        }

        .trend-label {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          font-weight: var(--font-weight-medium);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          line-height: 1.2;
        }

        .stat-card-value {
          margin: var(--space-lg) 0;
          text-align: center;
        }

        .value-text {
          font-size: var(--font-size-5xl);
          font-weight: var(--font-weight-extrabold);
          color: var(--card-color);
          line-height: var(--line-height-tight);
          text-shadow: 0 0 20px rgba(0, 212, 170, 0.3);
          display: inline-block;
        }

        .stat-card-label {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          margin-bottom: var(--space-sm);
          text-align: center;
          line-height: var(--line-height-tight);
        }

        .stat-card-description {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          line-height: var(--line-height-relaxed);
          text-align: center;
          margin-bottom: var(--space-md);
          flex-grow: 1;
        }

        .stat-card-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--card-color), rgba(255, 255, 255, 0.1));
          border-radius: var(--border-radius-full);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .stat-card {
            padding: var(--space-lg) var(--space-md);
            min-height: 240px;
          }

          .stat-card-icon {
            width: 50px;
            height: 50px;
          }

          .stat-card-icon svg {
            width: 24px;
            height: 24px;
          }

          .value-text {
            font-size: var(--font-size-4xl);
          }

          .stat-card-label {
            font-size: var(--font-size-base);
          }

          .trend-value {
            font-size: var(--font-size-base);
          }
        }

        @media (max-width: 480px) {
          .stat-card-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: var(--space-sm);
          }

          .stat-card-trend {
            text-align: center;
          }

          .value-text {
            font-size: var(--font-size-3xl);
          }
        }

        /* High Contrast Mode */
        @media (prefers-contrast: high) {
          .stat-card {
            background: var(--color-surface);
            border: 2px solid var(--color-border);
          }

          .stat-card-icon {
            background: var(--color-surface-elevated);
            border: 2px solid var(--card-color);
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .stat-card {
            transition: border-color var(--transition-fast);
          }

          .stat-card-glow {
            display: none;
          }

          .stat-card-icon {
            transition: background-color var(--transition-fast),
                       color var(--transition-fast);
          }

          .stat-card:hover .stat-card-icon {
            transform: none;
          }
        }
      `}</style>
    </motion.div>
  );
}