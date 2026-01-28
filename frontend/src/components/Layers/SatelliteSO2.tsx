'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function SatelliteSO2({ data, opacity }: Props) {
  const geojson = useMemo(() => {
    if (!data || !data.features) return null
    if (data.features.length === 0) return null

    // Filter out points with no coordinates
    const validFeatures = data.features.filter(
      (f: any) =>
        f.geometry &&
        f.geometry.coordinates &&
        f.geometry.coordinates.length === 2 &&
        f.geometry.coordinates[0] !== null &&
        f.geometry.coordinates[1] !== null
    )

    if (validFeatures.length === 0) return null

    return {
      type: 'FeatureCollection',
      features: validFeatures,
    }
  }, [data])

  if (!geojson) return null

  return (
    <Source id="satellite-so2" type="geojson" data={geojson}>
      {/* Heatmap layer for SO2 concentration */}
      <Layer
        id="satellite-so2-heatmap"
        type="heatmap"
        paint={{
          // Weight based on SO2 concentration (DU - Dobson Units)
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'so2_concentration'],
            0,
            0,
            5,
            0.3, // Low
            10,
            0.6, // Medium
            20,
            1, // High
          ],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.6, 9, 1.8],
          // Purple to Yellow color scale for industrial emissions
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(0,0,0,0)',
            0.1,
            '#9D4EDD', // Purple (low - industrial)
            0.3,
            '#C77DFF', // Light purple
            0.5,
            '#E0AAFF', // Lavender
            0.7,
            '#FFC8DD', // Pink (medium)
            0.85,
            '#FFAFCC', // Light pink
            1,
            '#BDE0FE', // Pale blue (high concentration areas)
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 50, 9, 120],
          'heatmap-opacity': opacity * 0.8,
        }}
      />
      {/* Circle layer showing individual SO2 sources */}
      <Layer
        id="satellite-so2-points"
        type="circle"
        paint={{
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'so2_concentration'],
            0,
            3,
            10,
            6,
            20,
            10,
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'so2_concentration'],
            0,
            '#9D4EDD', // Low - Purple
            10,
            '#E0AAFF', // Medium - Lavender
            20,
            '#FFC8DD', // High - Pink
          ],
          'circle-opacity': opacity * 0.7,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-opacity': opacity * 0.5,
        }}
      />
    </Source>
  )
}
