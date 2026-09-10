'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function AQIValidation({ data, opacity }: Props) {
  const geojson = useMemo(() => {
    // Validate data exists
    if (!data) return { type: 'FeatureCollection', features: [] }

    // Handle new GeoJSON format from backend
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      // Filter to only show points within India bounds
      const indiaFeatures = data.features.filter((f: any) => {
        if (!f?.geometry?.coordinates) return false
        const [lon, lat] = f.geometry.coordinates
        // India bounds: Lat 6-37°N, Lon 68-98°E
        return lat >= 6 && lat <= 37 && lon >= 68 && lon <= 98
      })
      return { ...data, features: indiaFeatures }
    }

    // Fallback for old format (legacy support)
    if (!data.data || !Array.isArray(data.data)) {
      return { type: 'FeatureCollection', features: [] }
    }

    return {
      type: 'FeatureCollection',
      features: data.data
        .filter((point: any) => {
          // Validate point has coordinates and is within India
          const lat = point?.latitude
          const lon = point?.longitude
          return lat >= 6 && lat <= 37 && lon >= 68 && lon <= 98
        })
        .map((point: any, index: number) => ({
          type: 'Feature',
          id: `aqi-val-${point.latitude}-${point.longitude}-${index}`,
          geometry: {
            type: 'Point',
            coordinates: [point.longitude, point.latitude],
          },
          properties: {
            aqi: point.aqi,
            fire_intensity: point.fire_intensity,
          },
        })),
    }
  }, [data])

  if (!geojson || !geojson.features || geojson.features.length === 0) return null

  return (
    <Source
      id="aqi-validation"
      type="geojson"
      data={geojson}
      cluster={true}
      clusterMaxZoom={8}
      clusterRadius={40}
    >
      {/* Clustered validation points */}
      <Layer
        id="aqi-val-clusters"
        type="circle"
        filter={['has', 'point_count']}
        paint={{
          'circle-color': '#8B5CF6',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            12,
            10,
            16,
            50,
            20,
          ],
          'circle-opacity': opacity * 0.9,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-opacity': opacity * 0.8,
        }}
      />
      <Layer
        id="aqi-val-cluster-count"
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
      {/* Individual correlation halo */}
      <Layer
        id="aqi-val-unclustered-halo"
        type="circle"
        filter={['!', ['has', 'point_count']]}
        paint={{
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 6,
            8, 10,
            12, 14
          ],
          'circle-color': '#8B5CF6',
          'circle-opacity': opacity * 0.25,
        }}
      />
      {/* Individual core node */}
      <Layer
        id="aqi-val-unclustered-core"
        type="circle"
        filter={['!', ['has', 'point_count']]}
        paint={{
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 3.5,
            8, 5,
            12, 6.5
          ],
          'circle-color': '#A855F7',
          'circle-opacity': opacity * 0.95,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-opacity': opacity,
        }}
      />
      {/* Telemetry text at zoom >= 8 */}
      <Layer
        id="aqi-val-labels"
        type="symbol"
        filter={['!', ['has', 'point_count']]}
        minzoom={8}
        layout={{
          'text-field': [
            'concat',
            ['to-string', ['round', ['get', 'fire_intensity']]],
            ' MW'
          ],
          'text-size': 9,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        }}
        paint={{
          'text-color': '#E9D5FF',
          'text-halo-color': 'rgba(15, 23, 42, 0.95)',
          'text-halo-width': 1.5,
          'text-opacity': opacity * 0.9,
        }}
      />
    </Source>
  )
}
