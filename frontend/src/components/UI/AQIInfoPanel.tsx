'use client'

import { Wind, Droplets, Factory, Flame, AlertTriangle, X } from 'lucide-react'
import { useMemo } from 'react'

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

interface Props {
  data: AQIData | null
  onClose: () => void
}

export default function AQIInfoPanel({ data, onClose }: Props) {
  const pollutantInfo = useMemo(() => {
    if (!data?.pollutants) return []

    const pollutants = [
      { key: 'pm25', name: 'PM2.5', icon: Factory, unit: 'µg/m³', color: '#EF4444', limit: 60 },
      { key: 'pm10', name: 'PM10', icon: Droplets, unit: 'µg/m³', color: '#F97316', limit: 100 },
      { key: 'no2', name: 'NO₂', icon: Factory, unit: 'µg/m³', color: '#8B5CF6', limit: 80 },
      { key: 'so2', name: 'SO₂', icon: Flame, unit: 'µg/m³', color: '#EC4899', limit: 80 },
      { key: 'co', name: 'CO', icon: Wind, unit: 'mg/m³', color: '#06B6D4', limit: 2 },
      { key: 'o3', name: 'O₃', icon: Wind, unit: 'µg/m³', color: '#10B981', limit: 100 },
    ]

    return pollutants
      .filter(p => data.pollutants && data.pollutants[p.key as keyof typeof data.pollutants] !== undefined)
      .map(p => ({
        ...p,
        value: data.pollutants![p.key as keyof typeof data.pollutants] || 0,
        percentage: ((data.pollutants![p.key as keyof typeof data.pollutants] || 0) / p.limit) * 100
      }))
  }, [data])

  if (!data) return null

  return (
    <div className="glass rounded-2xl shadow-2xl border border-white/10 overflow-hidden w-full max-w-md">
      {/* Header */}
      <div className="relative p-4 border-b border-white/10" style={{ backgroundColor: data.color + '20' }}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start space-x-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl text-white shadow-lg"
            style={{ backgroundColor: data.color }}
          >
            {data.aqi}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">{data.category}</h3>
            {data.location && (
              <p className="text-sm text-gray-300 mt-0.5">{data.location}</p>
            )}
            {(data.city || data.state) && (
              <p className="text-xs text-gray-400 mt-1">
                {[data.city, data.state].filter(Boolean).join(', ')}
              </p>
            )}
            {data.latitude && data.longitude && (
              <p className="text-xs text-gray-500 mt-1 font-mono">
                {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}
              </p>
            )}
          </div>
        </div>

        {data.dominant_pollutant && (
          <div className="mt-3 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-300">
              Dominant: {data.dominant_pollutant.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Pollutants Breakdown */}
      {pollutantInfo.length > 0 && (
        <div className="p-4 space-y-3">
          <h4 className="text-sm font-semibold text-white mb-3">Pollutant Levels</h4>
          {pollutantInfo.map((pollutant) => {
            const Icon = pollutant.icon
            const isExceeded = pollutant.value > pollutant.limit

            return (
              <div key={pollutant.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" style={{ color: pollutant.color }} />
                    <span className="text-sm font-medium text-white">{pollutant.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white">
                      {pollutant.value.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400">{pollutant.unit}</span>
                    {isExceeded && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(pollutant.percentage, 100)}%`,
                      backgroundColor: pollutant.color
                    }}
                  />
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span>0</span>
                  <span>Safe limit: {pollutant.limit} {pollutant.unit}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Health Advice */}
      <div className="px-4 pb-4 pt-2 border-t border-white/10">
        <h4 className="text-sm font-semibold text-white mb-2">Health Advice</h4>
        <p className="text-xs text-gray-400 leading-relaxed">
          {data.category === 'Good' && 'Air quality is good. Ideal for outdoor activities.'}
          {data.category === 'Satisfactory' && 'Air quality is acceptable. Sensitive individuals should limit prolonged outdoor exposure.'}
          {data.category === 'Moderate' && 'Sensitive individuals may experience respiratory discomfort. Reduce outdoor activities.'}
          {data.category === 'Poor' && 'Everyone may begin to experience health effects. Avoid outdoor activities.'}
          {data.category === 'Very Poor' && 'Health alert: everyone may experience serious health effects. Stay indoors.'}
          {data.category === 'Severe' && 'Health warning: serious health effects for everyone. Avoid all outdoor activities.'}
        </p>
      </div>

      {/* CPCB Standard Footer */}
      <div className="px-4 py-2 bg-white/5 border-t border-white/10">
        <p className="text-xs text-gray-400 text-center">Based on CPCB standards</p>
      </div>
    </div>
  )
}
