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
            0, 1,
            4, 1.5,
            9, 2.5
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.1, '#00FF00',      // Good - Bright Green
            0.2, '#92D050',      // Good-Moderate - Light Green
            0.3, '#FFFF00',      // Moderate - Yellow
            0.5, '#FFA500',      // Unhealthy for Sensitive - Orange
            0.7, '#FF0000',      // Unhealthy - Red
            0.85, '#8B00FF',     // Very Unhealthy - Purple
            1, '#8B0000'         // Hazardous - Dark Red/Maroon
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 50,
            4, 70,
            9, 120
          ],
          'heatmap-opacity': opacity * 0.85,
        }}
      />
    </Source>
  )
}
