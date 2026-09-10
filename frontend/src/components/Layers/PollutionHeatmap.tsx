'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'
import type { HeatmapData } from '@/lib/types'

interface Props {
  data: HeatmapData
  opacity: number
}

export default function PollutionHeatmap({ data, opacity }: Props) {
  const geojson = useMemo(() => {
    try {
      // Handle null or undefined data
      if (!data || !data.data || !Array.isArray(data.data)) {
        return { type: 'FeatureCollection', features: [] }
      }

      const features = data.data
        .filter((point: any) => {
          // Validate required fields and coordinates
          return point &&
                 typeof point.longitude === 'number' &&
                 typeof point.latitude === 'number' &&
                 !isNaN(point.longitude) &&
                 !isNaN(point.latitude)
        })
        .map((point: any, index: number) => ({
          type: 'Feature',
          id: `pollution-${point.latitude}-${point.longitude}-${index}`,
          geometry: {
            type: 'Point',
            coordinates: [point.longitude, point.latitude],
          },
          properties: {
            value: point.value || 0,
          },
        }))

      return {
        type: 'FeatureCollection',
        features,
      }
    } catch (error) {
      console.error('Error creating PollutionHeatmap GeoJSON:', error)
      return { type: 'FeatureCollection', features: [] }
    }
  }, [data])

  if (!geojson || !geojson.features || geojson.features.length === 0) return null

  return (
    <Source id="pollution-heatmap" type="geojson" data={geojson}>
      <Layer
        id="pollution-heatmap-layer"
        type="heatmap"
        paint={{
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'value'],
            0, 0,
            12, 0.2,
            35, 0.4,
            55, 0.6,
            150, 0.8,
            250, 1
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0.7,
            4, 1.1,
            8, 1.8,
            12, 2.4
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.15, 'rgba(16, 185, 129, 0.6)',  // Emerald Green
            0.35, 'rgba(234, 179, 8, 0.75)',  // Yellow
            0.55, 'rgba(249, 115, 22, 0.85)', // Orange
            0.75, 'rgba(239, 68, 68, 0.9)',   // Red
            0.9, 'rgba(168, 85, 247, 0.95)',  // Purple
            1.0, '#7E0023'                    // Maroon
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 10,
            4, 20,
            7, 36,
            10, 65,
            13, 95
          ],
          'heatmap-opacity': opacity * 0.78,
        }}
      />
    </Source>
  )
}
