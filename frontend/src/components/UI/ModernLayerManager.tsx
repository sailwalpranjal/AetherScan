// Modern Futuristic Layer Manager
'use client'

import { useState } from 'react'
import { ChevronDown, Layers, Eye, EyeOff, Cloud, Flame, Users, Satellite, Factory, Map } from 'lucide-react'
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
  const layers = AVAILABLE_LAYERS
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['pollution']))

  const categories = [
    { id: 'pollution', name: 'Pollution', Icon: Cloud, color: 'from-red-500 to-orange-500' },
    { id: 'fire', name: 'Fire Detection', Icon: Flame, color: 'from-orange-500 to-yellow-500' },
    { id: 'population', name: 'Population', Icon: Users, color: 'from-green-500 to-emerald-500' },
    { id: 'satellite', name: 'Satellite', Icon: Satellite, color: 'from-purple-500 to-pink-500' },
    { id: 'industry', name: 'Industry', Icon: Factory, color: 'from-gray-500 to-slate-500' },
    { id: 'other', name: 'Other Layers', Icon: Map, color: 'from-blue-500 to-cyan-500' }
  ]

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const layersByCategory = layers.reduce((acc, layer) => {
    if (!acc[layer.category]) {
      acc[layer.category] = []
    }
    acc[layer.category].push(layer)
    return acc
  }, {} as Record<string, typeof layers>)

  const activeCount = activeLayers.length

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full glass rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[calc(100vh-12rem)]"
    >
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-slate-900/90 to-slate-800/90 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Map Layers</h3>
              <p className="text-xs text-gray-400">{activeCount} active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories & Layers */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent p-4 space-y-3 min-h-0">
        {categories.map((category) => {
          const categoryLayers = layersByCategory[category.id] || []
          if (categoryLayers.length === 0) return null

          const isExpanded = expandedCategories.has(category.id)
          const activeCategoryCount = categoryLayers.filter(l => activeLayers.includes(l.id)).length

          const Icon = category.Icon
          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden glass border border-white/10"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white">{category.name}</div>
                    {activeCategoryCount > 0 && (
                      <div className="text-xs text-cyan-400">{activeCategoryCount} active</div>
                    )}
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </motion.div>
              </button>

              {/* Layer List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-white/5"
                  >
                    <div className="p-2 space-y-2">
                      {categoryLayers.map((layer) => {
                        const isActive = activeLayers.includes(layer.id)
                        const opacity = layerOpacity[layer.id] ?? layer.defaultOpacity ?? 1

                        return (
                          <motion.div
                            key={layer.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`
                              rounded-lg p-3 transition-all cursor-pointer
                              ${isActive ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-white/5 border border-white/5 hover:border-white/10'}
                            `}
                          >
                            {/* Layer Toggle */}
                            <div
                              onClick={() => onToggleLayer(layer.id)}
                              className="flex items-start gap-3 mb-2"
                            >
                              <div className={`
                                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all
                                ${isActive ? 'bg-gradient-to-br from-cyan-500 to-blue-600' : 'bg-white/10'}
                              `}>
                                {isActive ? (
                                  <Eye className="w-5 h-5 text-white" />
                                ) : (
                                  <EyeOff className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-300'} truncate`}>
                                  {layer.name}
                                </div>
                                <div className="text-xs text-gray-400 line-clamp-2 mt-0.5">
                                  {layer.description}
                                </div>
                              </div>
                            </div>

                            {/* Opacity Slider */}
                            {isActive && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="pt-2 border-t border-white/10"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-400 w-14">Opacity:</span>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={opacity * 100}
                                    onChange={(e) => onUpdateOpacity(layer.id, parseInt(e.target.value) / 100)}
                                    className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                                      [&::-webkit-slider-thumb]:appearance-none
                                      [&::-webkit-slider-thumb]:w-4
                                      [&::-webkit-slider-thumb]:h-4
                                      [&::-webkit-slider-thumb]:rounded-full
                                      [&::-webkit-slider-thumb]:bg-gradient-to-br
                                      [&::-webkit-slider-thumb]:from-cyan-500
                                      [&::-webkit-slider-thumb]:to-blue-600
                                      [&::-webkit-slider-thumb]:shadow-lg
                                      [&::-webkit-slider-thumb]:shadow-cyan-500/50
                                      [&::-webkit-slider-thumb]:cursor-pointer
                                      hover:[&::-webkit-slider-thumb]:shadow-cyan-500/70
                                    "
                                  />
                                  <span className="text-xs font-medium text-cyan-400 w-10 text-right">
                                    {Math.round(opacity * 100)}%
                                  </span>
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gradient-to-r from-slate-900/90 to-slate-800/90 border-t border-white/10 flex-shrink-0">
        <div className="text-center text-xs text-gray-400">
          {activeCount} of {layers.length} layers active
        </div>
      </div>
    </motion.div>
  )
}
