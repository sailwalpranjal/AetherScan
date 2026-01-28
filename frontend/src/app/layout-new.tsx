// AetherScan - Professional Responsive Layout
'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Menu } from 'lucide-react'
import Image from 'next/image'

// Dynamic imports for better performance
const BaseMap = dynamic(() => import('@/components/Map/BaseMap'), { ssr: false })
const CollapsibleLayerPanel = dynamic(() => import('@/components/UI/CollapsibleLayerPanel'), { ssr: false })

// New modern components
import ModernSearch from '@/components/UI/ModernSearch'

interface ViewState {
  latitude: number
  longitude: number
  zoom: number
}

interface AQIData {
  aqi: number
  category: string
  color: string
  dominant_pollutant?: string
  location?: string
  city?: string
  state?: string
  latitude?: number
  longitude?: number
  pollutants?: {
    pm25?: number
    pm10?: number
    no2?: number
    so2?: number
    co?: number
    o3?: number
  }
}

export default function HomeLayout() {
  // State management
  const [activeLayers, setActiveLayers] = useState<string[]>(['pollution-heatmap'])
  const [layerOpacity, setLayerOpacity] = useState<Record<string, number>>({})
  const [layerPanelOpen, setLayerPanelOpen] = useState(false)
  const [viewState, setViewState] = useState<ViewState>({
    latitude: 20.5937,
    longitude: 78.9629,
    zoom: 4.5
  })

  // Handlers
  const toggleLayer = (layerId: string) => {
    setActiveLayers((prev) =>
      prev.includes(layerId)
        ? prev.filter((id) => id !== layerId)
        : [...prev, layerId]
    )
  }

  const updateOpacity = (layerId: string, opacity: number) => {
    setLayerOpacity((prev) => ({ ...prev, [layerId]: opacity }))
  }

  const handleLocationSelect = useCallback(async (lat: number, lon: number, name: string) => {
    setViewState({
      latitude: lat,
      longitude: lon,
      zoom: 10
    })
  }, [])

  return (
    <main className="relative w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Professional Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 backdrop-blur-xl bg-slate-900/80">
        <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg overflow-hidden">
                <Image
                  src="/media/icon-16.png"
                  alt="AetherScan"
                  width={16}
                  height={16}
                  className="w-4 h-4 sm:w-5 sm:h-5"
                />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  AetherScan
                </h1>
                <p className="hidden sm:block text-xs text-gray-400">Air Quality Intelligence</p>
              </div>
            </div>

            {/* Center Status */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <motion.div
                className="w-2 h-2 rounded-full bg-emerald-400"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-xs font-semibold text-emerald-400">Live Data</span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              <CollapsibleLayerPanel
                activeLayers={activeLayers}
                onToggleLayer={toggleLayer}
                layerOpacity={layerOpacity}
                onUpdateOpacity={updateOpacity}
                isOpen={layerPanelOpen}
                onToggle={() => setLayerPanelOpen(!layerPanelOpen)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Map */}
      <div className="absolute inset-0 pt-14 sm:pt-16">
        <BaseMap
          activeLayers={activeLayers}
          layerOpacity={layerOpacity}
          timeRange={{
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0],
          }}
          viewState={viewState}
          onViewStateChange={setViewState}
          onClick={() => {}}
        />
      </div>

      {/* Search - Top Left */}
      <div className="absolute top-20 sm:top-24 left-2 sm:left-4 z-40 w-[calc(100%-1rem)] sm:w-full max-w-md">
        <ModernSearch onLocationSelect={handleLocationSelect} />
      </div>
    </main>
  )
}
