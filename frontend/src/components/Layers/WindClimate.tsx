'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function WindClimate({ data, opacity }: Props) {
  const geojson = useMemo(() => {
    if (!data?.features) return null

    // Add unique IDs to features to prevent React key warnings
    const featuresWithIds = data.features.map((feature: any, index: number) => ({
      ...feature,
      id: `wind-${feature.geometry.coordinates[1]}-${feature.geometry.coordinates[0]}-${index}`,
    }))

    return { ...data, features: featuresWithIds }
  }, [data])

  if (!geojson) return null

  return (
    <Source id="wind-climate" type="geojson" data={geojson}>
      {/* Wind speed heatmap */}
      <Layer
        id="wind-heatmap-layer"
        type="heatmap"
        paint={{
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'speed'],
            0, 0,
            5, 0.3,
            10, 0.6,
            15, 1
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
            0.3, '#00FFFF',      // Calm
            0.5, '#00FF00',      // Light breeze
            0.7, '#FFFF00',      // Moderate wind
            0.9, '#FF7E00',      // Strong wind
            1, '#FF0000'         // High wind
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 40,
            4, 60,
            9, 100
          ],
          'heatmap-opacity': opacity,
        }}
      />
      {/* Wind data labels */}
      <Layer
        id="wind-labels-layer"
        type="symbol"
        layout={{
          'text-field': [
            'concat',
            ['to-string', ['round', ['get', 'speed']]],
            'm/s ',
            ['to-string', ['round', ['get', 'temperature']]],
            '°C'
          ],
          'text-size': 10,
          'text-offset': [0, 1.5],
        }}
        paint={{
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
          'text-opacity': opacity * 0.7,
        }}
      />
    </Source>
  )
}
