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
      {/* Exposure risk circles with gradient */}
      <Layer
        id="population-exposure-layer"
        type="circle"
        paint={{
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'exposure_risk'],
            0, 6,
            100, 8,
            300, 11,
            500, 14,
            700, 17,
            1000, 22
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'exposure_risk'],
            0, '#00E400',      // Low Risk - Green
            150, '#92D050',    // Low-Moderate - Light Green
            300, '#FFFF00',    // Moderate - Yellow
            500, '#FF7E00',    // High - Orange
            700, '#FF0000',    // Very High - Red
            900, '#8F3F97',    // Severe - Purple
            1000, '#7E0023'    // Extreme - Maroon
          ],
          'circle-opacity': opacity * 0.7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': opacity * 0.9,
        }}
      />
      {/* Location labels */}
      <Layer
        id="population-exposure-labels"
        type="symbol"
        layout={{
          'text-field': ['get', 'location'],
          'text-size': 11,
          'text-offset': [0, -1.8],
          'text-anchor': 'bottom',
          'text-allow-overlap': false,
        }}
        paint={{
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 2,
          'text-opacity': opacity,
        }}
      />
      {/* Risk value labels */}
      <Layer
        id="population-exposure-values"
        type="symbol"
        minzoom={6}
        layout={{
          'text-field': [
            'concat',
            'Risk: ',
            ['to-string', ['round', ['get', 'exposure_risk']]],
            '\nPM2.5: ',
            ['to-string', ['round', ['get', 'pm25']]]
          ],
          'text-size': 9,
          'text-offset': [0, 2],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        }}
        paint={{
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1.5,
          'text-opacity': opacity * 0.85,
        }}
      />
    </Source>
  )
}
