'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function FireDensity({ data, opacity }: Props) {
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
    <Source id="fire-density" type="geojson" data={geojson}>
      {/* Fire density heatmap */}
      <Layer
        id="fire-density-heatmap"
        type="heatmap"
        paint={{
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'density'],
            0, 0,
            5, 0.3,
            10, 0.6,
            20, 1
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
            0.2, '#FEF08A',
            0.4, '#FACC15',
            0.6, '#F97316',
            0.8, '#EF4444',
            1, '#DC2626'
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
    </Source>
  )
}
