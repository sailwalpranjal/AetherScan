'use client'

import React from 'react'

export type LegendType = 'aqi' | 'population' | 'temperature' | 'fire' | 'wind' | 'satellite' | 'industry'

interface LegendConfig {
  title: string
  items: Array<{
    color: string
    label: string
    range?: string
  }>
}

const LEGEND_CONFIGS: Record<LegendType, LegendConfig> = {
  aqi: {
    title: 'AQI Scale',
    items: [
      { color: '#00E400', label: 'Good', range: '0-50' },
      { color: '#FFFF00', label: 'Satisfactory', range: '51-100' },
      { color: '#FF7E00', label: 'Moderate', range: '101-200' },
      { color: '#FF0000', label: 'Poor', range: '201-300' },
      { color: '#8F3F97', label: 'Very Poor', range: '301-400' },
      { color: '#7E0023', label: 'Severe', range: '401-500' },
    ],
  },
  population: {
    title: 'Population Density',
    items: [
      { color: '#FEF08A', label: 'Very Low', range: '< 100/km²' },
      { color: '#FDE047', label: 'Low', range: '100-500/km²' },
      { color: '#FACC15', label: 'Medium', range: '500-1,000/km²' },
      { color: '#EAB308', label: 'High', range: '1,000-5,000/km²' },
      { color: '#CA8A04', label: 'Very High', range: '> 5,000/km²' },
    ],
  },
  temperature: {
    title: 'Land Temperature (°C)',
    items: [
      { color: '#0000FF', label: 'Very Cold', range: '< 0°C' },
      { color: '#00FFFF', label: 'Cold', range: '0-10°C' },
      { color: '#00FF00', label: 'Cool', range: '10-20°C' },
      { color: '#FFFF00', label: 'Warm', range: '20-30°C' },
      { color: '#FF7E00', label: 'Hot', range: '30-40°C' },
      { color: '#FF0000', label: 'Very Hot', range: '> 40°C' },
    ],
  },
  fire: {
    title: 'Fire Intensity',
    items: [
      { color: '#FEF08A', label: 'Low', range: '1-5 fires' },
      { color: '#FACC15', label: 'Moderate', range: '5-10 fires' },
      { color: '#F97316', label: 'High', range: '10-20 fires' },
      { color: '#EF4444', label: 'Very High', range: '20-50 fires' },
      { color: '#DC2626', label: 'Severe', range: '> 50 fires' },
    ],
  },
  wind: {
    title: 'Wind Speed (m/s)',
    items: [
      { color: '#00FFFF', label: 'Calm', range: '0-2 m/s' },
      { color: '#00FF00', label: 'Light Breeze', range: '2-5 m/s' },
      { color: '#FFFF00', label: 'Moderate', range: '5-10 m/s' },
      { color: '#FF7E00', label: 'Strong', range: '10-15 m/s' },
      { color: '#FF0000', label: 'High Wind', range: '> 15 m/s' },
    ],
  },
  satellite: {
    title: 'Concentration Level',
    items: [
      { color: '#0000FF', label: 'Very Low', range: 'Low' },
      { color: '#00FFFF', label: 'Low', range: 'Below Average' },
      { color: '#00FF00', label: 'Moderate', range: 'Average' },
      { color: '#FFFF00', label: 'Elevated', range: 'Above Average' },
      { color: '#FF7E00', label: 'High', range: 'High' },
      { color: '#FF0000', label: 'Very High', range: 'Very High' },
    ],
  },
  industry: {
    title: 'Industry Type',
    items: [
      { color: '#FF4444', label: 'Power Plants', range: 'Thermal/Coal' },
      { color: '#FF8C00', label: 'Refineries', range: 'Oil/Gas' },
      { color: '#9370DB', label: 'Cement Plants', range: 'Manufacturing' },
      { color: '#4682B4', label: 'Mining', range: 'Extraction' },
    ],
  },
}

interface Props {
  type: LegendType
  activeLayers?: string[]
}

export default function DynamicLegend({ type, activeLayers }: Props) {
  const config = LEGEND_CONFIGS[type]

  if (!config) return null

  return (
    <div className="glass rounded-xl shadow-2xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 bg-white/5 border-b border-white/10">
        <h3 className="text-sm font-bold text-white">{config.title}</h3>
      </div>
      <div className="p-3 space-y-2">
        {config.items.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div
              className="w-6 h-4 rounded-sm border border-white/20"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1">
              <div className="text-xs font-medium text-white">{item.label}</div>
              {item.range && (
                <div className="text-xs text-gray-400">{item.range}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 bg-white/5 border-t border-white/10">
        <p className="text-xs text-gray-400">Based on CPCB standards</p>
      </div>
    </div>
  )
}
