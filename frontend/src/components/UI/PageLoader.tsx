// Stunning Advanced Page Loader with Particle Effects
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import AetherScanLogo from './AetherScanLogo'

interface PageLoaderProps {
  isLoading: boolean
}

// Particle component for floating particles
const Particle = ({ index }: { index: number }) => {
  const randomX = Math.random() * 100
  const randomDelay = Math.random() * 2
  const randomDuration = 3 + Math.random() * 4

  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-cyan-400/30"
      style={{
        left: `${randomX}%`,
        top: '100%',
      }}
      animate={{
        y: [0, -1000],
        opacity: [0, 1, 0],
        scale: [0, 1.5, 0],
      }}
      transition={{
        duration: randomDuration,
        repeat: Infinity,
        delay: randomDelay,
        ease: 'linear',
      }}
    />
  )
}

// Orbit ring component
const OrbitRing = ({ radius, duration, reverse = false }: { radius: number; duration: number; reverse?: boolean }) => (
  <motion.div
    className="absolute border border-cyan-500/20 rounded-full"
    style={{
      width: radius * 2,
      height: radius * 2,
    }}
    animate={{
      rotate: reverse ? -360 : 360,
    }}
    transition={{
      duration,
      repeat: Infinity,
      ease: 'linear',
    }}
  >
    <motion.div
      className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(0,255,255,0.8)]"
      style={{
        top: '50%',
        left: '100%',
        marginTop: -4,
        marginLeft: -4,
      }}
    />
  </motion.div>
)

// Data stream line
const DataStream = ({ delay }: { delay: number }) => (
  <motion.div
    className="absolute h-full w-px bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent"
    initial={{ opacity: 0, y: -100 }}
    animate={{
      opacity: [0, 1, 0],
      y: ['-100%', '200%'],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      delay,
      ease: 'linear',
    }}
  />
)

export default function PageLoader({ isLoading }: PageLoaderProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 100
          return prev + Math.random() * 15
        })
      }, 150)
      return () => clearInterval(interval)
    }
  }, [isLoading])

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
        >
          {/* Aurora Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Animated mesh gradient */}
            <motion.div
              className="absolute inset-0 opacity-30"
              style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(157, 78, 221, 0.15) 0%, transparent 50%)',
              }}
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </div>

          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <Particle key={i} index={i} />
            ))}
          </div>

          {/* Grid Background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }} />
          </div>

          {/* Data Stream Lines */}
          <div className="absolute inset-0 flex justify-around">
            {[...Array(8)].map((_, i) => (
              <DataStream key={i} delay={i * 0.2} />
            ))}
          </div>

          {/* Central Loading Element */}
          <div className="relative z-10 flex flex-col items-center gap-8">
            {/* Orbit Rings */}
            <div className="relative flex items-center justify-center">
              <OrbitRing radius={80} duration={8} />
              <OrbitRing radius={100} duration={10} reverse />
              <OrbitRing radius={120} duration={12} />

              {/* Logo with Holographic Effect */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{
                  scale: 1,
                  rotate: 0,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                  delay: 0.2,
                }}
                className="relative z-20"
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(6, 182, 212, 0.4)',
                      '0 0 60px rgba(6, 182, 212, 0.6)',
                      '0 0 20px rgba(6, 182, 212, 0.4)',
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="rounded-full p-4 bg-slate-900/50 backdrop-blur-xl border border-cyan-500/30"
                >
                  <AetherScanLogo size={80} animate={true} />
                </motion.div>
              </motion.div>
            </div>

            {/* Title with Glitch Effect */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col items-center gap-3"
            >
              <motion.h1
                animate={{
                  textShadow: [
                    '0 0 10px rgba(6, 182, 212, 0.8)',
                    '0 0 20px rgba(6, 182, 212, 1)',
                    '0 0 10px rgba(6, 182, 212, 0.8)',
                  ],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
                className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent"
              >
                AetherScan
              </motion.h1>
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-sm text-gray-400 tracking-widest uppercase"
              >
                Air Quality Intelligence
              </motion.p>
            </motion.div>

            {/* Advanced Progress Bar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col items-center gap-4 mt-6 w-full max-w-md px-4"
            >
              {/* Progress Bar Container */}
              <div className="relative w-full h-2 bg-slate-800/50 rounded-full overflow-hidden border border-cyan-500/20">
                {/* Background shimmer */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />

                {/* Progress fill */}
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 relative overflow-hidden"
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Animated glow */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                </motion.div>

                {/* Progress glow effect */}
                <motion.div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-400 rounded-full blur-sm"
                  style={{ right: `${100 - Math.min(progress, 100)}%` }}
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </div>

              {/* Status Text */}
              <div className="flex items-center justify-between w-full">
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-xs text-gray-500 font-mono"
                >
                  {progress < 30 && 'Initializing sensors...'}
                  {progress >= 30 && progress < 60 && 'Loading environmental data...'}
                  {progress >= 60 && progress < 90 && 'Processing air quality metrics...'}
                  {progress >= 90 && 'Almost ready...'}
                </motion.p>
                <motion.span
                  className="text-xs font-mono text-cyan-400"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  {Math.floor(Math.min(progress, 100))}%
                </motion.span>
              </div>

              {/* Loading Dots */}
              <div className="flex gap-2 mt-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-cyan-400"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Corner Decorations */}
          {[
            { top: 0, left: 0, rotate: 0 },
            { top: 0, right: 0, rotate: 90 },
            { bottom: 0, right: 0, rotate: 180 },
            { bottom: 0, left: 0, rotate: 270 },
          ].map((pos, i) => (
            <motion.div
              key={i}
              className="absolute w-32 h-32"
              style={pos}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.3, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
            >
              <div
                className="w-full h-full border-t-2 border-l-2 border-cyan-500/30"
                style={{ transform: `rotate(${pos.rotate}deg)` }}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
