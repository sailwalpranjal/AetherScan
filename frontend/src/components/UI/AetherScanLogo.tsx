// Professional AetherScan Logo Component (SVG)
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
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Gradient Definitions */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Outer Circle - Represents Earth/Atmosphere */}
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke="url(#logoGradient)"
        strokeWidth="2"
        fill="none"
        opacity="0.3"
      />

      {/* Middle Circle */}
      <circle
        cx="50"
        cy="50"
        r="35"
        stroke="url(#logoGradient)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />

      {/* Center - Air Quality Indicator */}
      <circle
        cx="50"
        cy="50"
        r="25"
        fill="url(#glowGradient)"
        filter="url(#glow)"
      />

      {/* AQI Wave Lines - Representing pollution/air monitoring */}
      <path
        d="M 30 50 Q 35 40, 40 50 T 50 50"
        stroke="#ffffff"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M 50 50 Q 55 40, 60 50 T 70 50"
        stroke="#ffffff"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* Data Points - Representing sensors */}
      <circle cx="35" cy="30" r="3" fill="#ffffff" opacity="0.8" />
      <circle cx="65" cy="30" r="3" fill="#ffffff" opacity="0.8" />
      <circle cx="35" cy="70" r="3" fill="#ffffff" opacity="0.8" />
      <circle cx="65" cy="70" r="3" fill="#ffffff" opacity="0.8" />

      {/* Scanning Lines */}
      <line x1="50" y1="25" x2="50" y2="35" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
      <line x1="50" y1="65" x2="50" y2="75" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
      <line x1="25" y1="50" x2="35" y2="50" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
      <line x1="65" y1="50" x2="75" y2="50" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
    </svg>
  )

  if (!animate) {
    return LogoSVG
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
    >
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        {LogoSVG}
      </motion.div>
    </motion.div>
  )
}
