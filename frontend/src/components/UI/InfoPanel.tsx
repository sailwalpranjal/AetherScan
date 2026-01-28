'use client'

import { X, MapPin } from 'lucide-react'
import type { AQIResult } from '@/lib/types'
import { formatNumber } from '@/lib/utils'

interface Props {
  aqiData: AQIResult
  coordinates: { lat: number; lon: number }
  onClose: () => void
}

export default function InfoPanel({ aqiData, coordinates, onClose }: Props) {
  return (
    <div className="glass rounded-lg p-4 max-w-sm animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-white">AQI Information</h3>
          <div className="flex items-center space-x-1 text-xs text-gray-400 mt-1">
            <MapPin className="w-3 h-3" />
            <span>
              {formatNumber(coordinates.lat, 4)}, {formatNumber(coordinates.lon, 4)}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        className="rounded-lg p-4 mb-3"
        style={{ backgroundColor: aqiData.color + '20', borderLeft: `4px solid ${aqiData.color}` }}
      >
        <div className="text-3xl font-bold text-white">{aqiData.aqi}</div>
        <div className="text-sm font-semibold" style={{ color: aqiData.color }}>
          {aqiData.category}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Dominant: {aqiData.dominant_pollutant?.toUpperCase() || 'N/A'}
        </div>
      </div>

      {aqiData.breakdowns && Object.keys(aqiData.breakdowns).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400">Pollutant Breakdown</h4>
          {Object.entries(aqiData.breakdowns).map(([param, data]) => (
            <div key={param} className="bg-dark-card rounded p-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 uppercase">{param}</span>
                <span className="text-white font-semibold">
                  {formatNumber(data.concentration)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-gray-500">Sub-index:</span>
                <span className="text-gray-300">{formatNumber(data.sub_index, 0)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
