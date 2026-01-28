// Bookmark Locations Component
'use client'

import { useState, useEffect } from 'react'
import { Bookmark, Star, Trash2, MapPin, Navigation } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface BookmarkedLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  savedAt: string
}

interface BookmarkLocationsProps {
  onSelectLocation: (lat: number, lon: number, name: string) => void
}

export default function BookmarkLocations({ onSelectLocation }: BookmarkLocationsProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkedLocation[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [newBookmark, setNewBookmark] = useState({ name: '', lat: '', lon: '' })

  useEffect(() => {
    const saved = localStorage.getItem('aqi-bookmarks')
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load bookmarks:', e)
      }
    }
  }, [])

  const saveBookmarks = (updated: BookmarkedLocation[]) => {
    setBookmarks(updated)
    localStorage.setItem('aqi-bookmarks', JSON.stringify(updated))
  }

  const addBookmark = (name: string, lat: number, lon: number) => {
    const id = `${lat}-${lon}-${Date.now()}`
    const bookmark: BookmarkedLocation = {
      id,
      name,
      latitude: lat,
      longitude: lon,
      savedAt: new Date().toISOString()
    }
    saveBookmarks([...bookmarks, bookmark])
  }

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault()
    const lat = parseFloat(newBookmark.lat)
    const lon = parseFloat(newBookmark.lon)

    if (!newBookmark.name || isNaN(lat) || isNaN(lon)) {
      alert('Please provide valid location name and coordinates')
      return
    }

    addBookmark(newBookmark.name, lat, lon)
    setNewBookmark({ name: '', lat: '', lon: '' })
  }

  const removeBookmark = (id: string) => {
    saveBookmarks(bookmarks.filter(b => b.id !== id))
  }

  const handleSelectBookmark = (bookmark: BookmarkedLocation) => {
    onSelectLocation(bookmark.latitude, bookmark.longitude, bookmark.name)
    setIsOpen(false)
  }

  return (
    <div className="relative w-full sm:w-auto">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full sm:w-auto px-4 py-2 rounded-lg glass hover:bg-white/10 transition-all flex items-center gap-2 group border border-white/10"
      >
        <Bookmark className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
        <span className="text-sm font-medium text-white">Bookmarks</span>
        {bookmarks.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs flex items-center justify-center font-bold">
            {bookmarks.length}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 sm:left-auto sm:right-[-320px] mt-2 w-[calc(100vw-2rem)] sm:w-[30rem] max-h-[70vh] flex flex-col glass rounded-xl border border-white/10 shadow-2xl z-50"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10 bg-gradient-to-r from-slate-900/90 to-slate-800/90 flex-shrink-0">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  Saved Locations
                </h3>
              </div>

              {/* Add Bookmark Form */}
              <form onSubmit={handleAddBookmark} className="p-3 border-b border-white/10 bg-white/5 flex-shrink-0">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Location name"
                    value={newBookmark.name}
                    onChange={e => setNewBookmark({ ...newBookmark, name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={newBookmark.lat}
                      onChange={e => setNewBookmark({ ...newBookmark, lat: e.target.value })}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={newBookmark.lon}
                      onChange={e => setNewBookmark({ ...newBookmark, lon: e.target.value })}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm font-medium transition-all"
                  >
                    Save Bookmark
                  </button>
                </div>
              </form>

              {/* Bookmarks List */}
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent min-h-0">
                {bookmarks.length === 0 ? (
                  <div className="p-8 text-center">
                    <MapPin className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No bookmarks yet</p>
                    <p className="text-xs text-gray-500 mt-1">Save locations for quick access</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {bookmarks.map((bookmark, index) => (
                      <motion.div
                        key={bookmark.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group mb-2 last:mb-0"
                      >
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all">
                          <button
                            onClick={() => handleSelectBookmark(bookmark)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Navigation className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                              <h4 className="text-sm font-semibold text-white truncate">
                                {bookmark.name}
                              </h4>
                            </div>
                            <p className="text-xs text-gray-400 font-mono truncate">
                              {bookmark.latitude.toFixed(4)}, {bookmark.longitude.toFixed(4)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Saved {new Date(bookmark.savedAt).toLocaleDateString()}
                            </p>
                          </button>
                          <button
                            onClick={() => removeBookmark(bookmark.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {bookmarks.length > 0 && (
                <div className="p-3 border-t border-white/10 bg-white/5 flex-shrink-0">
                  <button
                    onClick={() => {
                      if (confirm('Clear all bookmarks?')) {
                        saveBookmarks([])
                      }
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition-all"
                  >
                    Clear All Bookmarks
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
