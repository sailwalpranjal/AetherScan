'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function SatelliteNO2({ data, opacity }: Props) {
  // Handle WMS format (Bhuvan or other WMS sources)
  if (data && data.type === 'wms') {
    // WMS layers are not directly supported in MapLibre GL
    // Return null for now - WMS integration requires a raster source
    console.log('[SatelliteNO2] WMS layer detected, rendering as heatmap fallback')
    return null
  }

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
    <Source id="satellite-no2" type="geojson" data={geojson}>
      {/* Heatmap layer for concentration visualization */}
      <Layer
        id="satellite-no2-heatmap"
        type="heatmap"
        paint={{
          // Weight based on NO2 concentration
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'no2_concentration'],
            0,
            0,
            1e15,
            0.5, // Low concentration
            5e15,
            0.8, // Medium
            1e16,
            1, // High concentration
          ],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 9, 1.5],
          // Blue to Red color scale for NO2
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(0,0,0,0)',
            0.1,
            '#4A90E2', // Blue (low)
            0.3,
            '#50C878', // Green
            0.5,
            '#FFFF00', // Yellow (medium)
            0.7,
            '#FFA500', // Orange
            0.85,
            '#FF4500', // Red (high)
            1,
            '#8B0000', // Dark red (very high)
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 40, 9, 100],
          'heatmap-opacity': opacity * 0.85,
        }}
      />
      {/* Circle layer for individual points */}
      <Layer
        id="satellite-no2-points"
        type="circle"
        paint={{
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 6],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'no2_concentration'],
            0,
            '#4A90E2',
            5e15,
            '#FFFF00',
            1e16,
            '#FF0000',
          ],
          'circle-opacity': opacity * 0.6,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-opacity': opacity * 0.4,
        }}
      />
    </Source>
  )
}
