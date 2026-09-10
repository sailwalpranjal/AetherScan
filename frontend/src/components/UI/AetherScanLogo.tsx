// High-End Scientific Vector Badge Logo
'use client'

import { motion } from 'framer-motion'

interface LogoProps {
  size?: number
  className?: string
  animate?: boolean
}

export default function AetherScanLogo({ size = 40, className = '', animate = true }: LogoProps) {
  const LogoSVG = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="lensGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
        </radialGradient>
        
        <linearGradient id="orbitalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#818cf8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#312e81" stopOpacity="0.8" />
        </linearGradient>

        <linearGradient id="coreGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>

        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        
        <filter id="coreGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background Ambient Glow */}
      <circle cx="60" cy="60" r="50" fill="url(#lensGlow)" />

      {/* Outer Orbital Ring */}
      <circle
        cx="60"
        cy="60"
        r="54"
        stroke="url(#orbitalGradient)"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="4 8"
        className="opacity-60"
      />

      {/* Precision Reticle Outer */}
      <path
        d="M 60 5 L 60 15 M 60 105 L 60 115 M 5 60 L 15 60 M 105 60 L 115 60"
        stroke="#38bdf8"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-80"
      />

      {/* Inner Technical Ring */}
      <circle
        cx="60"
        cy="60"
        r="42"
        stroke="#0284c7"
        strokeWidth="1"
        fill="none"
        className="opacity-40"
      />

      {/* Geometric Core Polygon */}
      <polygon
        points="60,25 90,42 90,78 60,95 30,78 30,42"
        stroke="url(#orbitalGradient)"
        strokeWidth="2"
        fill="none"
        filter="url(#neonGlow)"
        className="opacity-80"
      />

      {/* Central Data Core */}
      <circle
        cx="60"
        cy="60"
        r="16"
        fill="url(#coreGradient)"
        filter="url(#coreGlow)"
      />

      {/* Inner Core Detailing */}
      <circle cx="60" cy="60" r="6" fill="#ffffff" className="opacity-90" />
      
      {/* Orbital Data Nodes */}
      <circle cx="90" cy="42" r="3" fill="#ffffff" filter="url(#neonGlow)" />
      <circle cx="30" cy="78" r="3" fill="#ffffff" filter="url(#neonGlow)" />
      <circle cx="60" cy="25" r="3" fill="#ffffff" filter="url(#neonGlow)" />

      {/* HUD Scanning Line */}
      {animate && (
        <line
          x1="10"
          y1="60"
          x2="110"
          y2="60"
          stroke="#7dd3fc"
          strokeWidth="1.5"
          opacity="0.5"
          filter="url(#neonGlow)"
        >
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 -40; 0 40; 0 -40"
            dur="4s"
            repeatCount="indefinite"
          />
        </line>
      )}
    </svg>
  )

  if (!animate) return LogoSVG

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotate: -30 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
      className="relative flex items-center justify-center"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      >
        {LogoSVG}
      </motion.div>
    </motion.div>
  )
}
