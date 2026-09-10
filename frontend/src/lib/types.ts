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

export interface EvidenceChainGroundSensor {
  station_id: string
  name: string
  distance_km: number
  latitude: number
  longitude: number
  parameters: Record<string, {
    value: number
    unit: string
    timestamp: string
    dqs: number
  }>
}

export interface EvidenceChainFireEvent {
  id: number
  latitude: number
  longitude: number
  distance_km: number
  brightness: number
  frp: number
  satellite: string
  confidence: string
  acq_date: string
  acq_time: string
  dqs: number
}

export interface RegulatoryExceedance {
  pollutant: string
  observed_value: number
  unit: string
  standard_value: number
  exceedance_ratio: number
  standard_id: string
  authority: string
  averaging_period: string
  status?: string
}

export interface FacilityEvidenceChain {
  facility: {
    id: string | number
    name: string
    type?: string
    state?: string
    capacity?: string
    latitude?: number
    longitude?: number
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  radius_km: number
  ground_sensors: EvidenceChainGroundSensor[]
  fire_events: EvidenceChainFireEvent[]
  ambient_quality: {
    fcs: number
    fcs_confidence: string
    dominant_pollutant: string | null
    observations_count: number
  }
  regulatory_summary: {
    overall_status: 'compliant' | 'exceeded' | 'no_data'
    exceedances: RegulatoryExceedance[]
    details: any[]
  }
  thermal_correlation: {
    state: string
    fire_count: number
    max_brightness_k: number
    elevated_pm: boolean
    description: string
    disclaimer: string
  }
  data_availability: {
    has_ground_stations: boolean
    has_fire_hotspots: boolean
    stations_count: number
    fires_count: number
  }
}

