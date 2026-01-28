'use client'

import React from 'react'
import { Calendar, Clock } from 'lucide-react'

interface TimeSliderProps {
  timeRange: { start: string; end: string }
  onTimeRangeChange: (range: { start: string; end: string }) => void
}

export default function TimeSlider({ timeRange, onTimeRangeChange }: TimeSliderProps) {
  // Calculate days difference (client-side only to avoid hydration)
  const [daysDiff, setDaysDiff] = React.useState(7)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const start = new Date(timeRange.start)
    const end = new Date(timeRange.end)
    setDaysDiff(Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  }, [timeRange])

  // Suppress hydration warning for date inputs by only rendering after mount
  return (
    <div className="glass rounded-xl shadow-2xl border border-white/10">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-white" suppressHydrationWarning>
              {mounted ? `${daysDiff}d` : '7d'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-md">
            {mounted ? (
              <>
                <input
                  type="date"
                  value={timeRange.start}
                  onChange={(e) => onTimeRangeChange({ ...timeRange, start: e.target.value })}
                  className="flex-1 bg-white/10 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 focus:outline-none transition-all"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="date"
                  value={timeRange.end}
                  onChange={(e) => onTimeRangeChange({ ...timeRange, end: e.target.value })}
                  className="flex-1 bg-white/10 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 focus:outline-none transition-all"
                />
              </>
            ) : (
              <>
                <div className="flex-1 bg-white/10 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 h-8"></div>
                <span className="text-gray-400 text-xs">to</span>
                <div className="flex-1 bg-white/10 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 h-8"></div>
              </>
            )}
          </div>
          <div className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-400/30">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span className="text-xs font-medium text-cyan-400">Live</span>
          </div>
        </div>
      </div>
    </div>
  )
}
