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
    <Source id="aqi-validation" type="geojson" data={geojson}>
      <Layer
        id="aqi-validation-layer"
        type="circle"
        paint={{
          'circle-radius': 8,
          'circle-color': '#9B59B6',
          'circle-opacity': opacity,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#E74C3C',
        }}
      />
    </Source>
  )
}
