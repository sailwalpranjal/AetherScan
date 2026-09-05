import axios from 'axios'
import type { AQIResult, HeatmapData, GeoJSONLayer, WMSLayer, TimeSeriesData } from './types'

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// AQI Endpoints (AQICN Primary + OpenAQ Fallback)
export const aqiAPI = {
  // Main AQI calculation (auto-selects AQICN or OpenAQ)
  calculateAtPoint: async (lat: number, lon: number, source?: 'auto' | 'aqicn' | 'openaq'): Promise<AQIResult> => {
    const response = await api.get('/aqi/calculate', { params: { lat, lon, source: source || 'auto' } })
    return response.data
  },

  // Get 7-day forecast (AQICN only)
  getForecast: async (lat: number, lon: number) => {
    const response = await api.get('/aqi/forecast', { params: { lat, lon } })
    return response.data
  },

  // Search for monitoring stations
  searchStations: async (keyword: string, limit: number = 10) => {
    const response = await api.get('/aqi/stations/search', { params: { keyword, limit } })
    return response.data
  },

  // Get nearby monitoring stations
  getNearbyStations: async (lat: number, lon: number, radiusKm: number = 50) => {
    const response = await api.get('/aqi/stations/nearby', { params: { lat, lon, radius_km: radiusKm } })
    return response.data
  },

  // Get specific station data
  getStationData: async (stationId: number) => {
    const response = await api.get(`/aqi/stations/${stationId}`)
    return response.data
  },

  // Get health recommendations for an AQI value
  getHealthInfo: async (aqi: number) => {
    const response = await api.get('/aqi/health', { params: { aqi } })
    return response.data
  },

  calculateFromValues: async (pollutants: Record<string, number>): Promise<AQIResult> => {
    const response = await api.post('/aqi/calculate-from-values', pollutants)
    return response.data
  },

  getCategories: async () => {
    const response = await api.get('/aqi/categories')
    return response.data
  },

  getBreakpoints: async () => {
    const response = await api.get('/aqi/breakpoints')
    return response.data
  },
}

// Layer Endpoints
export const layersAPI = {
  getPollutionHeatmap: async (resolution: number = 0.2): Promise<HeatmapData> => {
    const response = await api.get('/layers/pollution-heatmap', { params: { resolution } })
    return response.data
  },

  getStateHeatmap: async () => {
    const response = await api.get('/layers/state-heatmap')
    return response.data
  },

  getSensors: async (): Promise<GeoJSONLayer> => {
    const response = await api.get('/layers/sensors')
    return response.data
  },

  getAQIHeatmap: async (resolution: number = 0.5): Promise<HeatmapData> => {
    const response = await api.get('/layers/aqi-heatmap', { params: { resolution } })
    return response.data
  },

  getIndustries: async (): Promise<GeoJSONLayer> => {
    const response = await api.get('/layers/industries')
    return response.data
  },

  getPowerPlants: async (): Promise<GeoJSONLayer> => {
    const response = await api.get('/layers/power-plants')
    return response.data
  },

  getRefineries: async (): Promise<GeoJSONLayer> => {
    const response = await api.get('/layers/refineries')
    return response.data
  },

  getPopulationDensity: async (): Promise<WMSLayer> => {
    const response = await api.get('/layers/population-density')
    return response.data
  },

  getPopulationPoints: async (): Promise<GeoJSONLayer> => {
    const response = await api.get('/layers/population-points')
    return response.data
  },

  getPopulationExposure: async () => {
    const response = await api.get('/layers/population-exposure')
    return response.data
  },

  getSatelliteNO2: async (): Promise<WMSLayer> => {
    const response = await api.get('/layers/satellite/no2')
    return response.data
  },

  getSatelliteSO2: async (): Promise<WMSLayer> => {
    const response = await api.get('/layers/satellite/so2')
    return response.data
  },

  getSatelliteAOD: async (): Promise<WMSLayer> => {
    const response = await api.get('/layers/satellite/aod')
    return response.data
  },

  getLandTemperature: async (): Promise<WMSLayer> => {
    const response = await api.get('/layers/land-temperature')
    return response.data
  },

  getWindClimate: async (): Promise<WMSLayer> => {
    const response = await api.get('/layers/wind-climate')
    return response.data
  },

  getCropBurning: async (days: number = 7): Promise<GeoJSONLayer> => {
    const response = await api.get('/layers/crop-burning', { params: { days } })
    return response.data
  },

  getFireDensity: async (dateFrom?: string, dateTo?: string) => {
    const response = await api.get('/layers/fire-density', { params: { date_from: dateFrom, date_to: dateTo } })
    return response.data
  },

  getAQIValidation: async () => {
    const response = await api.get('/layers/aqi-validation')
    return response.data
  },

  getBhuvanAOD: async (): Promise<WMSLayer> => {
    const response = await api.get('/layers/bhuvan-aod')
    return response.data
  },
}

// Tile Endpoints
export const tilesAPI = {
  getHeatmapTileURL: (z: number, x: number, y: number, layer: string = 'pollution'): string => {
    return `${API_BASE_URL}/tiles/heatmap/${z}/${x}/${y}.png?layer=${layer}`
  },

  getVectorTileURL: (z: number, x: number, y: number, layer: string = 'sensors'): string => {
    return `${API_BASE_URL}/tiles/vector/${z}/${x}/${y}.geojson?layer=${layer}`
  },
}

// Health Check
export const healthAPI = {
  check: async () => {
    const response = await api.get('/health')
    return response.data
  },

  getInfo: async () => {
    const response = await api.get('/api/info')
    return response.data
  },
}

export default api
