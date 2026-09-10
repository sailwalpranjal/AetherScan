// Unified Data Panel - Futuristic Design
'use client'

import { X, MapPin, Wind, Droplets, Factory, Flame, AlertTriangle, TrendingUp, TrendingDown, Activity, Download, Cloud, Thermometer, Radio, Bookmark, BarChart3, FileText, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { aqiAPI } from '@/lib/api'
import { Button } from '@/components/UI/button'
import { Badge } from '@/components/UI/badge'
import { Separator } from '@/components/UI/separator'
import { generateExecutivePDF } from '@/utils/professionalPDFGenerator'

interface PollutantData {
  pm25?: number
  pm10?: number
  no2?: number
  so2?: number
  co?: number
  o3?: number
}

interface ForecastDay {
  date: string
  pm25?: { avg: number; min: number; max: number }
  pm10?: { avg: number; min: number; max: number }
  o3?: { avg: number; min: number; max: number }
  uvi?: { avg: number; min: number; max: number }
}

interface WeatherData {
  temp?: number
  temperature?: number
  humidity?: number
  pressure?: number
  wind_speed?: number
}

interface StationInfo {
  station_name?: string
  station_id?: number | string
  distance?: number
}

interface DataPanelProps {
  data: {
    aqi: number
    category: string
    color: string
    dominant_pollutant?: string
    location?: string
    city?: string
    state?: string
    latitude?: number
    longitude?: number
    pollutants?: PollutantData
    weather?: WeatherData
    station?: StationInfo
  } | null
  onClose: () => void
}

const pollutantConfig = [
  { key: 'pm25', name: 'PM2.5', icon: Factory, unit: 'µg/m³', limit: 60, color: '#EF4444' },
  { key: 'pm10', name: 'PM10', icon: Droplets, unit: 'µg/m³', limit: 100, color: '#F97316' },
  { key: 'no2', name: 'NO₂', icon: Factory, unit: 'µg/m³', limit: 80, color: '#8B5CF6' },
  { key: 'so2', name: 'SO₂', icon: Flame, unit: 'µg/m³', limit: 80, color: '#EC4899' },
  { key: 'co', name: 'CO', icon: Wind, unit: 'mg/m³', limit: 2, color: '#06B6D4' },
  { key: 'o3', name: 'O₃', icon: Wind, unit: 'µg/m³', limit: 100, color: '#10B981' },
]

// Dynamic health advice based on actual AQI value - EPA Standard
const getHealthAdvice = (aqi: number): { icon: typeof AlertTriangle; text: string; recommendation: string } => {
  if (aqi <= 50) {
    return {
      icon: Activity,
      text: `Air quality is good (AQI: ${aqi})`,
      recommendation: 'Perfect conditions for outdoor activities. Air pollution poses little or no risk.'
    }
  }
  if (aqi <= 100) {
    return {
      icon: Activity,
      text: `Air quality is moderate (AQI: ${aqi})`,
      recommendation: 'Acceptable for most people. Unusually sensitive individuals should limit prolonged outdoor exertion.'
    }
  }
  if (aqi <= 150) {
    return {
      icon: AlertTriangle,
      text: `Unhealthy for sensitive groups (AQI: ${aqi})`,
      recommendation: 'Children, elderly, and people with heart/lung disease should reduce prolonged outdoor exertion.'
    }
  }
  if (aqi <= 200) {
    return {
      icon: AlertTriangle,
      text: `Unhealthy air quality (AQI: ${aqi})`,
      recommendation: 'Everyone should reduce prolonged outdoor exertion. Sensitive groups should avoid outdoor activities entirely.'
    }
  }
  if (aqi <= 300) {
    return {
      icon: AlertTriangle,
      text: `Very unhealthy air quality (AQI: ${aqi})`,
      recommendation: 'Health alert: Everyone should avoid all outdoor exertion. Stay indoors with windows closed and air purifiers on.'
    }
  }
  // AQI > 300
  return {
    icon: AlertTriangle,
    text: `Hazardous air quality (AQI: ${aqi})`,
    recommendation: 'Emergency conditions. Everyone must remain indoors. Seal windows and use air purifiers. Evacuate if possible.'
  }
}

function normalizeForecast(forecastData: any): ForecastDay[] {
  if (Array.isArray(forecastData)) {
    return forecastData
  }

  if (!forecastData || typeof forecastData !== 'object') {
    return []
  }

  const byDate = new Map<string, ForecastDay>()
  const pollutantKeys: Array<keyof Pick<ForecastDay, 'pm25' | 'pm10' | 'o3' | 'uvi'>> = ['pm25', 'pm10', 'o3', 'uvi']

  for (const pollutant of pollutantKeys) {
    const entries = Array.isArray(forecastData[pollutant]) ? forecastData[pollutant] : []
    for (const entry of entries) {
      const date = entry?.day || entry?.date
      if (!date) continue

      const existing: ForecastDay = byDate.get(date) ?? { date }
      const avg = Number(entry?.avg ?? entry?.value ?? 0)
      existing[pollutant] = {
        avg,
        min: Number(entry?.min ?? avg),
        max: Number(entry?.max ?? avg),
      }
      byDate.set(date, existing)
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export default function UnifiedDataPanel({ data, onClose }: DataPanelProps) {
  const [forecast, setForecast] = useState<ForecastDay[]>([])
  const [loadingForecast, setLoadingForecast] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  // Check if current location is bookmarked
  useEffect(() => {
    if (!data?.latitude || !data?.longitude) return

    const saved = localStorage.getItem('aqi-bookmarks')
    if (saved) {
      try {
        const bookmarks = JSON.parse(saved)
        const exists = bookmarks.some((b: any) =>
          Math.abs(b.latitude - data.latitude!) < 0.0001 &&
          Math.abs(b.longitude - data.longitude!) < 0.0001
        )
        setIsBookmarked(exists)
      } catch (e) {
        console.error('Failed to check bookmarks:', e)
      }
    }
  }, [data?.latitude, data?.longitude])

  useEffect(() => {
    const fetchForecast = async () => {
      if (!data?.latitude || !data?.longitude) return

      setLoadingForecast(true)
      try {
        const result = await aqiAPI.getForecast(data.latitude, data.longitude)
        setForecast(normalizeForecast(result?.forecast))
      } catch (error) {
        console.error('Failed to fetch forecast:', error)
        setForecast([])
      } finally {
        setLoadingForecast(false)
      }
    }

    fetchForecast()
  }, [data?.latitude, data?.longitude])

  const handleBookmark = () => {
    if (!data?.latitude || !data?.longitude) return

    const saved = localStorage.getItem('aqi-bookmarks')
    let bookmarks = saved ? JSON.parse(saved) : []

    if (isBookmarked) {
      // Remove bookmark
      bookmarks = bookmarks.filter((b: any) =>
        !(Math.abs(b.latitude - data.latitude!) < 0.0001 &&
          Math.abs(b.longitude - data.longitude!) < 0.0001)
      )
      setIsBookmarked(false)
    } else {
      // Add bookmark
      const bookmark = {
        id: `${data.latitude}-${data.longitude}-${Date.now()}`,
        name: data.location || data.city || `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`,
        latitude: data.latitude,
        longitude: data.longitude,
        savedAt: new Date().toISOString()
      }
      bookmarks.push(bookmark)
      setIsBookmarked(true)
    }

    localStorage.setItem('aqi-bookmarks', JSON.stringify(bookmarks))
  }

  const handleAddToCompare = () => {
    if (!data?.latitude || !data?.longitude) return

    // Trigger comparison panel with this location
    const event = new CustomEvent('openComparison', {
      detail: {
        lat: data.latitude,
        lon: data.longitude,
        name: data.location || data.city || `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`
      }
    })
    window.dispatchEvent(event)
  }

  const handleDownloadPDF = async () => {
    if (!data || generatingPDF) return
    setGeneratingPDF(true)
    try {
      const industryInfo = {
        name: data.location || data.city || 'Regional Environmental Station',
        type: 'Ambient Air Quality Monitoring Node',
        latitude: data.latitude || 28.6139,
        longitude: data.longitude || 77.2090,
        state: data.state || 'N/A',
        district: data.city || 'N/A',
        capacity: 'Continuous Baseline Telemetry',
      }
      const cleanAQIData = {
        aqi: data.aqi,
        category: data.category,
        color: data.color,
        dominant_pollutant: data.dominant_pollutant || 'pm25',
        breakdowns: {
          pm25: { concentration: data.pollutants?.pm25 ?? 0, sub_index: data.aqi, category: data.category },
          pm10: { concentration: data.pollutants?.pm10 ?? 0, sub_index: data.aqi, category: data.category },
          no2: { concentration: data.pollutants?.no2 ?? 0, sub_index: data.aqi, category: data.category },
          so2: { concentration: data.pollutants?.so2 ?? 0, sub_index: data.aqi, category: data.category },
          co: { concentration: data.pollutants?.co ?? 0, sub_index: data.aqi, category: data.category },
          o3: { concentration: data.pollutants?.o3 ?? 0, sub_index: data.aqi, category: data.category },
        },
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date().toISOString(),
      }
      await generateExecutivePDF(industryInfo, cleanAQIData as any, null)
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      alert('Failed to generate PDF report. Please try again.')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const exportData = (format: 'csv' | 'json') => {
    if (!data) return

    const exportObj = {
      timestamp: new Date().toISOString(),
      location: {
        name: data.location || 'Unknown',
        city: data.city,
        state: data.state,
        latitude: data.latitude,
        longitude: data.longitude
      },
      aqi: {
        value: data.aqi,
        category: data.category,
        dominant_pollutant: data.dominant_pollutant
      },
      pollutants: data.pollutants,
      weather: data.weather,
      station: data.station,
      forecast: forecast
    }

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aqi-data-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const csvRows = [
        ['Metric', 'Value'],
        ['Timestamp', exportObj.timestamp],
        ['Location', exportObj.location.name],
        ['Latitude', exportObj.location.latitude?.toString() || ''],
        ['Longitude', exportObj.location.longitude?.toString() || ''],
        ['AQI', exportObj.aqi.value.toString()],
        ['Category', exportObj.aqi.category],
        ['Dominant Pollutant', exportObj.aqi.dominant_pollutant || ''],
        ...(data.pollutants ? Object.entries(data.pollutants).map(([key, val]) => [key.toUpperCase(), val?.toString() || '']) : []),
        ...(hasWeather ? [
          ['Temperature (°C)', weatherTemp?.toString() || ''],
          ['Humidity (%)', data.weather?.humidity?.toString() || ''],
          ['Pressure (hPa)', data.weather?.pressure?.toString() || ''],
          ['Wind Speed (m/s)', data.weather?.wind_speed?.toString() || '']
        ] : [])
      ]
      const csv = csvRows.map(row => row.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aqi-data-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (!data) return null

  // Get dynamic health advice based on actual AQI value
  const advice = getHealthAdvice(data.aqi)
  const AdviceIcon = advice.icon
  const weatherTemp = data.weather?.temp ?? data.weather?.temperature
  const hasWeather =
    weatherTemp !== undefined ||
    data.weather?.humidity !== undefined ||
    data.weather?.pressure !== undefined ||
    data.weather?.wind_speed !== undefined

  const pollutantData = pollutantConfig
    .filter(p => data.pollutants && data.pollutants[p.key as keyof PollutantData] !== undefined)
    .map(p => ({
      ...p,
      value: data.pollutants![p.key as keyof PollutantData] || 0,
      percentage: ((data.pollutants![p.key as keyof PollutantData] || 0) / p.limit) * 100,
      isExceeded: (data.pollutants![p.key as keyof PollutantData] || 0) > p.limit
    }))

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25,
        }}
        className="w-full max-w-md"
      >
        {/* Main Panel - Made Scrollable with Enhanced Effects */}
        <motion.div
          className="glass rounded-2xl overflow-hidden shadow-2xl border max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30"
          animate={{
            borderColor: [
              'rgba(255, 255, 255, 0.1)',
              'rgba(6, 182, 212, 0.3)',
              'rgba(255, 255, 255, 0.1)',
            ],
            boxShadow: [
              '0 0 20px rgba(0, 0, 0, 0.5)',
              '0 0 40px rgba(6, 182, 212, 0.3)',
              '0 0 20px rgba(0, 0, 0, 0.5)',
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Header with AQI */}
          <div className="relative p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8"
            >
              <X className="w-4 h-4" />
            </Button>

            {/* AQI Score */}
            <div className="flex items-start gap-4 mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="relative w-20 h-20 flex-shrink-0"
              >
                <div
                  className="w-full h-full rounded-xl flex items-center justify-center shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${data.color} 0%, ${data.color}dd 100%)`,
                    boxShadow: `0 8px 24px ${data.color}40`
                  }}
                >
                  <span className="text-3xl font-bold text-white">{data.aqi}</span>
                </div>
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${data.color}40 0%, transparent 100%)`
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>

              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-white mb-1">{data.category}</h3>
                {data.location && (
                  <p className="text-sm text-gray-300 truncate mb-1">{data.location}</p>
                )}
                {(data.city || data.state) && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {[data.city, data.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Coordinates & Dominant Pollutant */}
            <div className="flex items-center gap-4 text-xs flex-wrap">
              {data.latitude && data.longitude && (
                <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-gray-400">
                  {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}
                </div>
              )}
              {data.dominant_pollutant && (
                <div className="px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="font-medium">{data.dominant_pollutant.toUpperCase()}</span>
                </div>
              )}
              {data.station?.station_name && (
                <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center gap-1.5">
                  <Radio className="w-3 h-3" />
                  <span className="font-medium">{data.station.station_name}</span>
                  {data.station.distance && (
                    <span className="text-blue-300">({data.station.distance.toFixed(1)} km)</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Weather Section */}
          {data.weather && hasWeather && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="px-6 py-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-y border-white/5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Cloud className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-semibold text-white">Weather Conditions</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {weatherTemp !== undefined && (
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-orange-400" />
                    <div>
                      <div className="text-xs text-gray-400">Temperature</div>
                      <div className="text-sm font-semibold text-white">{Number(weatherTemp).toFixed(1)}°C</div>
                    </div>
                  </div>
                )}
                {data.weather.humidity !== undefined && (
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-xs text-gray-400">Humidity</div>
                      <div className="text-sm font-semibold text-white">{Math.min(100, Math.max(0, Number(data.weather.humidity))).toFixed(1)}%</div>
                    </div>
                  </div>
                )}
                {data.weather.pressure !== undefined && (
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-xs text-gray-400">Pressure</div>
                      <div className="text-sm font-semibold text-white">{Number(data.weather.pressure).toFixed(1)} hPa</div>
                    </div>
                  </div>
                )}
                {data.weather.wind_speed !== undefined && (
                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="text-xs text-gray-400">Wind</div>
                      <div className="text-sm font-semibold text-white">{Math.min(50, Math.max(0, Number(data.weather.wind_speed))).toFixed(1)} m/s</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Health Advisory */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="px-6 py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-y border-white/5"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <AdviceIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white mb-0.5">{advice.text}</p>
                <p className="text-xs text-gray-400">{advice.recommendation}</p>
              </div>
            </div>
          </motion.div>

          {/* 7-Day Forecast */}
          {(loadingForecast || forecast.length > 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="px-6 py-4 border-b border-white/5"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <h4 className="text-sm font-semibold text-white">7-Day Forecast</h4>
              </div>
              <div className="space-y-3">
                {forecast.slice(0, 7).map((day, index) => {
                  const date = new Date(day.date)
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
                  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  const pm25Avg = day.pm25?.avg || 0
                  const aqiColor = pm25Avg > 100 ? '#EF4444' : pm25Avg > 60 ? '#F97316' : pm25Avg > 35 ? '#FACC15' : '#10B981'

                  return (
                    <motion.div
                      key={day.date}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-xs w-12">
                          <div className="font-semibold text-white">{dayName}</div>
                          <div className="text-gray-400">{dateStr}</div>
                        </div>
                        {day.pm25 && (
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-400">PM2.5</span>
                              <span className="text-xs font-semibold text-white">{day.pm25.avg.toFixed(0)} µg/m³</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min((day.pm25.avg / 100) * 100, 100)}%`,
                                  background: aqiColor
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      {day.uvi && (
                        <div className="text-xs text-gray-400 ml-2">
                          UV: {day.uvi.avg.toFixed(0)}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
              {loadingForecast && (
                <div className="text-center text-xs text-gray-400 mt-2">Loading forecast...</div>
              )}
              {!loadingForecast && forecast.length === 0 && (
                <div className="text-center text-xs text-gray-400 mt-2">Forecast unavailable for this location.</div>
              )}
            </motion.div>
          )}

          {/* Pollutants Breakdown */}
          {pollutantData.length > 0 && (
            <div className="p-6">
              <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Pollutant Levels
              </h4>

              <div className="space-y-4">
                {pollutantData.map((pollutant, index) => {
                  const Icon = pollutant.icon
                  return (
                    <motion.div
                      key={pollutant.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="space-y-2"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: `${pollutant.color}20` }}
                          >
                            <Icon className="w-4 h-4" style={{ color: pollutant.color }} />
                          </div>
                          <span className="text-sm font-medium text-white">{pollutant.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white">
                            {pollutant.value.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-400">{pollutant.unit}</span>
                          {pollutant.isExceeded && (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(pollutant.percentage, 100)}%` }}
                          transition={{ delay: 0.2 + 0.1 * index, duration: 0.6 }}
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${pollutant.color} 0%, ${pollutant.color}dd 100%)`,
                            boxShadow: `0 0 10px ${pollutant.color}40`
                          }}
                        />
                      </div>

                      {/* Limit Info */}
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>0</span>
                        <span>Safe limit: {pollutant.limit} {pollutant.unit}</span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions - Bookmark & Compare */}
          <div className="px-6 py-3 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border-t border-white/5">
            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBookmark}
                className={`px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium text-sm transition-all ${
                  isBookmarked
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/30'
                    : 'glass border border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-white' : ''}`} />
                <span>{isBookmarked ? 'Saved' : 'Bookmark'}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddToCompare}
                className="px-4 py-2.5 rounded-lg glass border border-white/10 hover:bg-white/10 flex items-center justify-center gap-2 text-white font-medium text-sm transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Compare</span>
              </motion.button>
            </div>

            {/* Primary PDF Report CTA */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleDownloadPDF}
              disabled={generatingPDF}
              className="w-full mt-2.5 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {generatingPDF ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Compiling Forensic PDF Dossier...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-cyan-200" />
                  <span>Download Environmental Dossier (PDF)</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Footer with Export */}
          <div className="px-6 py-3 bg-white/5 border-t border-white/10">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Based on AQICN & CPCB · Real-time data
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={generatingPDF}
                  className="p-1.5 rounded-lg glass hover:bg-white/10 transition-all group flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 px-2"
                  title="Export 4-Page PDF Dossier"
                >
                  {generatingPDF ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-[11px] font-medium">PDF</span>
                </button>
                <button
                  onClick={() => exportData('json')}
                  className="p-1.5 rounded-lg glass hover:bg-white/10 transition-all group"
                  title="Export as JSON"
                >
                  <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                </button>
                <button
                  onClick={() => exportData('csv')}
                  className="p-1.5 rounded-lg glass hover:bg-white/10 transition-all group"
                  title="Export as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-green-400 transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
