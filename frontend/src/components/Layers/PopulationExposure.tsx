'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

interface Props {
  data: any
  opacity: number
}

export default function PopulationExposure({ data, opacity }: Props) {
  const geojson = useMemo(() => {
    // Handle new GeoJSON format from backend
    if (data.type === 'FeatureCollection' && data.features) {
      return data
    }

    // Fallback for old format (legacy support)
    if (!data.data) return null

    const features = data.data.map((record: any, index: number) => ({
      type: 'Feature',
      id: `exposure-${record.latitude}-${record.longitude}-${index}`,
      geometry: {
        type: 'Point',
        coordinates: [record.longitude, record.latitude],
      },
      properties: {
        location: record.location,
        exposure_risk: record.exposure_risk,
        population: record.population,
        pm25: record.pm25,
      },
    }))

    return { type: 'FeatureCollection', features }
  }, [data])

  if (!geojson || !geojson.features || geojson.features.length === 0) return null

  return (
    <Source id="population-exposure" type="geojson" data={geojson}>
      {/* Exposure risk circles with refined radius */}
      <Layer
        id="population-exposure-layer"
        type="circle"
        paint={{
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, [
              'interpolate',
              ['linear'],
              ['get', 'exposure_risk'],
              0, 3,
              50, 4.5,
              200, 6.5,
              1000, 9
            ],
            8, [
              'interpolate',
              ['linear'],
              ['get', 'exposure_risk'],
              0, 5,
              50, 7.5,
              200, 10,
              1000, 14
            ]
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'exposure_risk'],
            0, '#10B981',      // Low Risk - Emerald
            25, '#84CC16',     // Low-Moderate - Lime
            50, '#EAB308',     // Moderate - Amber
            100, '#F97316',    // High - Orange
            200, '#EF4444',    // Very High - Red
            500, '#A855F7',    // Severe - Purple
            1000, '#7E0023'    // Extreme - Maroon
          ],
          'circle-opacity': opacity * 0.85,
          'circle-stroke-width': 1.2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': opacity * 0.9,
        }}
      />
      {/* Location and exposure label ONLY at zoom >= 8 */}
      <Layer
        id="population-exposure-labels"
        type="symbol"
        minzoom={8}
        layout={{
          'text-field': [
            'concat',
            ['get', 'location'],
            ' • PM₂.₅ ',
            ['to-string', ['round', ['get', 'pm25']]]
          ],
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
