// High-End Cockpit Glass Bar Header
'use client'

import { Menu, Layers, FileText, Loader2, Activity, Wifi, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import AetherScanLogo from './AetherScanLogo'
import { Button } from '@/components/UI/button'

interface ModernHeaderProps {
  activeLayersCount: number
  onMenuClick: () => void
  onExportPDF?: () => void
  isExportingPDF?: boolean
}

export default function ModernHeader({
  activeLayersCount,
  onMenuClick,
  onExportPDF,
  isExportingPDF,
}: ModernHeaderProps) {
  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/70 backdrop-blur-2xl border-b border-[#1e293b]/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
    >
      {/* Top micro-status bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent opacity-50" />

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Institutional Branding */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-4"
          >
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-[#0f172a] rounded-xl border border-[#334155] shadow-inner overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9]/20 to-transparent" />
              <AetherScanLogo size={40} className="sm:w-12 sm:h-12 drop-shadow-md" animate={true} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]">
                AETHER<span className="text-[#38bdf8] font-light">SCAN</span>
              </h1>
              <p className="hidden sm:flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#94a3b8] font-semibold">
                <ShieldCheck className="w-3 h-3 text-[#10b981]" />
                Institutional Telemetry Matrix
              </p>
            </div>
          </motion.div>

          {/* Center - Telemetry Pills */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="hidden lg:flex items-center gap-3"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0f172a]/80 border border-[#334155] shadow-inner">
              <Activity className="w-3.5 h-3.5 text-[#10b981]" />
              <span className="text-[11px] font-bold text-[#f8fafc] uppercase tracking-wider">System Nominal</span>
            </div>
            
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#064e3b]/40 to-[#0c4a6e]/40 border border-[#059669]/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] relative overflow-hidden">
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-[#34d399]/10 to-transparent"
                animate={{ x: ['-200%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399]"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-xs font-bold text-[#34d399] uppercase tracking-widest">Live Sync</span>
              <div className="h-3 w-px bg-[#334155]" />
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                <Wifi className="w-3 h-3 text-[#38bdf8]" />
                <span>OpenAQ</span>
                <span className="text-[#475569]">•</span>
                <span>Copernicus</span>
              </div>
            </div>
          </motion.div>

          {/* Right - High-Visibility Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3 sm:gap-4"
          >
            {/* Layer Count Indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0f172a] border border-[#334155]">
              <Layers className="w-4 h-4 text-[#38bdf8]" />
              <div className="flex flex-col leading-none">
                <span className="text-xs font-bold text-white">{activeLayersCount}</span>
                <span className="text-[9px] uppercase tracking-wider text-[#64748b]">Active</span>
              </div>
            </div>

            {/* Export PDF Dossier - Shiny CTA */}
            {onExportPDF && (
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(56,189,248,0.4)' }}
                whileTap={{ scale: 0.98 }}
                onClick={onExportPDF}
                disabled={isExportingPDF}
                className="group relative flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-b from-[#0ea5e9] to-[#0369a1] border border-[#7dd3fc]/50 text-white shadow-[0_4px_15px_rgba(2,132,199,0.5)] overflow-hidden disabled:opacity-70 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-out" />
                
                {isExportingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#e0f2fe]" />
                ) : (
                  <FileText className="w-4 h-4 text-[#e0f2fe]" />
                )}
                <span className="text-xs sm:text-sm font-bold tracking-wide">
                  {isExportingPDF ? 'GENERATING...' : 'EXPORT DOSSIER'}
                </span>
              </motion.button>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={onMenuClick}
              className="lg:hidden w-10 h-10 border-[#334155] bg-[#0f172a] hover:bg-[#1e293b] text-white"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}
