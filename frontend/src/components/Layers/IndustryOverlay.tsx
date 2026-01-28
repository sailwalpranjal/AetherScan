'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function IndustryOverlay({ data, opacity }: Props) {
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
      console.warn('IndustryOverlay: Invalid data format, expected GeoJSON FeatureCollection')
      return { type: 'FeatureCollection', features: [] }
    } catch (error) {
      console.error('Error validating IndustryOverlay GeoJSON:', error)
      return { type: 'FeatureCollection', features: [] }
    }
  }, [data])

  if (!geojson || !geojson.features || geojson.features.length === 0) return null

  return (
    <Source id="industries" type="geojson" data={geojson}>
      <Layer
        id="industries-layer"
        type="circle"
        paint={{
          'circle-radius': 8,
          'circle-color': '#FF6B6B',
          'circle-opacity': opacity,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        }}
      />
      <Layer
        id="industries-labels"
        type="symbol"
        layout={{
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
        }}
        paint={{
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
          'text-opacity': opacity,
        }}
      />
    </Source>
  )
}
