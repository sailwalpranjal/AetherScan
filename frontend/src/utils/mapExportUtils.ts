// Map Export Utilities - Capture map screenshots for PDF reports
import type { MapRef } from 'react-map-gl/maplibre'
import type { RefObject } from 'react'
import type { LayerConfig } from '@/lib/types'

/**
 * Wait for all map tiles and layers to load
 * Critical for capturing complete map screenshots
 */
export async function waitForMapIdle(
  mapRef: RefObject<MapRef>,
  timeout: number = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!mapRef.current) {
      reject(new Error('Map reference is null'))
      return
    }

    const map = mapRef.current.getMap()
    if (!map) {
      reject(new Error('Map not initialized'))
      return
    }

    // Check if map is already idle
    if (map.loaded() && !map.isMoving()) {
      resolve()
      return
    }

    // Set timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      map.off('idle', idleHandler)
      reject(new Error('Map idle timeout - tiles may not have loaded'))
    }, timeout)

    // Wait for idle event
    const idleHandler = () => {
      clearTimeout(timeoutId)
      resolve()
    }

    map.once('idle', idleHandler)
  })
}

/**
 * Capture map canvas as PNG base64 string
 * Core function for map screenshot generation
 */
export async function captureMapCanvas(
  mapRef: RefObject<MapRef>,
  width?: number,
  height?: number
): Promise<string> {
  console.log('=== Map Capture Started ===')

  if (!mapRef.current) {
    console.error('Map reference is null')
    throw new Error('Map reference is null - cannot capture')
  }

  const map = mapRef.current.getMap()
  if (!map) {
    console.error('Map not initialized')
    throw new Error('Map not initialized - cannot capture')
  }

  console.log('Map found, waiting for tiles to load...')

  try {
    // Wait for map to be fully loaded (increased timeout)
    await waitForMapIdle(mapRef, 8000)

    console.log('Map is idle, capturing canvas...')

    // Get canvas element
    const canvas = map.getCanvas()
    if (!canvas) {
      console.error('Map canvas not found')
      throw new Error('Map canvas not found')
    }

    console.log(`Canvas found: ${canvas.width}x${canvas.height}px`)

    // If custom dimensions specified, create resized canvas
    if (width && height && (canvas.width !== width || canvas.height !== height)) {
      console.log(`Resizing canvas to ${width}x${height}px`)
      const resizedCanvas = document.createElement('canvas')
      resizedCanvas.width = width
      resizedCanvas.height = height

      const ctx = resizedCanvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to create canvas context')
      }

      // Draw original canvas onto resized canvas
      ctx.drawImage(canvas, 0, 0, width, height)

      const dataUrl = resizedCanvas.toDataURL('image/png', 1.0)
      console.log(`✓ Map captured successfully (resized): ${dataUrl.substring(0, 50)}...`)
      return dataUrl
    }

    // Return original canvas as base64
    const dataUrl = canvas.toDataURL('image/png', 1.0)
    console.log(`✓ Map captured successfully (original size): ${dataUrl.substring(0, 50)}...`)
    return dataUrl

  } catch (error) {
    console.error('Map capture failed:', error)
    throw new Error(`Map capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Capture map with specific layers enabled
 * Useful for generating layer-specific screenshots
 */
export async function captureMapWithLayers(
  mapRef: RefObject<MapRef>,
  layerIds: string[],
  options: {
    width?: number
    height?: number
    includeControls?: boolean
  } = {}
): Promise<string> {
  if (!mapRef.current) {
    throw new Error('Map reference is null')
  }

  const map = mapRef.current.getMap()
  if (!map) {
    throw new Error('Map not initialized')
  }

  try {
    // Store original layer visibility
    const originalVisibility = new Map<string, string>()

    // Get all layers
    const allLayers = map.getStyle()?.layers || []

    // Store current visibility and set according to layerIds
    allLayers.forEach((layer) => {
      const layerId = layer.id
      const currentVisibility = map.getLayoutProperty(layerId, 'visibility') || 'visible'
      originalVisibility.set(layerId, currentVisibility)

      // Set visibility based on whether layer is in layerIds
      const shouldBeVisible = layerIds.some(id => layerId.includes(id))
      map.setLayoutProperty(
        layerId,
        'visibility',
        shouldBeVisible ? 'visible' : 'none'
      )
    })

    // Wait for render to complete
    await waitForMapIdle(mapRef, 3000)

    // Capture the map
    const imageData = await captureMapCanvas(mapRef, options.width, options.height)

    // Restore original layer visibility
    originalVisibility.forEach((visibility, layerId) => {
      try {
        map.setLayoutProperty(layerId, 'visibility', visibility)
      } catch (e) {
        // Layer may have been removed, ignore error
        console.warn(`Could not restore visibility for layer ${layerId}`)
      }
    })

    return imageData

  } catch (error) {
    console.error('Layer-specific capture failed:', error)
    throw error
  }
}

/**
 * Generate composite map screenshot with all active layers
 * Primary screenshot for PDF reports
 */
export async function captureCompositeMap(
  mapRef: RefObject<MapRef>,
  activeLayers: string[],
  width: number = 800,
  height: number = 600
): Promise<string> {
  console.log('Capturing composite map with layers:', activeLayers)
  return await captureMapWithLayers(mapRef, activeLayers, { width, height })
}

/**
 * Generate map legend as image
 * Creates visual legend showing active layer colors/symbols
 */
export async function generateMapLegend(
  activeLayers: LayerConfig[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof document === 'undefined') {
        reject(new Error('Browser environment required'))
        return
      }

      // Create canvas for legend
      const canvas = document.createElement('canvas')
      const legendWidth = 300
      const legendHeight = Math.max(200, activeLayers.length * 30 + 40)

      canvas.width = legendWidth
      canvas.height = legendHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context failed'))
        return
      }

      // White background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, legendWidth, legendHeight)

      // Border
      ctx.strokeStyle = '#E5E7EB'
      ctx.lineWidth = 2
      ctx.strokeRect(0, 0, legendWidth, legendHeight)

      // Title
      ctx.fillStyle = '#111827'
      ctx.font = 'bold 14px Arial, sans-serif'
      ctx.fillText('Active Layers', 15, 25)

      // Layer items
      let yPos = 50
      activeLayers.forEach((layer) => {
        // Color box based on layer category
        const colorMap: Record<string, string> = {
          pollution: '#DC2626',
          industry: '#EA580C',
          population: '#2563EB',
          satellite: '#7C3AED',
          fire: '#D97706',
          other: '#6B7280',
        }

        ctx.fillStyle = colorMap[layer.category] || '#6B7280'
        ctx.fillRect(15, yPos - 10, 20, 15)

        // Layer name
        ctx.fillStyle = '#374151'
        ctx.font = '11px Arial, sans-serif'
        ctx.fillText(layer.name, 45, yPos)

        yPos += 25
      })

      // Convert to base64
      const base64 = canvas.toDataURL('image/png', 1.0)
      canvas.remove()
      resolve(base64)

    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Capture individual layer with explanation
 * NEW: Captures each layer separately for detailed analysis
 */
export async function captureLayerWithExplanation(
  mapRef: RefObject<MapRef>,
  layerInfo: {
    layerId: string
    layerName: string
    description: string
    category: 'pollution' | 'industry' | 'population' | 'satellite' | 'fire' | 'weather'
  },
  width: number = 800,
  height: number = 600
): Promise<{ image: string; info: typeof layerInfo }> {
  console.log(`Capturing layer: ${layerInfo.layerName}`)

  try {
    const image = await captureMapWithLayers(mapRef, [layerInfo.layerId], { width, height })
    return {
      image,
      info: layerInfo
    }
  } catch (error) {
    console.error(`Failed to capture layer ${layerInfo.layerName}:`, error)
    throw error
  }
}

/**
 * Capture all layers individually
 * NEW: For comprehensive layer-by-layer analysis in PDF
 */
export async function captureAllLayers(
  mapRef: RefObject<MapRef>,
  activeLayers: Array<{
    id: string
    name: string
    description: string
    category: string
  }>,
  width: number = 800,
  height: number = 600
): Promise<Array<{ image: string; info: any }>> {
  console.log(`Capturing ${activeLayers.length} individual layers...`)

  const results: Array<{ image: string; info: any }> = []

  for (const layer of activeLayers) {
    try {
      const captured = await captureLayerWithExplanation(
        mapRef,
        {
          layerId: layer.id,
          layerName: layer.name,
          description: layer.description,
          category: layer.category as any
        },
        width,
        height
      )
      results.push(captured)
      console.log(`✓ Captured: ${layer.name}`)
    } catch (error) {
      console.warn(`⊘ Skipped: ${layer.name} (error: ${error})`)
    }
  }

  console.log(`Successfully captured ${results.length}/${activeLayers.length} layers`)
  return results
}

/**
 * Capture multiple map views for comprehensive analysis
 * Returns object with different map perspectives
 */
export async function captureMultipleMapViews(
  mapRef: RefObject<MapRef>,
  options: {
    composite?: boolean
    industryOnly?: boolean
    aqiOnly?: boolean
    populationOnly?: boolean
    width?: number
    height?: number
  } = {}
): Promise<{
  composite?: string
  industry?: string
  aqi?: string
  population?: string
}> {
  const result: {
    composite?: string
    industry?: string
    aqi?: string
    population?: string
  } = {}

  const width = options.width || 800
  const height = options.height || 600

  try {
    // Composite map (all layers)
    if (options.composite !== false) {
      console.log('Capturing composite map...')
      result.composite = await captureMapCanvas(mapRef, width, height)
    }

    // Industry layer only
    if (options.industryOnly) {
      console.log('Capturing industry layer...')
      result.industry = await captureMapWithLayers(
        mapRef,
        ['power-plants', 'refineries', 'industry'],
        { width, height }
      )
    }

    // AQI/pollution layer only
    if (options.aqiOnly) {
      console.log('Capturing AQI layer...')
      result.aqi = await captureMapWithLayers(
        mapRef,
        ['aqi', 'pollution', 'heatmap'],
        { width, height }
      )
    }

    // Population layer only
    if (options.populationOnly) {
      console.log('Capturing population layer...')
      result.population = await captureMapWithLayers(
        mapRef,
        ['population', 'exposure'],
        { width, height }
      )
    }

    console.log('Map capture complete:', Object.keys(result))
    return result

  } catch (error) {
    console.error('Multiple map views capture failed:', error)
    throw error
  }
}

/**
 * Check if map is ready for capture
 * Diagnostic function to verify map state
 */
export function isMapReadyForCapture(mapRef: RefObject<MapRef>): boolean {
  if (!mapRef.current) {
    console.warn('Map reference is null')
    return false
  }

  const map = mapRef.current.getMap()
  if (!map) {
    console.warn('Map not initialized')
    return false
  }

  if (!map.loaded()) {
    console.warn('Map not fully loaded')
    return false
  }

  if (map.isMoving()) {
    console.warn('Map is currently moving')
    return false
  }

  return true
}
