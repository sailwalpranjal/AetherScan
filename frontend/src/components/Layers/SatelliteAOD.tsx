'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function SatelliteAOD({ data, opacity }: Props) {
  // Handle WMS format (Bhuvan WMS layer)
  if (data && data.type === 'wms') {
    // WMS layers require special handling in MapLibre
    // For now, return null - this would need a raster-dem source
    console.log('[SatelliteAOD] WMS layer detected, skipping rendering')
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
    <Source id="satellite-aod" type="geojson" data={geojson}>
      {/* Heatmap for aerosol optical depth */}
      <Layer
        id="satellite-aod-heatmap"
        type="heatmap"
        paint={{
          // Weight based on AOD value (typical range: 0-2, higher = more aerosols)
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'aod_550nm'],
            0,
            0,
            0.5,
            0.4, // Clean air
            1.0,
            0.7, // Moderate aerosol loading
            2.0,
            1, // Heavy pollution/dust
          ],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.7, 9, 2],
          // Brown/Gray color scale for dust and pollution
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(0,0,0,0)',
            0.1,
            '#E8F4F8', // Very light blue (clean)
            0.3,
            '#B8D4E0', // Light blue-gray
            0.5,
            '#F4E8C1', // Beige (moderate)
            0.7,
            '#D4A76A', // Tan/brown (dusty)
            0.85,
            '#C17817', // Dark tan
            1,
            '#8B4513', // Brown (heavy aerosol)
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 60, 9, 150],
          'heatmap-opacity': opacity * 0.75,
        }}
      />
      {/* Circle layer for AOD measurements */}
      <Layer
        id="satellite-aod-points"
        type="circle"
        paint={{
          'circle-radius': ['interpolate', ['linear'], ['get', 'aod_550nm'], 0, 3, 1, 6, 2, 10],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'aod_550nm'],
            0,
            '#B8D4E0', // Clean air - light blue
            0.5,
            '#F4E8C1', // Moderate - beige
            1.0,
            '#D4A76A', // Dusty - tan
            2.0,
            '#8B4513', // Heavy - brown
          ],
          'circle-opacity': opacity * 0.65,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-opacity': opacity * 0.4,
        }}
      />
    </Source>
  )
}
