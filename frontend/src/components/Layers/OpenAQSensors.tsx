'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function OpenAQSensors({ data, opacity }: Props) {
  const geojson = useMemo(() => {
    try {
      // Validate that data is a proper GeoJSON object
      if (!data) {
        return { type: 'FeatureCollection', features: [] }
      }

      // If it's already a valid GeoJSON FeatureCollection, use it
      if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
        return data
      }

      // If it's not in the expected format, return empty
      console.warn('OpenAQSensors: Invalid data format, expected GeoJSON FeatureCollection')
      return { type: 'FeatureCollection', features: [] }
    } catch (error) {
      console.error('Error validating OpenAQSensors GeoJSON:', error)
      return { type: 'FeatureCollection', features: [] }
    }
  }, [data])

  if (!geojson || !geojson.features || geojson.features.length === 0) return null

  return (
    <Source id="sensors" type="geojson" data={geojson}>
      {/* Outer sensor halo */}
      <Layer
        id="sensors-glow"
        type="circle"
        paint={{
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 7,
            7, 10,
            11, 14
          ],
          'circle-color': '#06B6D4',
          'circle-opacity': opacity * 0.25,
        }}
      />
      {/* Core sensor node */}
      <Layer
        id="sensors-layer"
        type="circle"
        paint={{
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 3.5,
            7, 5,
            11, 7
          ],
          'circle-color': '#00E4FF',
          'circle-opacity': opacity * 0.95,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': opacity,
        }}
      />
      {/* Sensor labels at district zoom */}
      <Layer
        id="sensors-labels"
        type="symbol"
        minzoom={9}
        layout={{
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-offset': [0, 1.3],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        }}
        paint={{
          'text-color': '#E0F2FE',
          'text-halo-color': 'rgba(15, 23, 42, 0.95)',
          'text-halo-width': 1.5,
          'text-opacity': opacity * 0.9,
        }}
      />
    </Source>
  )
}
