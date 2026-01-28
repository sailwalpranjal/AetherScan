// Modern Futuristic Search Bar
'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, MapPin, X, Loader2, Navigation, Factory, Zap, Flame } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SearchResult {
  name: string
  latitude: number
  longitude: number
  type: string
  city?: string
  state?: string
  country?: string
  category?: 'location' | 'power-plant' | 'industry' | 'refinery'
  capacity_mw?: number
  fuel_type?: string
}

interface ModernSearchProps {
  onLocationSelect: (lat: number, lon: number, name: string) => void
}

export default function ModernSearch({ onLocationSelect }: ModernSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [focused, setFocused] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
        setFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search with debounce - searches both locations and industries
  useEffect(() => {
    const searchAll = async () => {
      if (query.length < 2) {
        setResults([])
        return
      }

      setLoading(true)
      try {
        // Call both location and industry search endpoints in parallel
        const [locationResponse, industryResponse] = await Promise.all([
          fetch(`http://localhost:8000/search/location?query=${encodeURIComponent(query)}&limit=5`),
          fetch(`http://localhost:8000/search/industries?query=${encodeURIComponent(query)}&limit=5`)
        ])

        if (!locationResponse.ok && !industryResponse.ok) {
          throw new Error('Search failed')
        }

        const locationData = locationResponse.ok ? await locationResponse.json() : { results: [] }
        const industryData = industryResponse.ok ? await industryResponse.json() : { results: [] }

        // Combine results with category markers
        const combined = [
          ...locationData.results.map((r: any) => ({ ...r, category: 'location' })),
          ...industryData.results
        ]

        // Limit total results to 8
        setResults(combined.slice(0, 8))
        setShowResults(true)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    const debounceTimeout = setTimeout(searchAll, 300)
    return () => clearTimeout(debounceTimeout)
  }, [query])

  const handleSelect = (result: SearchResult) => {
    onLocationSelect(result.latitude, result.longitude, result.name)
    setQuery(result.city || result.state || result.name.split(',')[0])
    setShowResults(false)
    setFocused(false)
    setResults([])
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
  }

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div
          className={`
            relative glass rounded-2xl transition-all duration-300
            ${focused ? 'ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/20' : 'ring-1 ring-white/10'}
          `}
        >
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            <motion.div
              animate={loading ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: 'linear' }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 text-cyan-400" />
              ) : (
                <Search className="w-5 h-5 text-cyan-400" />
              )}
            </motion.div>
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Search cities, landmarks, coordinates..."
            className="w-full pl-12 pr-12 py-3.5 bg-transparent text-white text-sm placeholder-gray-400 focus:outline-none font-medium"
          />

          {query && !loading && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={clearSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors group"
            >
              <X className="w-4 h-4 text-gray-400 group-hover:text-white" />
            </motion.button>
          )}
        </div>

        {/* Focus indicator */}
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 -z-10"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: focused ? 1 : 0,
            scale: focused ? 1 : 0.95
          }}
          transition={{ duration: 0.2 }}
        />
      </motion.div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {showResults && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 w-full glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-50 max-h-80 overflow-y-auto custom-scrollbar"
          >
            {results.map((result, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSelect(result)}
                className="w-full px-4 py-3 text-left hover:bg-white/10 transition-all border-b border-white/5 last:border-b-0 group"
              >
                <div className="flex items-start gap-3">
                  {/* Different icons based on category */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    result.category === 'power-plant'
                      ? 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20 group-hover:from-yellow-500/30 group-hover:to-amber-500/30'
                      : result.category === 'industry'
                      ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 group-hover:from-orange-500/30 group-hover:to-red-500/30'
                      : result.category === 'refinery'
                      ? 'bg-gradient-to-br from-red-500/20 to-pink-500/20 group-hover:from-red-500/30 group-hover:to-pink-500/30'
                      : 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 group-hover:from-cyan-500/30 group-hover:to-blue-500/30'
                  }`}>
                    {result.category === 'power-plant' && <Zap className="w-5 h-5 text-yellow-400" />}
                    {result.category === 'industry' && <Factory className="w-5 h-5 text-orange-400" />}
                    {result.category === 'refinery' && <Flame className="w-5 h-5 text-red-400" />}
                    {result.category === 'location' && <MapPin className="w-5 h-5 text-cyan-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <div className="text-sm font-semibold text-white truncate mb-0.5">
                      {result.city || result.name.split(',')[0]}
                    </div>

                    {/* Category badge for industrial facilities */}
                    {result.category && result.category !== 'location' && (
                      <div className="text-xs text-gray-300 mb-1">
                        <span className="px-1.5 py-0.5 rounded bg-white/10">
                          {result.type || result.category}
                        </span>
                      </div>
                    )}

                    {/* Location for regular places */}
                    {result.category === 'location' && (
                      <div className="text-xs text-gray-400 truncate">
                        {result.state && `${result.state}, `}{result.country}
                      </div>
                    )}

                    {/* Capacity and fuel type for industrial facilities */}
                    {result.capacity_mw && (
                      <div className="text-xs text-gray-400">
                        Capacity: {result.capacity_mw.toFixed(1)} MW
                        {result.fuel_type && ` • ${result.fuel_type}`}
                      </div>
                    )}

                    {/* Coordinates */}
                    <div className="text-xs text-gray-500 font-mono mt-1 flex items-center gap-1.5">
                      <Navigation className="w-3 h-3" />
                      {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Results */}
      <AnimatePresence>
        {showResults && query.length >= 2 && !loading && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full glass rounded-2xl border border-white/10 p-6 shadow-2xl z-50 text-center"
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
              <Search className="w-6 h-6 text-orange-400" />
            </div>
            <p className="text-sm text-gray-400 mb-1">
              No locations found for "<span className="text-white font-medium">{query}</span>"
            </p>
            <p className="text-xs text-gray-500">
              Try: Delhi, Mumbai, Taj Mahal, or coordinates (lat, lon)
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
