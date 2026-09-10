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
    <Source
      id="power-plants"
      type="geojson"
      data={geojsonWithIds}
      cluster={true}
      clusterMaxZoom={8}
      clusterRadius={45}
    >
      {/* Clustered circles */}
      <Layer
        id="power-plants-clusters"
        type="circle"
        filter={['has', 'point_count']}
        paint={{
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#F43F5E',
            10,
            '#E11D48',
            50,
            '#BE123C',
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            13,
            10,
            17,
            50,
            22,
          ],
          'circle-opacity': opacity * 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-opacity': opacity * 0.85,
        }}
      />
      {/* Cluster count text */}
      <Layer
        id="power-plants-cluster-count"
        type="symbol"
        filter={['has', 'point_count']}
        layout={{
          'text-field': '{point_count_abbreviated}',
          'text-size': 10,
        }}
        paint={{
          'text-color': '#ffffff',
        }}
      />
      {/* Unclustered individual points */}
      <Layer
        id="power-plants-unclustered"
        type="circle"
        filter={['!', ['has', 'point_count']]}
        paint={{
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 3.5,
            7, 5,
            10, 7
          ],
          'circle-color': '#EF4444',
          'circle-opacity': opacity * 0.9,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-opacity': opacity * 0.95,
        }}
      />
      {/* Individual labels ONLY when zoomed in (minzoom=9) */}
      <Layer
        id="power-plants-labels"
        type="symbol"
        filter={['!', ['has', 'point_count']]}
        minzoom={9}
        layout={{
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-offset': [0, 1.3],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        }}
        paint={{
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(15, 23, 42, 0.95)',
          'text-halo-width': 1.5,
          'text-opacity': opacity * 0.9,
        }}
      />
    </Source>
  )
}
