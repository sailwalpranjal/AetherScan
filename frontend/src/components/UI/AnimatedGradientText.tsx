// Animated Gradient Text Component
'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedGradientTextProps {
  children: ReactNode
  className?: string
  gradientColors?: string[]
}

export default function AnimatedGradientText({
  children,
  className = '',
  gradientColors = ['#06b6d4', '#3b82f6', '#9d4edd', '#06b6d4'],
}: AnimatedGradientTextProps) {
  return (
    <motion.span
      className={`inline-block bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: `linear-gradient(90deg, ${gradientColors.join(', ')})`,
        backgroundSize: '200% 100%',
      }}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {children}
    </motion.span>
  )
}
