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
      <Layer
        id="sensors-layer"
        type="circle"
        paint={{
          'circle-radius': 6,
          'circle-color': '#00E4FF',
          'circle-opacity': opacity,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        }}
      />
    </Source>
  )
}
