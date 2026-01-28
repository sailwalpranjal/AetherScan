'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function LandTemperature({ data, opacity }: Props) {
  const geojson = useMemo(() => {
    if (!data?.features) return null

    // Add unique IDs to features to prevent React key warnings
    const featuresWithIds = data.features.map((feature: any, index: number) => ({
      ...feature,
      id: `temp-${feature.geometry.coordinates[1]}-${feature.geometry.coordinates[0]}-${index}`,
    }))

    return { ...data, features: featuresWithIds }
  }, [data])

  if (!geojson) return null

  return (
    <Source id="land-temperature" type="geojson" data={geojson}>
      {/* Temperature heatmap with blue-to-red scale */}
      <Layer
        id="land-temperature-heatmap"
        type="heatmap"
        paint={{
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'temperature'],
            -10, 0,
            0, 0.2,
            15, 0.5,
            30, 0.8,
            45, 1
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1.5,
            4, 2,
            9, 3
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.1, '#0000FF',      // Very Cold - Blue
            0.3, '#00FFFF',      // Cold - Cyan
            0.5, '#00FF00',      // Moderate - Green
            0.7, '#FFFF00',      // Warm - Yellow
            0.85, '#FF7E00',     // Hot - Orange
            1, '#FF0000'         // Very Hot - Red
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 35,
            4, 50,
            9, 90
          ],
          'heatmap-opacity': opacity,
        }}
      />
      {/* Temperature labels */}
      <Layer
        id="land-temperature-labels"
        type="symbol"
        minzoom={5}
        layout={{
          'text-field': [
            'concat',
            ['to-string', ['round', ['get', 'temperature']]],
            '°C'
          ],
          'text-size': 11,
          'text-offset': [0, 0],
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
