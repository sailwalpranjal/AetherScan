'use client'

import { Layer, Source } from 'react-map-gl/maplibre'

interface WMSData {
  type: 'wms'
  url: string
  layer_name?: string
  title?: string
}

interface Props {
  id: string
  data: WMSData
  opacity: number
}

function toRasterTileUrl(url: string): string {
  return url
    .replace(/WIDTH=\d+/i, 'WIDTH=256')
    .replace(/HEIGHT=\d+/i, 'HEIGHT=256')
    .replace(/CRS=EPSG:4326/i, 'CRS=EPSG:3857')
    .replace(/SRS=EPSG:4326/i, 'SRS=EPSG:3857')
    .replace(/\{bbox\}/gi, '{bbox-epsg-3857}')
}

export default function WMSOverlay({ id, data, opacity }: Props) {
  if (!data?.url) {
    return null
  }

  const tiles = [toRasterTileUrl(data.url)]

  return (
    <Source id={`${id}-wms-source`} type="raster" tiles={tiles} tileSize={256}>
      <Layer
        id={`${id}-wms-layer`}
        type="raster"
        paint={{
          'raster-opacity': opacity,
        }}
      />
    </Source>
  )
}
