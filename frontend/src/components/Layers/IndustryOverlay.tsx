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
    <Source
      id="industries"
      type="geojson"
      data={geojson}
      cluster={true}
      clusterMaxZoom={8}
      clusterRadius={45}
    >
      {/* Clustered circles */}
      <Layer
        id="industries-clusters"
        type="circle"
        filter={['has', 'point_count']}
        paint={{
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#F97316',
            10,
            '#EA580C',
            50,
            '#C2410C',
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
        id="industries-cluster-count"
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
        id="industries-unclustered"
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
          'circle-color': '#F97316',
          'circle-opacity': opacity * 0.9,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-opacity': opacity * 0.95,
        }}
      />
      {/* Individual labels ONLY when zoomed in (minzoom=9) */}
      <Layer
        id="industries-labels"
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
