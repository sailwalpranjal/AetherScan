'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import Map, { NavigationControl, ScaleControl, MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useMapLayers } from '@/hooks/useMapLayers'
import { aqiAPI } from '@/lib/api'
import IndustryDetailsPanel from '../UI/IndustryDetailsPanel'
import LoadingSpinner from '../UI/LoadingSpinner'
import { generateExecutivePDF } from '@/utils/professionalPDFGenerator'
import type { MapViewState, AQIResult } from '@/lib/types'

// Import all layer components
import PollutionHeatmap from '../Layers/PollutionHeatmap'
import StateHeatmap from '../Layers/StateHeatmap'
import OpenAQSensors from '../Layers/OpenAQSensors'
import DynamicAQI from '../Layers/DynamicAQI'
import IndustryOverlay from '../Layers/IndustryOverlay'
import PowerPlants from '../Layers/PowerPlants'
import Refineries from '../Layers/Refineries'
import PopulationExposure from '../Layers/PopulationExposure'
import CropBurning from '../Layers/CropBurning'
import AQIValidation from '../Layers/AQIValidation'
import WindClimate from '../Layers/WindClimate'
import PopulationPoints from '../Layers/PopulationPoints'
import FireDensity from '../Layers/FireDensity'
import SatelliteNO2 from '../Layers/SatelliteNO2'
import SatelliteSO2 from '../Layers/SatelliteSO2'
import SatelliteAOD from '../Layers/SatelliteAOD'
import LandTemperature from '../Layers/LandTemperature'
import WMSOverlay from '../Layers/WMSOverlay'

interface BaseMapProps {
  activeLayers: string[]
  layerOpacity: Record<string, number>
  timeRange: { start: string; end: string }
  viewState?: { latitude: number; longitude: number; zoom: number }
  onViewStateChange?: (viewState: { latitude: number; longitude: number; zoom: number }) => void
  onClick?: (lat: number, lon: number) => void
  selectedIndustry?: any | null
  onSelectIndustry?: (industry: any | null) => void
}

// 100% Free Basemap Styles (No API Keys Required!)
const FREE_BASEMAP_STYLES = [
  {
    id: 'esri-dark',
    name: 'Dark Gray',
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'esri-dark-base': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        },
        'esri-dark-ref': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
        },
      },
      layers: [
        {
          id: 'esri-dark-base-layer',
          type: 'raster',
          source: 'esri-dark-base',
          minzoom: 0,
          maxzoom: 16,
        },
        {
          id: 'esri-dark-ref-layer',
          type: 'raster',
          source: 'esri-dark-ref',
          minzoom: 0,
          maxzoom: 16,
        },
      ],
    },
  },
  {
    id: 'esri-light',
    name: 'Light Gray',
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'esri-light-base': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        },
        'esri-light-ref': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
        },
      },
      layers: [
        {
          id: 'esri-light-base-layer',
          type: 'raster',
          source: 'esri-light-base',
          minzoom: 0,
          maxzoom: 16,
        },
        {
          id: 'esri-light-ref-layer',
          type: 'raster',
          source: 'esri-light-ref',
          minzoom: 0,
          maxzoom: 16,
        },
      ],
    },
  },
  {
    id: 'osm-standard',
    name: 'OpenStreetMap',
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      },
      layers: [
        {
          id: 'osm-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  {
    id: 'satellite',
    name: 'Satellite',
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        },
      },
      layers: [
        {
          id: 'satellite-layer',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 18,
        },
      ],
    },
  },
  {
    id: 'terrain',
    name: 'Terrain',
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'terrain': {
          type: 'raster',
          tiles: [
            'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
        },
      },
      layers: [
        {
          id: 'terrain-layer',
          type: 'raster',
          source: 'terrain',
          minzoom: 0,
          maxzoom: 17,
        },
      ],
    },
  },
  {
    id: 'hybrid',
    name: 'Hybrid',
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
        },
        'labels': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
        },
      },
      layers: [
        {
          id: 'satellite-layer',
          type: 'raster',
          source: 'satellite',
          minzoom: 0,
          maxzoom: 18,
        },
        {
          id: 'labels-layer',
          type: 'raster',
          source: 'labels',
          minzoom: 0,
          maxzoom: 22,
        },
      ],
    },
  },
]

const CLUSTER_LAYERS = ['power-plants-clusters', 'industries-clusters']
const INDIVIDUAL_INDUSTRIAL_LAYERS = [
  'power-plants-unclustered',
  'industries-unclustered',
  'industries-layer',
  'power-plants-layer',
  'refineries-layer',
  'refineries-labels',
]
const INTERACTIVE_LAYERS = [...CLUSTER_LAYERS, ...INDIVIDUAL_INDUSTRIAL_LAYERS]

export default function BaseMap({
  activeLayers,
  layerOpacity,
  timeRange,
  viewState: externalViewState,
  onViewStateChange,
  onClick,
  selectedIndustry: externalSelectedIndustry,
  onSelectIndustry
}: BaseMapProps) {
  const [internalViewState, setInternalViewState] = useState<MapViewState>({
    longitude: 78.9629,
    latitude: 20.5937,
    zoom: 4.5,
    pitch: 0,
    bearing: 0,
  })

  // Use external viewState if provided, otherwise use internal
  const viewState = externalViewState ? {
    ...internalViewState,
    latitude: externalViewState.latitude,
    longitude: externalViewState.longitude,
    zoom: externalViewState.zoom
  } : internalViewState

  const [currentBasemap, setCurrentBasemap] = useState(0)
  const [basemapMenuOpen, setBasemapMenuOpen] = useState(false)
  const [clickedPoint, setClickedPoint] = useState<{ lat: number; lon: number } | null>(null)
  const [aqiData, setAqiData] = useState<AQIResult | null>(null)
  const [internalSelectedIndustry, setInternalSelectedIndustry] = useState<any | null>(null)
  const selectedIndustry = externalSelectedIndustry !== undefined ? externalSelectedIndustry : internalSelectedIndustry
  const setSelectedIndustry = useCallback((ind: any | null) => {
    setInternalSelectedIndustry(ind)
    if (onSelectIndustry) onSelectIndustry(ind)
  }, [onSelectIndustry])
  const [loading, setLoading] = useState(false)
  const [isOutsideIndia, setIsOutsideIndia] = useState(false)
  const [cursor, setCursor] = useState<string>('grab')

  // Map ref for screenshot capture
  const mapRef = useRef<MapRef>(null)

  const { layerData, loading: layersLoading, fetchLayerData } = useMapLayers()

  // Fetch layer data when layers become active
  useEffect(() => {
    activeLayers.forEach((layerId) => {
      if (!layerData[layerId] && !layersLoading[layerId]) {
        fetchLayerData(layerId)
      }
    })
  }, [activeLayers, layerData, layersLoading, fetchLayerData])

  const handleMapClick = useCallback(async (event: any) => {
    try {
      // Safely extract event data with null checks
      if (!event || !event.lngLat) {
        console.warn('Map click event missing lngLat data')
        return
      }

      const { lngLat, features, target } = event
      const lat = lngLat.lat
      const lon = lngLat.lng

      // Validate coordinates
      if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
        console.warn('Invalid coordinates:', { lat, lon })
        return
      }

      // Call parent onClick if provided
      if (onClick) {
        try {
          onClick(lat, lon)
        } catch (error) {
          console.error('Error in parent onClick handler:', error)
        }
      }

      // Check for cluster clicks first
      const clickedCluster = features?.find((f: any) =>
        f && f.layer && (CLUSTER_LAYERS.includes(f.layer.id) || f.properties?.cluster)
      )

      if (clickedCluster && target) {
        const clusterId = clickedCluster.properties?.cluster_id
        const sourceId = clickedCluster.layer?.source
        if (clusterId !== undefined && sourceId) {
          const mapSource: any = target.getSource(sourceId)
          if (mapSource && typeof mapSource.getClusterExpansionZoom === 'function') {
            mapSource.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
              if (err) return
              const coords = clickedCluster.geometry?.coordinates || [lon, lat]
              target.easeTo({
                center: coords,
                zoom: Math.min(zoom, 14),
                duration: 500
              })
            })
            return
          }
        }
      }

      // Check if click was on an individual industry/power plant/refinery feature
      let clickedFeature = null

      if (features && Array.isArray(features) && features.length > 0) {
        clickedFeature = features.find((f: any) =>
          f && f.layer && INDIVIDUAL_INDUSTRIAL_LAYERS.includes(f.layer.id)
        )
      }

      // If no features from event, try querying rendered features around the click point with a small tolerance
      if (!clickedFeature && target && event.point) {
        try {
          const point = event.point
          const bbox: [[number, number], [number, number]] = [
            [point.x - 4, point.y - 4],
            [point.x + 4, point.y + 4]
          ]
          const existingLayers = INDIVIDUAL_INDUSTRIAL_LAYERS.filter(layerId => {
            try {
              return target.getLayer && target.getLayer(layerId)
            } catch {
              return false
            }
          })

          if (existingLayers.length > 0) {
            const queriedFeatures = target.queryRenderedFeatures(bbox, {
              layers: existingLayers
            })
            if (queriedFeatures && Array.isArray(queriedFeatures) && queriedFeatures.length > 0) {
              clickedFeature = queriedFeatures[0]
            }
          }
        } catch (error) {
          console.error('Error querying map features:', error)
        }
      }

      // If clicked on an industry, show industry details
      if (clickedFeature && clickedFeature.properties) {
        const featureLat = clickedFeature.geometry?.coordinates?.[1]
        const featureLon = clickedFeature.geometry?.coordinates?.[0]
        const finalLat = (typeof featureLat === 'number' && !isNaN(featureLat)) ? featureLat : lat
        const finalLon = (typeof featureLon === 'number' && !isNaN(featureLon)) ? featureLon : lon

        setSelectedIndustry({
          ...clickedFeature.properties,
          name: clickedFeature.properties.name || clickedFeature.properties.facility_name || 'Industrial Facility',
          type: clickedFeature.properties.type || clickedFeature.properties.industry_type || (clickedFeature.layer?.id?.includes('power') ? 'Thermal Power Plant' : 'Industrial Facility'),
          latitude: finalLat,
          longitude: finalLon
        })
        setClickedPoint(null)
        setAqiData(null)

        // Also fetch AQI for the industry location
        setLoading(true)
        try {
          const result = await aqiAPI.calculateAtPoint(finalLat, finalLon)
          setAqiData(result)
        } catch (error) {
          console.error('Error calculating AQI for industry:', error)
          setAqiData(null)
        } finally {
          setLoading(false)
        }
        return
      }

      // For regular map clicks (non-industry), let parent handle it
      setSelectedIndustry(null)
      setClickedPoint(null)
      setAqiData(null)
    } catch (error) {
      console.error('Unexpected error in map click handler:', error)
      setLoading(false)
    }
  }, [onClick])

  const handleViewStateChange = useCallback((evt: any) => {
    const newViewState = evt.viewState
    setInternalViewState(newViewState)

    // Check if view is outside India bounds
    // India approximate bounds: Lat 6.5-35.5°N, Lon 68-97.5°E
    const { latitude, longitude } = newViewState
    const outsideBounds =
      latitude < 6.5 || latitude > 35.5 ||
      longitude < 68 || longitude > 97.5

    setIsOutsideIndia(outsideBounds)

    // Call parent onViewStateChange if provided
    if (onViewStateChange) {
      onViewStateChange({
        latitude: newViewState.latitude,
        longitude: newViewState.longitude,
        zoom: newViewState.zoom
      })
    }
  }, [onViewStateChange])

  const switchBasemap = () => {
    setCurrentBasemap((prev) => (prev + 1) % FREE_BASEMAP_STYLES.length)
  }

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleViewStateChange}
        onClick={handleMapClick}
        interactiveLayerIds={INTERACTIVE_LAYERS}
        cursor={cursor}
        onMouseEnter={(e) => {
          if (e.features && e.features.length > 0) {
            setCursor('pointer')
          }
        }}
        onMouseLeave={() => setCursor('grab')}
        mapStyle={FREE_BASEMAP_STYLES[currentBasemap].style as any}
        style={{ width: '100%', height: '100%' }}
        attributionControl={true}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {/* Basemap Switcher - Collapsible Professional Design - High z-index and clear positioning */}
        <div className="absolute top-20 right-4 z-50">
          {/* Toggle Button */}
          <button
            onClick={() => setBasemapMenuOpen(!basemapMenuOpen)}
            className="glass px-4 py-2 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-white/10"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="text-sm font-bold text-white">{FREE_BASEMAP_STYLES[currentBasemap].name}</span>
              <svg className={`w-4 h-4 text-white transition-transform duration-300 ${basemapMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Dropdown Menu */}
          {basemapMenuOpen && (
            <div className="absolute top-14 right-0 w-64 glass rounded-xl shadow-2xl overflow-hidden border border-white/10 animate-slide-down">
              <div className="p-1 space-y-1">
                {FREE_BASEMAP_STYLES.map((style, index) => (
                  <button
                    key={style.id}
                    onClick={() => {
                      setCurrentBasemap(index)
                      setBasemapMenuOpen(false)
                    }}
                    className={`
                      group w-full px-4 py-3 rounded-lg text-left transition-all duration-200
                      ${currentBasemap === index
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg overflow-hidden border-2 ${currentBasemap === index ? 'border-white' : 'border-white/20'} transition-all duration-200`}>
                          {/* Basemap Preview Icons */}
                          {index === 0 && <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800" />}
                          {index === 1 && <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-100" />}
                          {index === 2 && <div className="w-full h-full bg-gradient-to-br from-green-200 to-blue-200" />}
                          {index === 3 && <div className="w-full h-full bg-gradient-to-br from-green-700 to-blue-700" />}
                          {index === 4 && <div className="w-full h-full bg-gradient-to-br from-amber-700 to-green-700" />}
                          {index === 5 && <div className="w-full h-full bg-gradient-to-br from-blue-900 via-green-800 to-gray-700" />}
                        </div>
                        <span className="font-semibold text-sm">{style.name}</span>
                      </div>
                      {currentBasemap === index && (
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Render active layers */}
        {activeLayers.includes('pollution-heatmap') && layerData['pollution-heatmap'] && (
          <PollutionHeatmap
            data={layerData['pollution-heatmap']}
            opacity={layerOpacity['pollution-heatmap'] ?? 0.7}
          />
        )}

        {activeLayers.includes('state-heatmap') && layerData['state-heatmap'] && (
          <StateHeatmap
            data={layerData['state-heatmap']}
            opacity={layerOpacity['state-heatmap'] ?? 0.8}
          />
        )}

        {activeLayers.includes('sensors') && layerData['sensors'] && (
          <OpenAQSensors
            data={layerData['sensors']}
            opacity={layerOpacity['sensors'] ?? 1.0}
          />
        )}

        {activeLayers.includes('aqi-heatmap') && layerData['aqi-heatmap'] && (
          <DynamicAQI
            data={layerData['aqi-heatmap']}
            opacity={layerOpacity['aqi-heatmap'] ?? 0.7}
          />
        )}

        {activeLayers.includes('industries') && layerData['industries'] && (
          <IndustryOverlay
            data={layerData['industries']}
            opacity={layerOpacity['industries'] ?? 0.9}
          />
        )}

        {activeLayers.includes('power-plants') && layerData['power-plants'] && (
          <PowerPlants
            data={layerData['power-plants']}
            opacity={layerOpacity['power-plants'] ?? 1.0}
          />
        )}

        {activeLayers.includes('refineries') && layerData['refineries'] && (
          <Refineries
            data={layerData['refineries']}
            opacity={layerOpacity['refineries'] ?? 1.0}
          />
        )}

        {activeLayers.includes('population-exposure') && layerData['population-exposure'] && (
          <PopulationExposure
            data={layerData['population-exposure']}
            opacity={layerOpacity['population-exposure'] ?? 0.8}
          />
        )}

        {activeLayers.includes('crop-burning') && layerData['crop-burning'] && (
          <CropBurning
            data={layerData['crop-burning']}
            opacity={layerOpacity['crop-burning'] ?? 1.0}
          />
        )}

        {activeLayers.includes('aqi-validation') && layerData['aqi-validation'] && (
          <AQIValidation
            data={layerData['aqi-validation']}
            opacity={layerOpacity['aqi-validation'] ?? 0.8}
          />
        )}

        {activeLayers.includes('wind-climate') && layerData['wind-climate'] && (
          <WindClimate
            data={layerData['wind-climate']}
            opacity={layerOpacity['wind-climate'] ?? 0.6}
          />
        )}

        {activeLayers.includes('population-points') && layerData['population-points'] && (
          <PopulationPoints
            data={layerData['population-points']}
            opacity={layerOpacity['population-points'] ?? 0.8}
          />
        )}

        {/* Population Density uses same component as Population Points */}
        {activeLayers.includes('population-density') && layerData['population-density'] && (
          layerData['population-density'].type === 'wms' ? (
            <WMSOverlay
              id="population-density"
              data={layerData['population-density']}
              opacity={layerOpacity['population-density'] ?? 0.6}
            />
          ) : (
            <PopulationPoints
              data={layerData['population-density']}
              opacity={layerOpacity['population-density'] ?? 0.6}
            />
          )
        )}

        {activeLayers.includes('fire-density') && layerData['fire-density'] && (
          <FireDensity
            data={layerData['fire-density']}
            opacity={layerOpacity['fire-density'] ?? 0.7}
          />
        )}

        {/* Satellite Layers */}
        {activeLayers.includes('satellite-no2') && layerData['satellite-no2'] && (
          layerData['satellite-no2'].type === 'wms' ? (
            <WMSOverlay
              id="satellite-no2"
              data={layerData['satellite-no2']}
              opacity={layerOpacity['satellite-no2'] ?? 0.7}
            />
          ) : (
            <SatelliteNO2
              data={layerData['satellite-no2']}
              opacity={layerOpacity['satellite-no2'] ?? 0.7}
            />
          )
        )}

        {activeLayers.includes('satellite-so2') && layerData['satellite-so2'] && (
          layerData['satellite-so2'].type === 'wms' ? (
            <WMSOverlay
              id="satellite-so2"
              data={layerData['satellite-so2']}
              opacity={layerOpacity['satellite-so2'] ?? 0.7}
            />
          ) : (
            <SatelliteSO2
              data={layerData['satellite-so2']}
              opacity={layerOpacity['satellite-so2'] ?? 0.7}
            />
          )
        )}

        {activeLayers.includes('satellite-aod') && layerData['satellite-aod'] && (
          layerData['satellite-aod'].type === 'wms' ? (
            <WMSOverlay
              id="satellite-aod"
              data={layerData['satellite-aod']}
              opacity={layerOpacity['satellite-aod'] ?? 0.7}
            />
          ) : (
            <SatelliteAOD
              data={layerData['satellite-aod']}
              opacity={layerOpacity['satellite-aod'] ?? 0.7}
            />
          )
        )}

        {activeLayers.includes('land-temperature') && layerData['land-temperature'] && (
          <LandTemperature
            data={layerData['land-temperature']}
            opacity={layerOpacity['land-temperature'] ?? 0.6}
          />
        )}
      </Map>

      {/* Out of India Bounds Warning */}
      {isOutsideIndia && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="glass px-6 py-3 rounded-xl border-2 border-orange-500/50 bg-orange-500/10 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-bold text-orange-300">Outside India Coverage Area</p>
                <p className="text-xs text-orange-200/80">AQI data is only available within India</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Industry Details Panel */}
      {selectedIndustry && (
        <div className="absolute top-20 right-2 sm:right-4 z-20 max-w-[calc(100vw-1rem)] sm:max-w-md max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {loading ? (
            <div className="glass p-4 rounded-lg">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            <IndustryDetailsPanel
              data={selectedIndustry}
              aqiData={aqiData}
              onClose={() => {
                setSelectedIndustry(null)
                setAqiData(null)
              }}
              onDownloadReport={async () => {
                try {
                  await generateExecutivePDF(selectedIndustry, aqiData, mapRef)
                } catch (error) {
                  console.error('Error generating PDF:', error)
                  alert('PDF generation failed. Please try again.')
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
