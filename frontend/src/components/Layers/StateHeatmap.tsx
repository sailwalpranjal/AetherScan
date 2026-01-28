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
      {/* Heatmap layer for smooth gradients */}
      <Layer
        id="state-heatmap-base"
        type="heatmap"
        paint={{
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'aqi'],
            0, 0,
            100, 0.5,
            200, 0.7,
            300, 0.9,
            400, 1
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1.5,
            4, 2.5,
            9, 4
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, '#00E400',
            0.4, '#FFFF00',
            0.6, '#FF7E00',
            0.8, '#FF0000',
            1, '#8F3F97'
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 50,
            4, 70,
            9, 120
          ],
          'heatmap-opacity': opacity,
        }}
      />
      {/* State labels */}
      <Layer
        id="state-heatmap-labels"
        type="symbol"
        layout={{
          'text-field': ['get', 'state'],
          'text-size': 11,
          'text-anchor': 'center',
        }}
        paint={{
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1.5,
          'text-opacity': opacity * 0.8,
        }}
      />
    </Source>
  )
}
