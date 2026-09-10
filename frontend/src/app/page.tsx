// AetherScan - Professional Responsive Layout
'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, X, Search as SearchIcon, BookmarkIcon, BarChart3, Keyboard } from 'lucide-react'
import PageLoader from '@/components/UI/PageLoader'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { Button } from '@/components/UI/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card'
import { Badge } from '@/components/UI/badge'
import CustomCursor from '@/components/UI/CustomCursor'
import FloatingParticles from '@/components/UI/FloatingParticles'
import { buildApiUrl } from '@/lib/api'

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

// Keyboard shortcut item component
const ShortcutItem = ({ label, keys }: { label: string; keys: string }) => (
  <motion.div
    whileHover={{ scale: 1.02, x: 4 }}
    className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-cyan-500/20 group"
  >
    <span className="text-sm text-white group-hover:text-cyan-400 transition-colors">{label}</span>
    <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 shadow-sm group-hover:shadow-cyan-500/20">
      {keys}
    </Badge>
  </motion.div>
)

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

  // Collapsible panels state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [layerPanelOpen, setLayerPanelOpen] = useState(false)
  const [searchPanelOpen, setSearchPanelOpen] = useState(true)
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
  const [selectedIndustry, setSelectedIndustry] = useState<any | null>(null)
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

  const handleLocationSelect = useCallback(async (lat: number, lon: number, name: string, item?: any) => {
    setViewState({
      latitude: lat,
      longitude: lon,
      zoom: item?.category === 'power-plant' || item?.category === 'industry' ? 12 : 10
    })

    if (item && (item.category === 'power-plant' || item.category === 'industry' || item.category === 'refinery' || item.capacity_mw)) {
      setSelectedIndustry({
        id: item.id || name,
        name: item.name || name,
        type: item.type || 'Power Plant',
        capacity_mw: item.capacity_mw,
        latitude: lat,
        longitude: lon,
        state: item.state,
        ...(item.details || {})
      })
    } else {
      setSelectedIndustry(null)
    }

    // Fetch AQI for location
    try {
      const [aqiResponse, geoResponse] = await Promise.all([
        fetch(buildApiUrl(`/aqi/calculate?lat=${lat}&lon=${lon}`)),
        fetch(buildApiUrl(`/search/reverse?lat=${lat}&lon=${lon}`))
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
      const [aqiResponse, geoResponse] = await Promise.all([
        fetch(buildApiUrl(`/aqi/calculate?lat=${lat}&lon=${lon}`)),
        fetch(buildApiUrl(`/search/reverse?lat=${lat}&lon=${lon}`))
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
      <CustomCursor />
      <FloatingParticles count={40} />
      <main className="relative w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Morphing gradient orbs */}
        <motion.div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
          }}
          animate={{
            y: [0, 100, 0],
            x: [0, 50, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, -50, 0],
            scale: [1, 1.4, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(157, 78, 221, 0.1) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.5, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />

        {/* Scanline effect */}
        <motion.div
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
          animate={{
            y: ['0%', '100%'],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear',
          }}
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
          selectedIndustry={selectedIndustry}
          onSelectIndustry={setSelectedIndustry}
        />
      </div>

      {/* Left Panel - Collapsible Search & Tools */}
      <div className="absolute top-20 sm:top-24 left-2 sm:left-4 z-40 w-[calc(100%-1rem)] sm:w-auto sm:max-w-md">
        {/* Toggle Buttons Row */}
        <div className="flex flex-wrap gap-2 mb-2">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={searchPanelOpen ? "default" : "neon"}
              size="sm"
              onClick={() => setSearchPanelOpen(!searchPanelOpen)}
              className="gap-2"
            >
              <SearchIcon className="w-4 h-4" />
              <span className="text-xs font-medium">Search</span>
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={bookmarksOpen ? "secondary" : "neon"}
              size="sm"
              onClick={() => setBookmarksOpen(!bookmarksOpen)}
              className="gap-2"
            >
              <BookmarkIcon className="w-4 h-4" />
              <span className="text-xs font-medium">Saved</span>
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="neon"
              size="sm"
              onClick={() => setComparisonOpen(true)}
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-medium">Compare</span>
            </Button>
          </motion.div>
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8"
                >
                  <X className="w-5 h-5" />
                </Button>
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
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="neon"
              size="sm"
              onClick={() => setLegendOpen(!legendOpen)}
              className="gap-2"
            >
              <span>Legend</span>
              <motion.div
                animate={{ rotate: legendOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Bottom Center - Time Slider - Collapsible */}
      <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-3xl px-2 sm:px-4">
        <div className="relative">
          {/* Toggle Button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mb-2 mx-auto flex"
          >
            <Button
              variant="neon"
              size="sm"
              onClick={() => setTimeSliderOpen(!timeSliderOpen)}
              className="gap-2"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Time Range</span>
              <motion.div
                animate={{ rotate: timeSliderOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </Button>
          </motion.div>

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
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-4 right-4 z-30"
      >
        <Button
          variant="neon"
          size="icon"
          onClick={() => setShowKeyboardHelp(true)}
          className="w-10 h-10 rounded-full shadow-lg shadow-cyan-500/20"
          title="Keyboard Shortcuts (Shift + ?)"
        >
          <Keyboard className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showKeyboardHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setShowKeyboardHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Card className="overflow-hidden border-cyan-500/30 shadow-[0_0_50px_rgba(0,255,255,0.25)]">
                <CardHeader className="bg-gradient-to-r from-slate-900/95 to-slate-800/95 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                        <Keyboard className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className="text-xl">Keyboard Shortcuts</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowKeyboardHelp(false)}
                      className="w-8 h-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-2">
                  <ShortcutItem label="Toggle Search" keys="Ctrl + S" />
                  <ShortcutItem label="Toggle Layers" keys="Ctrl + L" />
                  <ShortcutItem label="Toggle Legend" keys="Ctrl + E" />
                  <ShortcutItem label="Toggle Bookmarks" keys="Ctrl + B" />
                  <ShortcutItem label="Open Comparison" keys="Ctrl + K" />
                  <ShortcutItem label="Toggle Time Slider" keys="Ctrl + T" />
                  <ShortcutItem label="Close Panels" keys="Esc" />
                  <ShortcutItem label="Show This Help" keys="Shift + ?" />
                </CardContent>

                <div className="p-4 border-t border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                  <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-2">
                    Press <Badge variant="neon" className="text-xs px-2 py-0.5">Esc</Badge> to close
                  </p>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
    </>
  )
}
