// Ambient Floating Particles Background
'use client'

import { motion } from 'framer-motion'
import { useMemo, useState, useEffect } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
  color: string
}

export default function FloatingParticles({ count = 30 }: { count?: number }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: ((i * 37 + 13) % 100),
      y: ((i * 59 + 29) % 100),
      size: (i % 4) + 1.5,
      duration: ((i * 7) % 20) + 10,
      delay: ((i * 3) % 5),
      color: ['cyan', 'blue', 'purple'][i % 3],
    }))
  }, [count])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full opacity-20`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor:
              particle.color === 'cyan' ? '#06b6d4' :
              particle.color === 'blue' ? '#3b82f6' : '#9d4edd',
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.1, 0.3, 0.1],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Add some larger glowing orbs */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full blur-2xl"
          style={{
            left: `${20 * i + 10}%`,
            top: `${Math.random() * 100}%`,
            width: 200,
            height: 200,
            background: `radial-gradient(circle, ${
              i % 2 === 0 ? 'rgba(6, 182, 212, 0.1)' : 'rgba(59, 130, 246, 0.1)'
            } 0%, transparent 70%)`,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20 + i * 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
