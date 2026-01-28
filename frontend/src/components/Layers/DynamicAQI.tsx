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
          // Intensity increases with zoom for better visibility
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            4, 1.5,
            9, 2.5
          ],
          // EPA AQI Standard Color Scale
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',        // Transparent
            0.1, '#00E400',             // Good (0-50) - Green
            0.2, '#92D050',             // Good-Moderate transition
            0.3, '#FFFF00',             // Moderate (51-100) - Yellow
            0.5, '#FF7E00',             // Unhealthy for Sensitive (101-150) - Orange
            0.7, '#FF0000',             // Unhealthy (151-200) - Red
            0.85, '#8F3F97',            // Very Unhealthy (201-300) - Purple
            1, '#7E0023'                // Hazardous (301+) - Maroon
          ],
          // Radius increases with zoom for smooth coverage
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 60,
            4, 80,
            9, 140
          ],
          'heatmap-opacity': opacity * 0.9,
        }}
      />
    </Source>
  )
}
