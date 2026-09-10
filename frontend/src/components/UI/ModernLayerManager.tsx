// Modern Layer Manager - Categorized Sleek Tabs & High Precision Glass Sliders
'use client'

import { useState } from 'react'
import { ChevronDown, Layers, Eye, EyeOff, Radio, Satellite, Factory, Users, Database } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AVAILABLE_LAYERS } from '@/hooks/useMapLayers'

interface ModernLayerManagerProps {
  activeLayers: string[]
  onToggleLayer: (layerId: string) => void
  layerOpacity: Record<string, number>
  onUpdateOpacity: (layerId: string, opacity: number) => void
}

export default function ModernLayerManager({
  activeLayers,
  onToggleLayer,
  layerOpacity,
  onUpdateOpacity
}: ModernLayerManagerProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['atmospheric', 'satellite', 'industrial', 'population']))

  // Re-categorizing and mapping layers to match realistic/scientific domains
  const categories = [
    { id: 'atmospheric', name: 'Atmospheric Sensors', Icon: Radio, provider: 'OpenAQ / CPCB', color: 'from-[#0ea5e9] to-[#0284c7]', glow: 'rgba(14,165,233,0.5)' },
    { id: 'satellite', name: 'NASA Satellite', Icon: Satellite, provider: 'NASA VIIRS / FIRMS', color: 'from-[#f59e0b] to-[#d97706]', glow: 'rgba(245,158,11,0.5)' },
    { id: 'industrial', name: 'Industrial Infra', Icon: Factory, provider: 'GPPD Registry', color: 'from-[#64748b] to-[#475569]', glow: 'rgba(100,116,139,0.5)' },
    { id: 'population', name: 'Population Vulnerability', Icon: Users, provider: 'Copernicus ECMWF', color: 'from-[#10b981] to-[#059669]', glow: 'rgba(16,185,129,0.5)' }
  ]

  const getMappedCategory = (origCat: string) => {
    switch (origCat) {
      case 'pollution': return 'atmospheric'
      case 'fire':
      case 'satellite': return 'satellite'
      case 'industry': return 'industrial'
      case 'population': return 'population'
      default: return 'atmospheric' // fallback
    }
  }

  const layersByCategory = AVAILABLE_LAYERS.reduce((acc, layer) => {
    const mappedCat = getMappedCategory(layer.category)
    if (!acc[mappedCat]) acc[mappedCat] = []
    acc[mappedCat].push(layer)
    return acc
  }, {} as Record<string, typeof AVAILABLE_LAYERS>)

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) newExpanded.delete(categoryId)
    else newExpanded.add(categoryId)
    setExpandedCategories(newExpanded)
  }

  const activeCount = activeLayers.length

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full bg-[#020617]/80 backdrop-blur-2xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-[#1e293b] flex flex-col max-h-[calc(100vh-8rem)] overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 bg-[#0f172a] border-b border-[#334155] flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center shadow-inner">
            <Layers className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Telemetry Layers</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              <span className="text-[10px] text-[#94a3b8] uppercase font-semibold">{activeCount} streams active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#334155] scrollbar-track-transparent p-3 space-y-3 min-h-0">
        {categories.map((category) => {
          const catLayers = layersByCategory[category.id] || []
          if (catLayers.length === 0) return null

          const isExpanded = expandedCategories.has(category.id)
          const activeCatCount = catLayers.filter(l => activeLayers.includes(l.id)).length
          const isCatActive = activeCatCount > 0
          const Icon = category.Icon

          return (
            <div key={category.id} className="rounded-xl bg-[#0f172a]/60 border border-[#1e293b] overflow-hidden transition-colors hover:border-[#334155]">
              {/* Category Tab */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full px-4 py-3 flex items-center justify-between focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg relative overflow-hidden`}>
                    <Icon className="w-5 h-5 text-white relative z-10" />
                    {isCatActive && (
                      <motion.div 
                        className="absolute inset-0 bg-white opacity-20"
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-[#f8fafc]">{category.name}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Database className="w-3 h-3 text-[#64748b]" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">{category.provider}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isCatActive && (
                    <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1e293b] text-[#38bdf8] border border-[#38bdf8]/30">
                      {activeCatCount} ON
                    </div>
                  )}
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-[#64748b]" />
                  </motion.div>
                </div>
              </button>

              {/* Layers List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-[#1e293b] bg-[#020617]/40"
                  >
                    <div className="p-3 space-y-2">
                      {catLayers.map((layer) => {
                        const isActive = activeLayers.includes(layer.id)
                        const opacity = layerOpacity[layer.id] ?? layer.defaultOpacity ?? 1

                        return (
                          <div
                            key={layer.id}
                            className={`rounded-lg p-3 border transition-all ${
                              isActive 
                                ? 'bg-[#0f172a] border-[#38bdf8]/50 shadow-[inset_0_0_20px_rgba(56,189,248,0.1)]' 
                                : 'bg-[#0f172a]/40 border-[#1e293b] hover:border-[#334155]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0 pr-4">
                                <h4 className={`text-xs font-bold ${isActive ? 'text-[#e0f2fe]' : 'text-[#94a3b8]'} truncate`}>
                                  {layer.name}
                                </h4>
                                <p className="text-[10px] text-[#64748b] mt-1 leading-snug line-clamp-2">
                                  {layer.description}
                                </p>
                              </div>

                              {/* Glowing Toggle Switch */}
                              <button
                                onClick={() => onToggleLayer(layer.id)}
                                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  isActive ? 'bg-[#38bdf8]' : 'bg-[#334155]'
                                }`}
                                style={isActive ? { boxShadow: `0 0 10px ${category.glow}` } : {}}
                              >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  isActive ? 'translate-x-4' : 'translate-x-0'
                                }`} />
                              </button>
                            </div>

                            {/* High-Precision Glass Slider */}
                            {isActive && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-4 pt-3 border-t border-[#1e293b]"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Opacity</span>
                                  <div className="relative flex-1 h-1.5 bg-[#1e293b] rounded-full overflow-visible flex items-center">
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={opacity * 100}
                                      onChange={(e) => onUpdateOpacity(layer.id, parseInt(e.target.value) / 100)}
                                      className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                                    />
                                    {/* Custom track fill */}
                                    <div 
                                      className="absolute h-full rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] pointer-events-none z-10"
                                      style={{ width: `${opacity * 100}%` }}
                                    />
                                    {/* Custom thumb */}
                                    <div 
                                      className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(56,189,248,0.8)] pointer-events-none z-10 -ml-1.5"
                                      style={{ left: `${opacity * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-[#38bdf8] w-8 text-right">
                                    {Math.round(opacity * 100)}%
                                  </span>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
