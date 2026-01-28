'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function PowerPlants({ data, opacity }: Props) {
  // Add unique IDs to features and validate GeoJSON
  const geojsonWithIds = useMemo(() => {
    try {
      // Validate that data exists and is a proper GeoJSON
      if (!data) {
        return { type: 'FeatureCollection', features: [] }
      }

      // If it's not a valid GeoJSON FeatureCollection, return empty
      if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
        console.warn('PowerPlants: Invalid data format, expected GeoJSON FeatureCollection')
        return { type: 'FeatureCollection', features: [] }
      }

      // Add unique IDs to features to prevent React key warnings
      const featuresWithIds = data.features.map((feature: any, index: number) => ({
        ...feature,
        id: `plant-${feature.geometry?.coordinates?.[1]}-${feature.geometry?.coordinates?.[0]}-${index}`,
      }))

      return { ...data, features: featuresWithIds }
    } catch (error) {
      console.error('Error validating PowerPlants GeoJSON:', error)
      return { type: 'FeatureCollection', features: [] }
    }
  }, [data])

  if (!geojsonWithIds || !geojsonWithIds.features || geojsonWithIds.features.length === 0) return null

  return (
    <Source id="power-plants" type="geojson" data={geojsonWithIds}>
      <Layer
        id="power-plants-layer"
        type="circle"
        paint={{
          'circle-radius': 8,
          'circle-color': '#FF4444',
          'circle-opacity': opacity,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': opacity,
        }}
      />
      <Layer
        id="power-plants-labels"
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
