'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function DynamicAQI({ data, opacity }: Props) {
  const geojson = useMemo(() => {
    try {
      // Handle null or undefined data
      if (!data) {
        return { type: 'FeatureCollection', features: [] }
      }

      // Handle new GeoJSON format from backend
      if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
        return data
      }

      // Fallback for old format (legacy support)
      if (!data.data || !Array.isArray(data.data)) {
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
          id: `aqi-${point.latitude}-${point.longitude}-${index}`,
          geometry: {
            type: 'Point',
            coordinates: [point.longitude, point.latitude],
          },
          properties: {
            aqi: point.aqi || point.value || 0,
          },
        }))

      return { type: 'FeatureCollection', features }
    } catch (error) {
      console.error('Error creating DynamicAQI GeoJSON:', error)
      return { type: 'FeatureCollection', features: [] }
    }
  }, [data])

  if (!geojson || !geojson.features || geojson.features.length === 0) return null

  return (
    <Source id="dynamic-aqi-heatmap" type="geojson" data={geojson}>
      <Layer
        id="dynamic-aqi-heatmap-layer"
        type="heatmap"
        paint={{
          // Weight based on EPA AQI breakpoints
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'aqi'],
            0, 0,
            50, 0.2,      // Good
            100, 0.4,     // Moderate
            150, 0.6,     // Unhealthy for Sensitive
            200, 0.8,     // Unhealthy
            300, 0.95,    // Very Unhealthy
            500, 1        // Hazardous
          ],
          // Intensity scaled smoothly with zoom
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0.7,
            4, 1.1,
            8, 1.8,
            12, 2.4
          ],
          // EPA AQI Standard Color Scale with subtle transitions
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
          // Smooth, non-bloated heatmap radius
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
