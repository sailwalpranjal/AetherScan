// Professional AetherScan Header
'use client'

import { Menu, Layers } from 'lucide-react'
import { motion } from 'framer-motion'
import AetherScanLogo from './AetherScanLogo'
import { Button } from '@/components/UI/button'

interface ModernHeaderProps {
  activeLayersCount: number
  onMenuClick: () => void
}

export default function ModernHeader({ activeLayersCount, onMenuClick }: ModernHeaderProps) {
  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 20 }}
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 backdrop-blur-xl bg-slate-900/80"
    >
      <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Brand */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 sm:gap-3"
          >
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
              <AetherScanLogo size={32} className="sm:w-10 sm:h-10" animate={true} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                AetherScan
              </h1>
              <p className="hidden sm:block text-xs text-gray-400 font-medium">Air Quality Intelligence</p>
            </div>
          </motion.div>

          {/* Center - Live Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20"
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-emerald-400"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xs font-semibold text-emerald-400">Live Data</span>
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-300">
              <span>OpenAQ</span>
              <span className="text-gray-600">·</span>
              <span>FIRMS</span>
              <span className="text-gray-600">·</span>
              <span>NASA</span>
            </div>
          </motion.div>

          {/* Right - Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2"
          >
            {/* Desktop Layer Count */}
            <div className="hidden sm:flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg glass-hover cursor-pointer border border-white/10">
              <Layers className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />
              <span className="text-xs sm:text-sm font-semibold text-white">{activeLayersCount}</span>
              <span className="hidden lg:inline text-xs text-gray-400">Layer{activeLayersCount !== 1 ? 's' : ''}</span>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="neon"
              size="icon"
              onClick={onMenuClick}
              className="lg:hidden w-9 h-9 sm:w-10 sm:h-10"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Animated Bottom Border */}
      <motion.div
        className="h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
    </motion.header>
  )
}
