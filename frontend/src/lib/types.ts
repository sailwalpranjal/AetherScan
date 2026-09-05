export interface Coordinates {
  latitude: number
  longitude: number
}

export interface AQIResult {
  aqi: number
  category: string
  color: string
  dominant_pollutant: string
  breakdowns: Record<string, {
    concentration: number
    sub_index: number
    category: string
  }>
  latitude?: number
  longitude?: number
  dataQualityScore?: number
  fusionConfidenceScore?: number
  isStale?: boolean
  isUnavailable?: boolean
}

export interface LayerConfig {
  id: string
  name: string
  description: string
  type: 'heatmap' | 'geojson' | 'wms' | 'tile' | 'deck' | 'timeseries'
  category: 'pollution' | 'industry' | 'population' | 'satellite' | 'fire' | 'other'
  defaultOpacity: number
  visible: boolean
}

export interface HeatmapData {
  type: string
  data: {
    lats: number[][]
    lons: number[][]
    values: number[][]
  } | HeatmapPoint[]
  source: string
  parameter?: string
  unit?: string
}

export interface HeatmapPoint {
  latitude: number
  longitude: number
  value: number
  aqi?: number
  category?: string
  color?: string
}

export interface GeoJSONFeature {
  type: 'Feature'
  geometry: {
    type: string
    coordinates: number[] | number[][]
  }
  properties: Record<string, any>
}

export interface GeoJSONLayer {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

export interface WMSLayer {
  type: 'wms'
  url: string
  layer_name: string
  title: string
  source: string
  attribution?: string
}

export interface TimeSeriesData {
  date: string
  avg: number
  min: number
  max: number
  count: number
}

export interface SensorStation {
  station_id: string
  name: string
  latitude: number
  longitude: number
  city: string
  country: string
  parameters: string[]
}

export interface MapViewState {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
}

export interface BaseMapStyle {
  id: string
  name: string
  url: string
  attribution: string
}
