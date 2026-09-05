'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, MapPin, X, Loader2 } from 'lucide-react'
import { buildApiUrl } from '@/lib/api'

interface SearchResult {
  name: string
  latitude: number
  longitude: number
  type: string
  city: string
  state: string
  country: string
}

interface Props {
  onLocationSelect: (lat: number, lon: number, name: string) => void
}

export default function SearchBar({ onLocationSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search with debounce
  useEffect(() => {
    const searchLocation = async () => {
      if (query.length < 2) {
        setResults([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch(
          buildApiUrl(`/search/location?query=${encodeURIComponent(query)}&limit=5`)
        )

        if (!response.ok) throw new Error('Search failed')

        const data = await response.json()
        setResults(data.results || [])
        setShowResults(true)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    const debounceTimeout = setTimeout(searchLocation, 300)
    return () => clearTimeout(debounceTimeout)
  }, [query])

  const handleSelect = (result: SearchResult) => {
    onLocationSelect(result.latitude, result.longitude, result.name)
    setQuery(result.city || result.state || result.name.split(',')[0])
    setShowResults(false)
    setResults([])
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
  }

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input - Enhanced */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
          <Search className="w-4 h-4 text-blue-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cities, landmarks, or coordinates..."
          className="w-full pl-11 pr-10 py-2.5 glass rounded-lg border border-white/20 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:border-white/30"
        />
        {query && !loading && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
        )}
      </div>

      {/* Search Results Dropdown - Enhanced */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full glass rounded-lg border border-white/20 overflow-hidden shadow-2xl z-50 max-h-72 overflow-y-auto custom-scrollbar">
          {results.map((result, index) => (
            <button
              key={index}
              onClick={() => handleSelect(result)}
              className="w-full px-3 py-2.5 text-left hover:bg-white/10 transition-all border-b border-white/5 last:border-b-0 group"
            >
              <div className="flex items-start space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                  <MapPin className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {result.city || result.name.split(',')[0]}
                  </div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">
                    {result.state && `${result.state}, `}{result.country}
                  </div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">
                    {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {showResults && query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute top-full mt-1 w-full glass rounded-lg border border-white/20 p-3 shadow-2xl z-50">
          <div className="text-xs text-gray-400 text-center">
            No locations found for "<span className="text-white">{query}</span>"
          </div>
          <div className="text-xs text-gray-500 text-center mt-1">
            Try: Delhi, Mumbai, Taj Mahal, or coordinates
          </div>
        </div>
      )}
    </div>
  )
}
