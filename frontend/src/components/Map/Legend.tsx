'use client'

import { Info } from 'lucide-react'
import type { LegendType } from '../UI/DynamicLegend'

interface LegendProps {
  activeLayers: string[]
}

const LAYER_TO_LEGEND: Record<string, { type: LegendType, title: string, items: Array<{ range: string, label: string, color: string }> }> = {
  'aqi': {
    type: 'aqi',
    title: 'AQI Scale',
    items: [
      { range: '0-50', label: 'Good', color: '#00E400' },
      { range: '51-100', label: 'Satisfactory', color: '#FFFF00' },
      { range: '101-200', label: 'Moderate', color: '#FF7E00' },
      { range: '201-300', label: 'Poor', color: '#FF0000' },
      { range: '301-400', label: 'Very Poor', color: '#8F3F97' },
      { range: '401-500', label: 'Severe', color: '#7E0023' },
    ],
  },
  'population': {
    type: 'population',
    title: 'Population Density',
    items: [
      { range: '< 100/km²', label: 'Very Low', color: '#FEF08A' },
      { range: '100-500/km²', label: 'Low', color: '#FDE047' },
      { range: '500-1,000/km²', label: 'Medium', color: '#FACC15' },
      { range: '1,000-5,000/km²', label: 'High', color: '#EAB308' },
      { range: '> 5,000/km²', label: 'Very High', color: '#CA8A04' },
    ],
  },
  'fire': {
    type: 'fire',
    title: 'Fire Intensity',
    items: [
      { range: '1-5', label: 'Low', color: '#FEF08A' },
      { range: '5-10', label: 'Moderate', color: '#FACC15' },
      { range: '10-20', label: 'High', color: '#F97316' },
      { range: '20-50', label: 'Very High', color: '#EF4444' },
      { range: '> 50', label: 'Severe', color: '#DC2626' },
    ],
  },
  'temperature': {
    type: 'temperature',
    title: 'Land Temperature',
    items: [
      { range: '< 0°C', label: 'Very Cold', color: '#0000FF' },
      { range: '0-10°C', label: 'Cold', color: '#00FFFF' },
      { range: '10-20°C', label: 'Cool', color: '#00FF00' },
      { range: '20-30°C', label: 'Warm', color: '#FFFF00' },
      { range: '30-40°C', label: 'Hot', color: '#FF7E00' },
      { range: '> 40°C', label: 'Very Hot', color: '#FF0000' },
    ],
  },
  'wind': {
    type: 'wind',
    title: 'Wind Speed',
    items: [
      { range: '0-2 m/s', label: 'Calm', color: '#00FFFF' },
      { range: '2-5 m/s', label: 'Light Breeze', color: '#00FF00' },
      { range: '5-10 m/s', label: 'Moderate', color: '#FFFF00' },
      { range: '10-15 m/s', label: 'Strong', color: '#FF7E00' },
      { range: '> 15 m/s', label: 'High Wind', color: '#FF0000' },
    ],
  },
}

export default function Legend({ activeLayers }: LegendProps) {
  // Determine which legend to show based on active layers
  let legendConfig = LAYER_TO_LEGEND['aqi'] // Default to AQI

  if (activeLayers.some(l => ['population-density', 'population-exposure', 'population-points'].includes(l))) {
    legendConfig = LAYER_TO_LEGEND['population']
  } else if (activeLayers.some(l => ['crop-burning', 'fire-density'].includes(l))) {
    legendConfig = LAYER_TO_LEGEND['fire']
  } else if (activeLayers.includes('land-temperature')) {
    legendConfig = LAYER_TO_LEGEND['temperature']
  } else if (activeLayers.includes('wind-climate')) {
    legendConfig = LAYER_TO_LEGEND['wind']
  }

  const showLegend = activeLayers.length > 0

  if (!showLegend) return null

  return (
    <div className="glass rounded-2xl p-4 max-w-xs shadow-2xl border border-white/10">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <Info className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-bold text-white">{legendConfig.title}</h3>
      </div>

      <div className="space-y-2">
        {legendConfig.items.map((item) => (
          <div key={item.range} className="flex items-center space-x-3 hover:bg-white/5 p-1.5 rounded-lg transition-all">
            <div className="w-10 h-5 rounded-lg shadow-lg" style={{ backgroundColor: item.color }} />
            <span className="text-xs font-medium text-white flex-1">{item.label}</span>
            <span className="text-xs text-gray-400 font-mono">{item.range}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-white/10">
        <p className="text-xs text-gray-400 leading-relaxed">Based on CPCB standards</p>
      </div>
    </div>
  )
}
