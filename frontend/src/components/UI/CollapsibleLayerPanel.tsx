// Professional Collapsible Layer Panel
'use client'

import { useState } from 'react'
import { ChevronRight, Layers, Eye, EyeOff, Cloud, Flame, Users, Satellite, Factory, Map } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AVAILABLE_LAYERS } from '@/hooks/useMapLayers'

interface CollapsibleLayerPanelProps {
  activeLayers: string[]
  onToggleLayer: (layerId: string) => void
  layerOpacity: Record<string, number>
  onUpdateOpacity: (layerId: string, opacity: number) => void
  isOpen: boolean
  onToggle: () => void
}

export default function CollapsibleLayerPanel({
  activeLayers,
  onToggleLayer,
  layerOpacity,
  onUpdateOpacity,
  isOpen,
  onToggle
}: CollapsibleLayerPanelProps) {
  const layers = AVAILABLE_LAYERS
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['pollution']))

  const categories = [
    { id: 'pollution', name: 'Pollution Layers', icon: Cloud, color: 'from-red-500 to-orange-500' },
    { id: 'fire', name: 'Fire Detection', icon: Flame, color: 'from-orange-500 to-yellow-500' },
    { id: 'population', name: 'Population Data', icon: Users, color: 'from-green-500 to-emerald-500' },
    { id: 'satellite', name: 'Satellite Data', icon: Satellite, color: 'from-purple-500 to-pink-500' },
    { id: 'industry', name: 'Industrial Zones', icon: Factory, color: 'from-gray-500 to-slate-500' },
    { id: 'other', name: 'Other Layers', icon: Map, color: 'from-blue-500 to-cyan-500' }
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
    <div className="relative">
      {/* Toggle Button */}
      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg glass border border-white/10 hover:border-cyan-500/50 transition-all shadow-lg"
      >
        <Layers className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-semibold text-white hidden sm:inline">Layers</span>
        <span className="text-xs text-gray-400">({activeCount})</span>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </motion.div>
      </motion.button>

      {/* Collapsible Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-80 sm:w-96 max-h-[calc(100vh-12rem)] overflow-hidden rounded-xl glass border border-white/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-900/90 to-slate-800/90 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Map Layers</h3>
                    <p className="text-xs text-gray-400">{activeCount} active</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Categories & Layers */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
              {categories.map((category) => {
                const categoryLayers = layersByCategory[category.id] || []
                if (categoryLayers.length === 0) return null

                const isExpanded = expandedCategories.has(category.id)
                const activeCategoryCount = categoryLayers.filter(l => activeLayers.includes(l.id)).length
                const Icon = category.icon

                return (
                  <div
                    key={category.id}
                    className="rounded-lg overflow-hidden glass border border-white/10"
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-semibold text-white">{category.name}</span>
                          {activeCategoryCount > 0 && (
                            <span className="ml-2 text-xs text-cyan-400">({activeCategoryCount})</span>
                          )}
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
                      </motion.div>
                    </button>

                    {/* Category Layers */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 py-2 space-y-1 bg-slate-900/20">
                            {categoryLayers.map((layer) => {
                              const isActive = activeLayers.includes(layer.id)
                              const opacity = layerOpacity[layer.id] ?? layer.defaultOpacity

                              return (
                                <div
                                  key={layer.id}
                                  className={`rounded-lg p-2 transition-all ${
                                    isActive ? 'bg-cyan-500/10 border border-cyan-500/30' : 'hover:bg-white/5 border border-transparent'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <button
                                      onClick={() => onToggleLayer(layer.id)}
                                      className="flex-1 flex items-start gap-2 text-left"
                                    >
                                      <div className="pt-0.5">
                                        {isActive ? (
                                          <Eye className="w-4 h-4 text-cyan-400" />
                                        ) : (
                                          <EyeOff className="w-4 h-4 text-gray-500" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium text-white truncate">{layer.name}</div>
                                        <div className="text-xs text-gray-400 truncate">{layer.description}</div>
                                      </div>
                                    </button>
                                  </div>

                                  {/* Opacity Slider */}
                                  {isActive && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="mt-2 pt-2 border-t border-white/10"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">Opacity:</span>
                                        <input
                                          type="range"
                                          min="0"
                                          max="1"
                                          step="0.1"
                                          value={opacity}
                                          onChange={(e) => onUpdateOpacity(layer.id, parseFloat(e.target.value))}
                                          className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                                        />
                                        <span className="text-xs font-mono text-cyan-400 w-8 text-right">
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
        )}
      </AnimatePresence>
    </div>
  )
}
