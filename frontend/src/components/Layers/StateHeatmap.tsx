'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function StateHeatmap({ data, opacity }: Props) {
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
        .filter((state: any) => {
          // Validate required fields and coordinates
          return state &&
                 typeof state.longitude === 'number' &&
                 typeof state.latitude === 'number' &&
                 !isNaN(state.longitude) &&
                 !isNaN(state.latitude)
        })
        .map((state: any, index: number) => ({
          type: 'Feature',
          id: `state-${state.state}-${index}`,
          geometry: {
            type: 'Point',
            coordinates: [state.longitude, state.latitude],
          },
          properties: {
            state: state.state || 'Unknown',
            aqi: state.aqi || 0,
            category: state.category || 'Unknown',
            color: state.color || '#808080',
          },
        }))

      return { type: 'FeatureCollection', features }
    } catch (error) {
      console.error('Error creating StateHeatmap GeoJSON:', error)
      return { type: 'FeatureCollection', features: [] }
    }
  }, [data])

  if (!geojson || !geojson.features || geojson.features.length === 0) return null

  return (
    <Source id="state-heatmap" type="geojson" data={geojson}>
      {/* Subtle state ambient glow halo */}
      <Layer
        id="state-heatmap-glow"
        type="circle"
        paint={{
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3, 12,
            6, 20,
            9, 32
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': opacity * 0.2,
          'circle-stroke-width': 1,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-opacity': opacity * 0.4,
        }}
      />
      {/* Sleek central indicator beacon */}
      <Layer
        id="state-heatmap-core"
        type="circle"
        paint={{
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3, 4,
            6, 6,
            9, 8
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': opacity * 0.95,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': opacity,
        }}
      />
      {/* State & AQI clean typographic label */}
      <Layer
        id="state-heatmap-labels"
        type="symbol"
        layout={{
          'text-field': [
            'concat',
            ['get', 'state'],
            ' • ',
            ['to-string', ['round', ['get', 'aqi']]]
          ],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3, 9,
            6, 11,
            9, 13
          ],
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        }}
        paint={{
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(15, 23, 42, 0.95)',
          'text-halo-width': 1.5,
          'text-opacity': opacity * 0.95,
        }}
      />
    </Source>
  )
}
