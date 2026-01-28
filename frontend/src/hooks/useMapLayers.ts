import { useState, useEffect, useCallback } from 'react'
import { layersAPI } from '@/lib/api'
import type { LayerConfig } from '@/lib/types'

export const AVAILABLE_LAYERS: LayerConfig[] = [
  {
    id: 'pollution-heatmap',
    name: 'National Pollution Heatmap',
    description: 'Real-time pollution heatmap from OpenAQ sensors',
    type: 'heatmap',
    category: 'pollution',
    defaultOpacity: 0.7,
    visible: true,
  },
  {
    id: 'state-heatmap',
    name: 'State-wise Pollution',
    description: 'Pollution aggregated by state',
    type: 'geojson',
    category: 'pollution',
    defaultOpacity: 0.8,
    visible: false,
  },
  {
    id: 'aqi-heatmap',
    name: 'Dynamic AQI Heatmap',
    description: 'Computed AQI heatmap',
    type: 'deck',
    category: 'pollution',
    defaultOpacity: 0.7,
    visible: false,
  },
  {
    id: 'sensors',
    name: 'Sensor Stations',
    description: 'OpenAQ monitoring stations',
    type: 'geojson',
    category: 'other',
    defaultOpacity: 1.0,
    visible: false,
  },
  {
    id: 'industries',
    name: 'Industries Overlay',
    description: 'Power plants, refineries, and factories',
    type: 'geojson',
    category: 'industry',
    defaultOpacity: 0.9,
    visible: false,
  },
  {
    id: 'power-plants',
    name: 'Power Plants',
    description: 'Thermal power plant locations',
    type: 'geojson',
    category: 'industry',
    defaultOpacity: 1.0,
    visible: false,
  },
  {
    id: 'refineries',
    name: 'Refineries',
    description: 'Oil refinery locations',
    type: 'geojson',
    category: 'industry',
    defaultOpacity: 1.0,
    visible: false,
  },
  {
    id: 'population-density',
    name: 'Population Density',
    description: 'Population density from Bhuvan',
    type: 'wms',
    category: 'population',
    defaultOpacity: 0.6,
    visible: false,
  },
  {
    id: 'population-exposure',
    name: 'Population Exposure Risk',
    description: 'Population exposure to pollution',
    type: 'deck',
    category: 'population',
    defaultOpacity: 0.8,
    visible: false,
  },
  {
    id: 'satellite-no2',
    name: 'Satellite NO₂',
    description: 'Nitrogen dioxide from satellite',
    type: 'wms',
    category: 'satellite',
    defaultOpacity: 0.7,
    visible: false,
  },
  {
    id: 'satellite-so2',
    name: 'Satellite SO₂',
    description: 'Sulfur dioxide from satellite',
    type: 'wms',
    category: 'satellite',
    defaultOpacity: 0.7,
    visible: false,
  },
  {
    id: 'satellite-aod',
    name: 'Satellite AOD',
    description: 'Aerosol optical depth',
    type: 'wms',
    category: 'satellite',
    defaultOpacity: 0.7,
    visible: false,
  },
  {
    id: 'land-temperature',
    name: 'Land Temperature',
    description: 'Land surface temperature',
    type: 'wms',
    category: 'satellite',
    defaultOpacity: 0.6,
    visible: false,
  },
  {
    id: 'wind-climate',
    name: 'Wind & Climate',
    description: 'Wind direction and climate data',
    type: 'wms',
    category: 'other',
    defaultOpacity: 0.6,
    visible: false,
  },
  {
    id: 'crop-burning',
    name: 'Crop Burning Fires',
    description: 'Active fire detections from NASA FIRMS',
    type: 'geojson',
    category: 'fire',
    defaultOpacity: 1.0,
    visible: false,
  },
  {
    id: 'aqi-validation',
    name: 'AQI Validation',
    description: 'Cross-validation with fire data',
    type: 'geojson',
    category: 'other',
    defaultOpacity: 0.8,
    visible: false,
  },
  {
    id: 'population-points',
    name: 'Population Points',
    description: 'Population distribution as points',
    type: 'geojson',
    category: 'population',
    defaultOpacity: 0.8,
    visible: false,
  },
  {
    id: 'fire-density',
    name: 'Fire Density Grid',
    description: 'Grid-based fire density analysis',
    type: 'deck',
    category: 'fire',
    defaultOpacity: 0.7,
    visible: false,
  },
]

export function useMapLayers() {
  const [layerData, setLayerData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fetchLayerData = useCallback(async (layerId: string) => {
    setLoading((prev) => ({ ...prev, [layerId]: true }))
    setErrors((prev) => ({ ...prev, [layerId]: '' }))

    try {
      let data
      switch (layerId) {
        case 'pollution-heatmap':
          data = await layersAPI.getPollutionHeatmap()
          break
        case 'state-heatmap':
          data = await layersAPI.getStateHeatmap()
          break
        case 'aqi-heatmap':
          data = await layersAPI.getAQIHeatmap()
          break
        case 'sensors':
          data = await layersAPI.getSensors()
          break
        case 'industries':
          data = await layersAPI.getIndustries()
          break
        case 'power-plants':
          data = await layersAPI.getPowerPlants()
          break
        case 'refineries':
          data = await layersAPI.getRefineries()
          break
        case 'population-density':
          data = await layersAPI.getPopulationDensity()
          break
        case 'population-exposure':
          data = await layersAPI.getPopulationExposure()
          break
        case 'satellite-no2':
          data = await layersAPI.getSatelliteNO2()
          break
        case 'satellite-so2':
          data = await layersAPI.getSatelliteSO2()
          break
        case 'satellite-aod':
          data = await layersAPI.getSatelliteAOD()
          break
        case 'land-temperature':
          data = await layersAPI.getLandTemperature()
          break
        case 'wind-climate':
          data = await layersAPI.getWindClimate()
          break
        case 'crop-burning':
          data = await layersAPI.getCropBurning()
          break
        case 'aqi-validation':
          data = await layersAPI.getAQIValidation()
          break
        case 'population-points':
          data = await layersAPI.getPopulationPoints()
          break
        case 'fire-density':
          data = await layersAPI.getFireDensity()
          break
        default:
          throw new Error(`Unknown layer: ${layerId}`)
      }

      setLayerData((prev) => ({ ...prev, [layerId]: data }))
    } catch (error: any) {
      console.error(`Error fetching layer ${layerId}:`, error)
      setErrors((prev) => ({ ...prev, [layerId]: error.message || 'Failed to load layer' }))
    } finally {
      setLoading((prev) => ({ ...prev, [layerId]: false }))
    }
  }, [])

  const refreshLayer = useCallback((layerId: string) => {
    fetchLayerData(layerId)
  }, [fetchLayerData])

  return {
    layerData,
    loading,
    errors,
    fetchLayerData,
    refreshLayer,
    availableLayers: AVAILABLE_LAYERS,
  }
}
