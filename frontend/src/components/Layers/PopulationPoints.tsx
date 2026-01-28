'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function PopulationPoints({ data, opacity }: Props) {
  const geojson = useMemo(() => {
    if (!data?.features) return null

    // Add unique IDs to features to prevent React key warnings
    const featuresWithIds = data.features.map((feature: any, index: number) => ({
      ...feature,
      id: `pop-${feature.geometry.coordinates[1]}-${feature.geometry.coordinates[0]}-${index}`,
    }))

    return { ...data, features: featuresWithIds }
  }, [data])

  if (!geojson) return null

  return (
    <Source id="population-points" type="geojson" data={geojson}>
      {/* Population circles with professional gradient - uses population_density */}
      <Layer
        id="population-points-layer"
        type="circle"
        paint={{
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'population_density'],
            0, 4,
            10, 6,
            50, 8,
            100, 10,
            500, 13,
            1000, 16,
            5000, 20,
            10000, 25
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'population_density'],
            0, '#FFFFB2',       // Very Low - Light Yellow
            10, '#FEF08A',      // Very Low - Pale Yellow
            50, '#FDE047',      // Low - Yellow
            100, '#FACC15',     // Low-Medium - Gold
            500, '#F59E0B',     // Medium - Amber
            1000, '#F97316',    // High - Orange
            5000, '#DC2626',    // Very High - Red
            10000, '#7F1D1D'    // Extreme - Dark Red
          ],
          'circle-opacity': opacity * 0.75,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': opacity * 0.95,
        }}
      />
      {/* Population density value labels */}
      <Layer
        id="population-points-labels"
        type="symbol"
        minzoom={6}
        layout={{
          'text-field': [
            'concat',
            ['to-string', ['round', ['get', 'population_density']]],
            ' /km²'
          ],
          'text-size': 10,
          'text-offset': [0, 0],
          'text-anchor': 'center',
          'text-allow-overlap': false,
        }}
        paint={{
          'text-color': '#FFFFFF',
          'text-halo-color': '#000000',
          'text-halo-width': 2,
          'text-opacity': opacity * 0.9,
        }}
      />
    </Source>
  )
}
