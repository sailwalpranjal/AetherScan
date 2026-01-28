'use client'

import { useState } from 'react'
import { Layers, ChevronDown, ChevronUp } from 'lucide-react'
import { AVAILABLE_LAYERS } from '@/hooks/useMapLayers'

interface LayerManagerProps {
  activeLayers: string[]
  onToggleLayer: (layerId: string) => void
  layerOpacity: Record<string, number>
  onUpdateOpacity: (layerId: string, opacity: number) => void
}

export default function LayerManager({
  activeLayers,
  onToggleLayer,
  layerOpacity,
  onUpdateOpacity,
}: LayerManagerProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['pollution']))

  const categories = Array.from(new Set(AVAILABLE_LAYERS.map((l) => l.category)))

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  return (
    <div className="glass rounded-2xl overflow-hidden shadow-2xl border border-white/10">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-all duration-200"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <span className="font-bold text-white block">Map Layers</span>
            <span className="text-xs text-gray-400">{activeLayers.length} active</span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Layer List */}
      {isExpanded && (
        <div className="p-3 max-h-[calc(100vh-300px)] md:max-h-96 overflow-y-auto custom-scrollbar">
          {categories.map((category) => {
            const categoryLayers = AVAILABLE_LAYERS.filter((l) => l.category === category)
            const isOpen = expandedCategories.has(category)

            return (
              <div key={category} className="mb-3 last:mb-0">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-3 py-2 flex items-center justify-between text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all capitalize"
                >
                  <span>{category}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                </button>

                {isOpen && (
                  <div className="mt-2 space-y-2">
                    {categoryLayers.map((layer) => {
                      const isActive = activeLayers.includes(layer.id)
                      const opacity = layerOpacity[layer.id] ?? layer.defaultOpacity

                      return (
                        <div
                          key={layer.id}
                          className="bg-white/5 rounded-xl p-2.5 md:p-3 border border-white/10 hover:border-white/20 transition-all"
                        >
                          <label className="flex items-start space-x-2 md:space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => onToggleLayer(layer.id)}
                              className="w-4 h-4 md:w-5 md:h-5 mt-0.5 rounded border-2 border-gray-600 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer transition-all flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs md:text-sm font-medium text-white break-words">{layer.name}</div>
                              <div className="text-xs text-gray-400 mt-0.5 break-words">{layer.description}</div>
                            </div>
                          </label>

                          {isActive && (
                            <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-white/10">
                              <label className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3">
                                <span className="text-xs font-medium text-gray-300 md:w-16">Opacity:</span>
                                <div className="flex items-center space-x-2 flex-1">
                                  <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={opacity}
                                    onChange={(e) => onUpdateOpacity(layer.id, parseFloat(e.target.value))}
                                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                                  />
                                  <span className="text-xs font-bold text-white w-12 text-center bg-white/10 px-2 py-1 rounded-lg flex-shrink-0">
                                    {Math.round(opacity * 100)}%
                                  </span>
                                </div>
                              </label>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
