'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function CropBurning({ data, opacity }: Props) {
  const geojson = useMemo(() => {
    // Validate data
    if (!data) return { type: 'FeatureCollection', features: [] }

    // Handle GeoJSON format from backend
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      return data
    }

    return { type: 'FeatureCollection', features: [] }
  }, [data])

  if (!geojson.features || geojson.features.length === 0) return null

  return (
    <Source id="crop-burning" type="geojson" data={geojson}>
      <Layer
        id="crop-burning-layer"
        type="circle"
        paint={{
          // Radius based on FRP (Fire Radiative Power)
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'frp'],
            0, 4,      // Low FRP: small circles
            50, 6,
            100, 8,
            200, 12,
            500, 18    // High FRP: large circles
          ],
          // Color gradient based on FRP intensity
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'frp'],
            0, '#FFFF00',      // Low FRP: Yellow (cool fires)
            50, '#FFA500',     // Medium: Orange
            100, '#FF6347',    // Medium-High: Tomato red
            200, '#FF4500',    // High: Orange-red
            500, '#DC143C'     // Very High: Crimson (hot fires)
          ],
          'circle-opacity': opacity * 0.8,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': [
            'interpolate',
            ['linear'],
            ['get', 'frp'],
            0, '#FFD700',      // Gold stroke for low FRP
            200, '#FF8C00',    // Dark orange for high FRP
            500, '#8B0000'     // Dark red for very high FRP
          ],
          'circle-stroke-opacity': opacity
        }}
      />
    </Source>
  )
}
