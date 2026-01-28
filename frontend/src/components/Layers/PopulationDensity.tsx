'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function PopulationDensity({ data, opacity }: Props) {
  const geojson = useMemo(() => {
    if (!data?.features) return null

    // Add unique IDs to features to prevent React key warnings
    const featuresWithIds = data.features.map((feature: any, index: number) => ({
      ...feature,
      id: `popdens-${feature.geometry.coordinates[1]}-${feature.geometry.coordinates[0]}-${index}`,
    }))

    return { ...data, features: featuresWithIds }
  }, [data])

  if (!geojson) return null

  return (
    <Source id="population-density" type="geojson" data={geojson}>
      {/* Population density heatmap */}
      <Layer
        id="population-density-heatmap"
        type="heatmap"
        paint={{
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'population_density'],
            0, 0,
            100, 0.3,
            500, 0.5,
            1000, 0.7,
            5000, 0.9,
            10000, 1
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
            0.1, '#FFFFB2',      // Very Low - Light Yellow
            0.3, '#FECC5C',      // Low - Yellow
            0.5, '#FD8D3C',      // Medium - Orange
            0.7, '#F03B20',      // High - Red
            0.9, '#BD0026',      // Very High - Dark Red
            1, '#800026'         // Extreme - Maroon
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 30,
            4, 50,
            9, 80
          ],
          'heatmap-opacity': opacity,
        }}
      />
      {/* Population density labels */}
      <Layer
        id="population-density-labels"
        type="symbol"
        minzoom={5}
        layout={{
          'text-field': [
            'concat',
            ['to-string', ['round', ['get', 'population_density']]],
            ' /km²'
          ],
          'text-size': 10,
          'text-offset': [0, 0],
          'text-anchor': 'center',
        }}
        paint={{
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1.5,
          'text-opacity': opacity * 0.7,
        }}
      />
    </Source>
  )
}
