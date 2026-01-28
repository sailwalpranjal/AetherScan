// AetherScan - Professional Responsive Layout
'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, X, Search as SearchIcon, BookmarkIcon, BarChart3, Keyboard } from 'lucide-react'
import PageLoader from '@/components/UI/PageLoader'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

// Dynamic imports for better performance
const BaseMap = dynamic(() => import('@/components/Map/BaseMap'), { ssr: false })
const Legend = dynamic(() => import('@/components/Map/Legend'), { ssr: false })
const TimeSlider = dynamic(() => import('@/components/Map/TimeSlider'), { ssr: false })

// Modern components
import ModernHeader from '@/components/UI/ModernHeader'
import ModernSearch from '@/components/UI/ModernSearch'
import ModernLayerManager from '@/components/UI/ModernLayerManager'
import UnifiedDataPanel from '@/components/UI/UnifiedDataPanel'
import LocationComparison from '@/components/UI/LocationComparison'
import BookmarkLocations from '@/components/UI/BookmarkLocations'

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

export default function Home() {
  // Loading state
  const [isPageLoading, setIsPageLoading] = useState(true)

  // State management
  const [activeLayers, setActiveLayers] = useState<string[]>(['pollution-heatmap'])
  const [layerOpacity, setLayerOpacity] = useState<Record<string, number>>({})
  const [timeRange, setTimeRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  // Collapsible panels state - all collapsed by default
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [layerPanelOpen, setLayerPanelOpen] = useState(false)
  const [searchPanelOpen, setSearchPanelOpen] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  const [timeSliderOpen, setTimeSliderOpen] = useState(false)

  // Page loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  // Listen for comparison requests from data panel
  useEffect(() => {
    const handleOpenComparison = (e: CustomEvent) => {
      if (e.detail) {
        setComparisonInitialLocation({
          lat: e.detail.lat,
          lon: e.detail.lon,
          name: e.detail.name
        })
      }
      setComparisonOpen(true)
    }
    window.addEventListener('openComparison', handleOpenComparison as EventListener)
    return () => window.removeEventListener('openComparison', handleOpenComparison as EventListener)
  }, [])

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 's',
      ctrlKey: true,
      action: () => setSearchPanelOpen(prev => !prev),
      description: 'Toggle search panel'
    },
    {
      key: 'l',
      ctrlKey: true,
      action: () => setLayerPanelOpen(prev => !prev),
      description: 'Toggle layer manager'
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => setLegendOpen(prev => !prev),
      description: 'Toggle legend'
    },
    {
      key: 'b',
      ctrlKey: true,
      action: () => setBookmarksOpen(prev => !prev),
      description: 'Toggle bookmarks'
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => setComparisonOpen(prev => !prev),
      description: 'Open comparison'
    },
    {
      key: 't',
      ctrlKey: true,
      action: () => setTimeSliderOpen(prev => !prev),
      description: 'Toggle time slider'
    },
    {
      key: '?',
      shiftKey: true,
      action: () => setShowKeyboardHelp(true),
      description: 'Show keyboard shortcuts'
    },
    {
      key: 'Escape',
      action: () => {
        setShowKeyboardHelp(false)
        setComparisonOpen(false)
        if (!selectedLocation) {
          setSearchPanelOpen(false)
          setBookmarksOpen(false)
        }
      },
      description: 'Close panels/modals'
    }
  ])

  const [viewState, setViewState] = useState<ViewState>({
    latitude: 20.5937,
    longitude: 78.9629,
    zoom: 4.5
  })
  const [selectedLocation, setSelectedLocation] = useState<AQIData | null>(null)
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [comparisonInitialLocation, setComparisonInitialLocation] = useState<{ lat: number; lon: number; name: string } | undefined>(undefined)
  const [bookmarksOpen, setBookmarksOpen] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

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

    // Fetch AQI for location
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const [aqiResponse, geoResponse] = await Promise.all([
        fetch(`${API_URL}/aqi/calculate?lat=${lat}&lon=${lon}`),
        fetch(`${API_URL}/search/reverse?lat=${lat}&lon=${lon}`)
      ])

      const aqiData = aqiResponse.ok ? await aqiResponse.json() : null
      const geoData = geoResponse.ok ? await geoResponse.json() : {}

      if (aqiData) {
        setSelectedLocation({
          ...aqiData,
          location: name,
          city: geoData.city || '',
          state: geoData.state || '',
          latitude: lat,
          longitude: lon
        })
        setSearchPanelOpen(true)
      }
    } catch (error) {
      console.error('Error fetching AQI:', error)
    }
  }, [])

  const handleMapClick = useCallback(async (lat: number, lon: number) => {
    // Don't override if clicked on industry - BaseMap handles that
    // This is for regular map clicks
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const [aqiResponse, geoResponse] = await Promise.all([
        fetch(`${API_URL}/aqi/calculate?lat=${lat}&lon=${lon}`),
        fetch(`${API_URL}/search/reverse?lat=${lat}&lon=${lon}`)
      ])

      const aqiData = aqiResponse.ok ? await aqiResponse.json() : null
      const geoData = geoResponse.ok ? await geoResponse.json() : {}

      if (aqiData) {
        setSelectedLocation({
          ...aqiData,
          location: geoData.name || 'Selected Location',
          city: geoData.city || '',
          state: geoData.state || '',
          latitude: lat,
          longitude: lon
        })
        setSearchPanelOpen(true)
      }
    } catch (error) {
      console.error('Error fetching location data:', error)
    }
  }, [])

  return (
    <>
      <PageLoader isLoading={isPageLoading} />
      <main className="relative w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"
          animate={{
            y: [0, 100, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            y: [0, -100, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Modern Header */}
      <ModernHeader
        activeLayersCount={activeLayers.length}
        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Map - Full Screen */}
      <div className="absolute inset-0 pt-14 sm:pt-16">
        <BaseMap
          activeLayers={activeLayers}
          layerOpacity={layerOpacity}
          timeRange={timeRange}
          viewState={viewState}
          onViewStateChange={setViewState}
          onClick={handleMapClick}
        />
      </div>

      {/* Left Panel - Collapsible Search & Tools */}
      <div className="absolute top-20 sm:top-24 left-2 sm:left-4 z-40 w-[calc(100%-1rem)] sm:w-auto sm:max-w-md">
        {/* Toggle Buttons Row - Mobile */}
        <div className="flex flex-wrap gap-2 mb-2 sm:hidden">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSearchPanelOpen(!searchPanelOpen)}
            className={`px-3 py-2 rounded-lg glass hover:bg-white/10 transition-all flex items-center gap-2 border ${searchPanelOpen ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-white/10'}`}
          >
            <SearchIcon className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium text-white">Search</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setBookmarksOpen(!bookmarksOpen)}
            className={`px-3 py-2 rounded-lg glass hover:bg-white/10 transition-all flex items-center gap-2 border ${bookmarksOpen ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10'}`}
          >
            <BookmarkIcon className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-white">Saved</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setComparisonOpen(true)}
            className="px-3 py-2 rounded-lg glass hover:bg-white/10 transition-all flex items-center gap-2 border border-white/10"
          >
            <BarChart3 className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium text-white">Compare</span>
          </motion.button>
        </div>

        {/* Search Panel - Collapsible */}
        <AnimatePresence>
          {searchPanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-3 sm:mb-4"
            >
              <ModernSearch onLocationSelect={handleLocationSelect} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Tools Row */}
        <AnimatePresence>
          {searchPanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="hidden sm:flex gap-2 mb-4"
            >
              <motion.div whileHover={{ scale: 1.02 }} className="flex-1">
                <BookmarkLocations onSelectLocation={handleLocationSelect} />
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setComparisonOpen(true)}
                className="px-4 py-2 rounded-lg glass hover:bg-white/10 transition-all flex items-center gap-2 group border border-white/10"
              >
                <BarChart3 className="w-4 h-4 text-green-400 group-hover:text-green-300 transition-colors" />
                <span className="text-sm font-medium text-white">Compare</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Bookmarks Panel */}
        <AnimatePresence>
          {bookmarksOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="sm:hidden mb-3"
            >
              <BookmarkLocations onSelectLocation={handleLocationSelect} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Panel - Always visible when there's selected location */}
        <AnimatePresence>
          {selectedLocation && searchPanelOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <UnifiedDataPanel
                data={selectedLocation}
                onClose={() => setSelectedLocation(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Location Comparison Modal */}
      <LocationComparison
        isOpen={comparisonOpen}
        onClose={() => {
          setComparisonOpen(false)
          setComparisonInitialLocation(undefined)
        }}
        initialLocation={comparisonInitialLocation || (selectedLocation ? {
          lat: selectedLocation.latitude!,
          lon: selectedLocation.longitude!,
          name: selectedLocation.location || 'Current Location'
        } : undefined)}
      />

      {/* Right Panel - Layer Manager (Desktop Collapsible) */}
      <div className="hidden lg:block absolute top-20 sm:top-24 right-2 sm:right-4 z-40">
        <div className="relative">
          {/* Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setLayerPanelOpen(!layerPanelOpen)}
            className="glass px-4 py-2 rounded-lg shadow-xl hover:shadow-2xl transition-all border border-white/10 mb-2 flex items-center gap-2 ml-auto"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">{activeLayers.length} Active</span>
            <motion.div
              animate={{ rotate: layerPanelOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </motion.button>

          {/* Layer Panel - Collapsible */}
          <AnimatePresence>
            {layerPanelOpen && (
              <motion.div
                initial={{ opacity: 0, x: 20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.3 }}
                className="w-96 max-w-[calc(50vw-2rem)] max-h-[calc(100vh-12rem)]"
              >
                <ModernLayerManager
                  activeLayers={activeLayers}
                  onToggleLayer={toggleLayer}
                  layerOpacity={layerOpacity}
                  onUpdateOpacity={updateOpacity}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Layer Manager - Full Screen Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">Layer Manager</h2>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-lg glass hover:bg-white/10 transition-all flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Mobile Layer Content */}
              <div className="h-[calc(100vh-4rem)] overflow-y-auto">
                <ModernLayerManager
                  activeLayers={activeLayers}
                  onToggleLayer={toggleLayer}
                  layerOpacity={layerOpacity}
                  onUpdateOpacity={updateOpacity}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Left - Legend - Collapsible */}
      <div className="hidden md:block absolute bottom-20 sm:bottom-24 left-2 sm:left-4 z-30 max-w-xs">
        <div className="relative flex flex-col-reverse">
          {/* Legend Panel - appears above button */}
          <AnimatePresence>
            {legendOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mb-2"
              >
                <Legend activeLayers={activeLayers} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle Button - always at bottom */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setLegendOpen(!legendOpen)}
            className="glass px-3 py-2 rounded-lg flex items-center gap-2 border border-white/10 text-xs font-semibold text-white"
          >
            <span>Legend</span>
            <motion.div
              animate={{ rotate: legendOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </motion.button>
        </div>
      </div>

      {/* Bottom Center - Time Slider - Collapsible */}
      <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-3xl px-2 sm:px-4">
        <div className="relative">
          {/* Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTimeSliderOpen(!timeSliderOpen)}
            className="glass px-3 py-2 rounded-lg mb-2 mx-auto flex items-center gap-2 border border-white/10 text-xs font-semibold text-white"
          >
            <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Time Range</span>
            <motion.div
              animate={{ rotate: timeSliderOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {timeSliderOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                <TimeSlider
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Keyboard Shortcuts Help - Bottom Right */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowKeyboardHelp(true)}
        className="fixed bottom-4 right-4 z-30 w-10 h-10 rounded-full glass border border-white/10 hover:bg-white/10 flex items-center justify-center group"
        title="Keyboard Shortcuts (Shift + ?)"
      >
        <Keyboard className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
      </motion.button>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showKeyboardHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowKeyboardHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 bg-gradient-to-r from-slate-900/90 to-slate-800/90">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <Keyboard className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
                  </div>
                  <button
                    onClick={() => setShowKeyboardHelp(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg glass hover:bg-white/10 transition-all"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm text-white">Toggle Search</span>
                  <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs font-mono text-cyan-400">Ctrl + S</kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm text-white">Toggle Layers</span>
                  <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs font-mono text-cyan-400">Ctrl + L</kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm text-white">Toggle Legend</span>
                  <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs font-mono text-cyan-400">Ctrl + E</kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm text-white">Toggle Bookmarks</span>
                  <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs font-mono text-cyan-400">Ctrl + B</kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm text-white">Open Comparison</span>
                  <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs font-mono text-cyan-400">Ctrl + K</kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm text-white">Toggle Time Slider</span>
                  <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs font-mono text-cyan-400">Ctrl + T</kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm text-white">Close Panels</span>
                  <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs font-mono text-cyan-400">Esc</kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm text-white">Show This Help</span>
                  <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs font-mono text-cyan-400">Shift + ?</kbd>
                </div>
              </div>

              <div className="p-4 border-t border-white/10 bg-white/5">
                <p className="text-xs text-center text-gray-400">
                  Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-cyan-400">Esc</kbd> to close
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
    </>
  )
}
