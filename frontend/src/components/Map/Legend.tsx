'use client'

import { Info, Activity } from 'lucide-react'

interface LegendProps {
  activeLayers: string[]
}

type LegendType = 'aqi' | 'population' | 'fire' | 'temperature' | 'wind'

const LAYER_TO_LEGEND: Record<string, { type: LegendType, title: string, subtitle: string, items: Array<{ range: string, label: string, color: string }> }> = {
  'aqi': {
    type: 'aqi',
    title: 'NAAQS AQI Scale',
    subtitle: 'Standard Pollutant Metrics',
    items: [
      { range: '0 - 50', label: 'Good', color: '#10b981' },
      { range: '51 - 100', label: 'Satisfactory', color: '#fbbf24' },
      { range: '101 - 200', label: 'Moderate', color: '#f59e0b' },
      { range: '201 - 300', label: 'Poor', color: '#ef4444' },
      { range: '301 - 400', label: 'Very Poor', color: '#d946ef' },
      { range: '401 - 500+', label: 'Severe', color: '#9f1239' },
    ],
  },
  'population': {
    type: 'population',
    title: 'Population Vulnerability',
    subtitle: 'Density /km²',
    items: [
      { range: '< 100', label: 'Very Low', color: '#fef08a' },
      { range: '100 - 500', label: 'Low', color: '#fde047' },
      { range: '500 - 1,000', label: 'Medium', color: '#facc15' },
      { range: '1,000 - 5k', label: 'High', color: '#eab308' },
      { range: '> 5k', label: 'Critical', color: '#ca8a04' },
    ],
  },
  'fire': {
    type: 'fire',
    title: 'Thermal Anomalies',
    subtitle: 'Radiative Power (MW)',
    items: [
      { range: '1 - 10', label: 'Low Intensity', color: '#fef08a' },
      { range: '10 - 50', label: 'Moderate', color: '#facc15' },
      { range: '50 - 100', label: 'High', color: '#f97316' },
      { range: '100 - 500', label: 'Extreme', color: '#ef4444' },
      { range: '> 500', label: 'Catastrophic', color: '#b91c1c' },
    ],
  },
  'temperature': {
    type: 'temperature',
    title: 'Land Surface Temp',
    subtitle: 'Celsius (°C)',
    items: [
      { range: '< 0°C', label: 'Freezing', color: '#3b82f6' },
      { range: '0 - 15°C', label: 'Cool', color: '#2dd4bf' },
      { range: '15 - 25°C', label: 'Optimal', color: '#4ade80' },
      { range: '25 - 35°C', label: 'Warm', color: '#fbbf24' },
      { range: '35 - 45°C', label: 'Hot', color: '#ea580c' },
      { range: '> 45°C', label: 'Extreme', color: '#be123c' },
    ],
  },
}

export default function Legend({ activeLayers }: LegendProps) {
  let legendConfig = LAYER_TO_LEGEND['aqi']

  if (activeLayers.some(l => ['population-density', 'population-exposure', 'population-points'].includes(l))) {
    legendConfig = LAYER_TO_LEGEND['population']
  } else if (activeLayers.some(l => ['crop-burning', 'fire-density'].includes(l))) {
    legendConfig = LAYER_TO_LEGEND['fire']
  } else if (activeLayers.includes('land-temperature')) {
    legendConfig = LAYER_TO_LEGEND['temperature']
  }

  if (activeLayers.length === 0) return null

  return (
    <div className="bg-[#020617]/90 backdrop-blur-xl rounded-xl p-4 max-w-[280px] shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-[#1e293b]">
      {/* HUD Header */}
      <div className="flex items-start justify-between mb-4 border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#0f172a] border border-[#334155] flex items-center justify-center">
            <Activity className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">{legendConfig.title}</h3>
            <p className="text-[10px] text-[#64748b] uppercase tracking-widest">{legendConfig.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Gradient Scale HUD */}
      <div className="space-y-1.5">
        {legendConfig.items.map((item, idx) => (
          <div key={item.range} className="group flex items-center gap-3 p-1.5 rounded hover:bg-[#0f172a] transition-colors">
            <div 
              className="w-3 h-3 rounded-sm shadow-inner relative overflow-hidden flex-shrink-0" 
              style={{ backgroundColor: item.color }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            <span className="text-[11px] font-semibold text-[#cbd5e1] flex-1 tracking-wide group-hover:text-white transition-colors">{item.label}</span>
            <span className="text-[10px] text-[#94a3b8] font-mono font-medium">{item.range}</span>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center gap-2">
        <Info className="w-3 h-3 text-[#64748b]" />
        <p className="text-[9px] text-[#64748b] uppercase tracking-wider">Calibrated via Ground Truth</p>
      </div>
    </div>
  )
}
