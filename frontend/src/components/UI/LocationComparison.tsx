// Location Comparison Component
'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, MapPin, TrendingUp, TrendingDown, Award, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { aqiAPI } from '@/lib/api'

interface LocationData {
  id: string
  name: string
  latitude: number
  longitude: number
  aqi?: number
  category?: string
  color?: string
  dominant_pollutant?: string
  loading: boolean
  error?: string
}

interface LocationComparisonProps {
  isOpen: boolean
  onClose: () => void
  initialLocation?: { lat: number; lon: number; name?: string }
}

export default function LocationComparison({ isOpen, onClose, initialLocation }: LocationComparisonProps) {
  const [locations, setLocations] = useState<LocationData[]>([])
  const [newLocationName, setNewLocationName] = useState('')
  const [newLat, setNewLat] = useState('')
  const [newLon, setNewLon] = useState('')
  const [hasProcessedInitial, setHasProcessedInitial] = useState(false)

  // Handle initial location from Compare button
  useEffect(() => {
    if (initialLocation && !hasProcessedInitial && isOpen) {
      const isDuplicate = locations.some(loc =>
        Math.abs(loc.latitude - initialLocation.lat) < 0.01 &&
        Math.abs(loc.longitude - initialLocation.lon) < 0.01
      )

      if (!isDuplicate) {
        addLocation(
          initialLocation.name || 'Selected Location',
          initialLocation.lat,
          initialLocation.lon
        )
      }
      setHasProcessedInitial(true)
    }
  }, [initialLocation, isOpen])

  // Reset processed flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasProcessedInitial(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || locations.length > 0) return

    const saved = localStorage.getItem('aqi-comparison-locations')
    if (!saved) return

    try {
      const parsed = JSON.parse(saved) as Array<{ name: string; latitude: number; longitude: number }>
      parsed.slice(0, 6).forEach((location) => {
        addLocation(location.name, location.latitude, location.longitude)
      })
    } catch (error) {
      console.error('Failed to restore comparison locations:', error)
      localStorage.removeItem('aqi-comparison-locations')
    }
  }, [isOpen, locations.length])

  useEffect(() => {
    if (locations.length > 0) {
      const toSave = locations.map(loc => ({
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude
      }))
      localStorage.setItem('aqi-comparison-locations', JSON.stringify(toSave))
    }
  }, [locations])

  const addLocation = async (name: string, lat: number, lon: number) => {
    // Check for duplicates within 0.01 degrees (~1km)
    const isDuplicate = locations.some(loc =>
      Math.abs(loc.latitude - lat) < 0.01 &&
      Math.abs(loc.longitude - lon) < 0.01
    )

    if (isDuplicate) {
      alert('A location very close to these coordinates is already in the comparison list.')
      return
    }

    // Limit to 6 locations for better UX
    if (locations.length >= 6) {
      alert('Maximum 6 locations can be compared at once. Remove one to add another.')
      return
    }

    // Generate truly unique ID using timestamp + random
    const id = `${lat}-${lon}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    const newLocation: LocationData = {
      id,
      name,
      latitude: lat,
      longitude: lon,
      loading: true
    }

    setLocations(prev => [...prev, newLocation])

    try {
      const result = await aqiAPI.calculateAtPoint(lat, lon)
      setLocations(prev =>
        prev.map(loc =>
          loc.id === id
            ? {
                ...loc,
                aqi: result.aqi,
                category: result.category,
                color: result.color,
                dominant_pollutant: result.dominant_pollutant,
                loading: false
              }
            : loc
        )
      )
    } catch (error) {
      setLocations(prev =>
        prev.map(loc =>
          loc.id === id
            ? { ...loc, loading: false, error: 'Failed to fetch AQI' }
            : loc
        )
      )
    }
  }

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault()
    const lat = parseFloat(newLat)
    const lon = parseFloat(newLon)

    if (!newLocationName || isNaN(lat) || isNaN(lon)) {
      alert('Please provide valid location name and coordinates')
      return
    }

    addLocation(newLocationName, lat, lon)
    setNewLocationName('')
    setNewLat('')
    setNewLon('')
  }

  const removeLocation = (id: string) => {
    setLocations(prev => prev.filter(loc => loc.id !== id))
  }

  const clearAll = () => {
    setLocations([])
    localStorage.removeItem('aqi-comparison-locations')
  }

  if (!isOpen) return null

  const sortedLocations = [...locations].sort((a, b) => (b.aqi || 0) - (a.aqi || 0))

  // Calculate statistics
  const validLocations = locations.filter(loc => loc.aqi !== undefined && !loc.loading && !loc.error)
  const bestLocation = validLocations.length > 0 ? validLocations.reduce((min, loc) => (loc.aqi! < min.aqi! ? loc : min)) : null
  const worstLocation = validLocations.length > 0 ? validLocations.reduce((max, loc) => (loc.aqi! > max.aqi! ? loc : max)) : null
  const avgAQI = validLocations.length > 0 ? validLocations.reduce((sum, loc) => sum + (loc.aqi || 0), 0) / validLocations.length : 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-4xl max-h-[90vh] overflow-hidden glass rounded-2xl border border-white/10 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-slate-900/90 to-slate-800/90">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Location Comparison
            </h2>
            <div className="flex gap-2">
              {locations.length > 0 && (
                <button
                  onClick={clearAll}
                  className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg glass hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto">
            {/* Comparison Statistics */}
            {validLocations.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3"
              >
                <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-semibold text-green-400">Best Air Quality</span>
                  </div>
                  <p className="text-sm font-bold text-white truncate">{bestLocation?.name}</p>
                  <p className="text-lg font-bold text-green-400">AQI: {bestLocation?.aqi}</p>
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-cyan-400">Average AQI</span>
                  </div>
                  <p className="text-sm font-medium text-white">Across all locations</p>
                  <p className="text-lg font-bold text-cyan-400">{avgAQI.toFixed(0)}</p>
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-semibold text-red-400">Worst Air Quality</span>
                  </div>
                  <p className="text-sm font-bold text-white truncate">{worstLocation?.name}</p>
                  <p className="text-lg font-bold text-red-400">AQI: {worstLocation?.aqi}</p>
                </div>
              </motion.div>
            )}

            {/* Add Location Form */}
            <form onSubmit={handleAddLocation} className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Location name"
                  value={newLocationName}
                  onChange={e => setNewLocationName(e.target.value)}
                  className="flex-1 min-w-[150px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={newLat}
                  onChange={e => setNewLat(e.target.value)}
                  className="w-32 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={newLon}
                  onChange={e => setNewLon(e.target.value)}
                  className="w-32 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm font-medium transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </form>

            {/* Locations Grid */}
            {locations.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No locations added yet</p>
                <p className="text-gray-500 text-xs mt-1">Add locations to compare their AQI values</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedLocations.map((location, index) => (
                  <motion.div
                    key={location.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative p-4 rounded-lg glass border border-white/10 hover:border-white/20 transition-all"
                  >
                    {/* Remove Button */}
                    <button
                      onClick={() => removeLocation(location.id)}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all group"
                    >
                      <Trash2 className="w-3 h-3 text-red-400 group-hover:text-red-300" />
                    </button>

                    {/* Location Name */}
                    <h3 className="text-sm font-semibold text-white mb-1 pr-8 truncate">
                      {location.name}
                    </h3>
                    <p className="text-xs text-gray-400 font-mono mb-3">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </p>

                    {/* AQI Display */}
                    {location.loading ? (
                      <div className="text-center py-4">
                        <div className="inline-block w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-gray-400 mt-2">Loading...</p>
                      </div>
                    ) : location.error ? (
                      <div className="text-center py-4">
                        <p className="text-xs text-red-400">{location.error}</p>
                      </div>
                    ) : (
                      <>
                        {/* Ranking Badge */}
                        {validLocations.length >= 2 && (
                          <div className="absolute top-2 left-2 flex gap-1">
                            {location.id === bestLocation?.id && (
                              <div className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 flex items-center gap-1">
                                <Award className="w-3 h-3 text-green-400" />
                                <span className="text-xs font-bold text-green-400">Best</span>
                              </div>
                            )}
                            {location.id === worstLocation?.id && validLocations.length > 1 && (
                              <div className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                <span className="text-xs font-bold text-red-400">Worst</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div
                          className="w-full h-16 rounded-lg flex items-center justify-center mb-2 relative"
                          style={{
                            background: `linear-gradient(135deg, ${location.color} 0%, ${location.color}dd 100%)`,
                            boxShadow: `0 4px 12px ${location.color}40`
                          }}
                        >
                          <span className="text-3xl font-bold text-white">{location.aqi}</span>
                        </div>

                        {/* Comparison to Average */}
                        {validLocations.length >= 2 && avgAQI > 0 && (
                          <div className="mb-2 flex items-center justify-center gap-2">
                            {location.aqi! < avgAQI ? (
                              <>
                                <TrendingDown className="w-3 h-3 text-green-400" />
                                <span className="text-xs font-semibold text-green-400">
                                  {((avgAQI - location.aqi!) / avgAQI * 100).toFixed(0)}% better than avg
                                </span>
                              </>
                            ) : location.aqi! > avgAQI ? (
                              <>
                                <TrendingUp className="w-3 h-3 text-red-400" />
                                <span className="text-xs font-semibold text-red-400">
                                  {((location.aqi! - avgAQI) / avgAQI * 100).toFixed(0)}% worse than avg
                                </span>
                              </>
                            ) : (
                              <span className="text-xs font-semibold text-cyan-400">Same as average</span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">{location.category}</span>
                          {location.dominant_pollutant && (
                            <span className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                              {location.dominant_pollutant.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-white/10 bg-white/5">
            <p className="text-xs text-center text-gray-400">
              Comparing {locations.length} location{locations.length !== 1 ? 's' : ''}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
