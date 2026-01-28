// Data Validation Utilities - Ensure data quality for PDF reports

/**
 * AQI Data Interface (matching actual API response)
 */
export interface AQIData {
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
  data_source?: string
  timestamp?: string
}

/**
 * Validation Result Interface
 */
export interface ValidationResult {
  isValid: boolean
  missingFields: string[]
  dataQuality: 'high' | 'medium' | 'low' | 'none'
  warnings: string[]
  errors: string[]
}

/**
 * AQI Normalization Result
 */
export interface AQINormalizationResult {
  value: number
  isValid: boolean
  explanation: string
  category: 'valid' | 'no_data' | 'out_of_range' | 'sensor_error'
}

/**
 * Data Provenance Information
 */
export interface DataProvenance {
  source: 'aqicn' | 'openaq' | 'cpcb' | 'unknown'
  timestamp: string
  pollutantsAvailable: string[]
  forecastAvailable: boolean
  measurementType: 'real-time' | 'forecast' | 'modeled' | 'unknown'
}

/**
 * Validate AQI data completeness and quality
 * Critical for ensuring PDF contains real data
 */
export function validateAQIData(aqiData: AQIData | null): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    missingFields: [],
    dataQuality: 'none',
    warnings: [],
    errors: [],
  }

  // Null check
  if (!aqiData) {
    result.errors.push('AQI data is null or undefined')
    return result
  }

  // Check required fields
  if (typeof aqiData.aqi !== 'number') {
    result.missingFields.push('aqi')
    result.errors.push('AQI value missing')
  }

  if (!aqiData.category) {
    result.missingFields.push('category')
    result.warnings.push('Category missing')
  }

  if (!aqiData.dominant_pollutant) {
    result.missingFields.push('dominant_pollutant')
    result.warnings.push('Dominant pollutant not specified')
  }

  // Check for pollutant data (either breakdowns OR pollutants)
  const data = aqiData as any
  const hasBreakdowns = aqiData.breakdowns && Object.keys(aqiData.breakdowns).length > 0
  const hasPollutants = data.pollutants && Object.keys(data.pollutants).length > 0

  if (!hasBreakdowns && !hasPollutants) {
    result.missingFields.push('pollutant_data')
    result.errors.push('No pollutant data available')
  }

  // Check AQI validity
  const aqiCheck = normalizeAQI(aqiData.aqi)
  if (!aqiCheck.isValid) {
    result.warnings.push(aqiCheck.explanation)
  }

  // Determine data quality
  if (result.errors.length > 0) {
    result.dataQuality = 'none'
    result.isValid = false
  } else if (result.missingFields.length === 0 && aqiCheck.isValid) {
    result.dataQuality = 'high'
    result.isValid = true
  } else if (result.missingFields.length <= 2) {
    result.dataQuality = 'medium'
    result.isValid = true
  } else {
    result.dataQuality = 'low'
    result.isValid = false
  }

  // Check pollutant data quality
  const extractedPollutants = extractPollutants(aqiData)
  const pollutantCount = Object.keys(extractedPollutants).length

  if (pollutantCount > 0) {
    if (pollutantCount < 3) {
      result.warnings.push(`Only ${pollutantCount} pollutant(s) available - limited analysis possible`)
    }

    // Check for unrealistic values
    Object.entries(extractedPollutants).forEach(([pollutant, concentration]) => {
      if (concentration < 0) {
        result.warnings.push(`Negative concentration detected for ${pollutant}`)
      }
      if (concentration > 10000) {
        result.warnings.push(`Extremely high concentration for ${pollutant} (${concentration}) - may be data error`)
      }
    })
  }

  return result
}

/**
 * Normalize and validate AQI value
 * Handles special cases like AQI 999 (no data)
 */
export function normalizeAQI(aqi: number): AQINormalizationResult {
  // AQI 999: AQICN API standard "no data" code
  if (aqi === 999) {
    return {
      value: aqi,
      isValid: false,
      explanation: 'No air quality monitoring stations available in this area. AQI could not be determined from real sensor data.',
      category: 'no_data',
    }
  }

  // AQI out of valid range (0-500)
  if (aqi > 500) {
    return {
      value: aqi,
      isValid: false,
      explanation: `AQI value (${aqi}) exceeds valid range (0-500). This may indicate a data quality issue or sensor error.`,
      category: 'out_of_range',
    }
  }

  // Negative AQI (sensor error)
  if (aqi < 0) {
    return {
      value: aqi,
      isValid: false,
      explanation: `Negative AQI value (${aqi}) detected. This indicates a sensor or calculation error.`,
      category: 'sensor_error',
    }
  }

  // Valid AQI
  return {
    value: aqi,
    isValid: true,
    explanation: 'AQI value is within valid range (0-500)',
    category: 'valid',
  }
}

/**
 * Check if temporal/forecast data is available
 * Determines whether 24-hour analysis can be performed
 */
export function hasTemporalData(aqiData: AQIData | null): boolean {
  if (!aqiData) return false

  // Check if forecast data is present in the response
  // Note: AQICN API includes forecast in separate field
  const data = aqiData as any

  if (data.forecast && Array.isArray(data.forecast) && data.forecast.length > 0) {
    return true
  }

  if (data.forecasts && Array.isArray(data.forecasts) && data.forecasts.length > 0) {
    return true
  }

  return false
}

/**
 * Extract data provenance information
 * Critical for methodology documentation
 */
export function getDataProvenance(aqiData: AQIData | null): DataProvenance {
  const defaultProvenance: DataProvenance = {
    source: 'unknown',
    timestamp: new Date().toISOString(),
    pollutantsAvailable: [],
    forecastAvailable: false,
    measurementType: 'unknown',
  }

  if (!aqiData) {
    return defaultProvenance
  }

  // Extract source from data_source field or infer
  let source: DataProvenance['source'] = 'unknown'
  if (aqiData.data_source) {
    const ds = aqiData.data_source.toLowerCase()
    if (ds.includes('aqicn')) source = 'aqicn'
    else if (ds.includes('openaq')) source = 'openaq'
    else if (ds.includes('cpcb')) source = 'cpcb'
  }

  // Extract pollutants
  const pollutantsAvailable = aqiData.breakdowns
    ? Object.keys(aqiData.breakdowns)
    : []

  // Check for forecast
  const forecastAvailable = hasTemporalData(aqiData)

  // Determine measurement type
  let measurementType: DataProvenance['measurementType'] = 'unknown'
  if (source === 'aqicn' && aqiData.aqi !== 999) {
    measurementType = 'real-time'
  } else if (source === 'openaq') {
    measurementType = 'real-time'
  } else if (forecastAvailable) {
    measurementType = 'forecast'
  }

  return {
    source,
    timestamp: aqiData.timestamp || new Date().toISOString(),
    pollutantsAvailable,
    forecastAvailable,
    measurementType,
  }
}

/**
 * Extract pollutants from AQI data
 * Handles BOTH formats:
 * 1. CPCB format: breakdowns with {concentration, sub_index, category}
 * 2. AQICN format: pollutants with direct values
 */
export function extractPollutants(aqiData: AQIData | null): Record<string, number> {
  if (!aqiData) {
    return {}
  }

  const pollutants: Record<string, number> = {}

  // Try CPCB format (breakdowns) first
  if (aqiData.breakdowns && Object.keys(aqiData.breakdowns).length > 0) {
    Object.entries(aqiData.breakdowns).forEach(([key, value]) => {
      if (value && typeof value.concentration === 'number') {
        pollutants[key.toLowerCase()] = value.concentration
      }
    })
  }

  // Try AQICN format (pollutants) as fallback
  const data = aqiData as any
  if (Object.keys(pollutants).length === 0 && data.pollutants) {
    Object.entries(data.pollutants).forEach(([key, value]) => {
      if (typeof value === 'number') {
        pollutants[key.toLowerCase()] = value
      }
    })
  }

  return pollutants
}

/**
 * Check if pollutant data is sufficient for analysis
 */
export function hasSufficientPollutantData(aqiData: AQIData | null): boolean {
  const pollutants = extractPollutants(aqiData)
  const count = Object.keys(pollutants).length

  // Need at least 3 pollutants for meaningful analysis
  return count >= 3
}

/**
 * Get data quality summary for PDF display
 */
export function getDataQualitySummary(aqiData: AQIData | null): string {
  const validation = validateAQIData(aqiData)
  const provenance = getDataProvenance(aqiData)

  const parts: string[] = []

  // Data source
  parts.push(`Source: ${provenance.source.toUpperCase()}`)

  // Measurement type
  parts.push(`Type: ${provenance.measurementType}`)

  // Data quality
  parts.push(`Quality: ${validation.dataQuality.toUpperCase()}`)

  // Pollutant count
  parts.push(`Pollutants: ${provenance.pollutantsAvailable.length}`)

  // Warnings
  if (validation.warnings.length > 0) {
    parts.push(`Warnings: ${validation.warnings.length}`)
  }

  return parts.join(' | ')
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp?: string): string {
  if (!timestamp) {
    return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  }

  try {
    const date = new Date(timestamp)
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (error) {
    return timestamp
  }
}

/**
 * Realistic pollutant concentration ranges (μg/m³)
 * Used for data sanitization and validation
 */
const REALISTIC_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  pm25: { min: 0, max: 1000, unit: 'μg/m³' },
  pm10: { min: 0, max: 2000, unit: 'μg/m³' },
  no2: { min: 0, max: 500, unit: 'μg/m³' },
  so2: { min: 0, max: 500, unit: 'μg/m³' },
  co: { min: 0, max: 50000, unit: 'μg/m³' },
  o3: { min: 0, max: 600, unit: 'μg/m³' },
  nh3: { min: 0, max: 400, unit: 'μg/m³' },
  pb: { min: 0, max: 10, unit: 'μg/m³' },
}

/**
 * Sanitize pollutant data - remove invalid values
 * Returns only valid, realistic concentrations
 */
export function sanitizePollutants(pollutants: Record<string, number>): {
  clean: Record<string, number>
  removed: string[]
  warnings: string[]
} {
  const clean: Record<string, number> = {}
  const removed: string[] = []
  const warnings: string[] = []

  Object.entries(pollutants).forEach(([key, value]) => {
    const pollutant = key.toLowerCase()
    const range = REALISTIC_RANGES[pollutant]

    // Check for invalid special values
    if (value === -999 || value === 999) {
      removed.push(`${pollutant}: Special "no data" code (${value})`)
      return
    }

    // Check for null, undefined, NaN
    if (value == null || isNaN(value)) {
      removed.push(`${pollutant}: Invalid value (${value})`)
      return
    }

    // Check for negative values
    if (value < 0) {
      removed.push(`${pollutant}: Negative concentration (${value})`)
      return
    }

    // If we have range info, validate against it
    if (range) {
      if (value > range.max) {
        removed.push(`${pollutant}: Exceeds realistic maximum (${value} > ${range.max} ${range.unit})`)
        return
      }

      if (value < range.min) {
        removed.push(`${pollutant}: Below realistic minimum (${value} < ${range.min} ${range.unit})`)
        return
      }

      // Warn for very high values (80% of max)
      if (value > range.max * 0.8) {
        warnings.push(`${pollutant}: Very high concentration (${value} ${range.unit}) - verify data source`)
      }
    } else {
      // Unknown pollutant, but value seems valid
      if (value > 10000) {
        removed.push(`${pollutant}: Unrealistically high value (${value})`)
        return
      }
      warnings.push(`${pollutant}: Unknown pollutant type - range validation skipped`)
    }

    // Value is valid
    clean[pollutant] = value
  })

  return { clean, removed, warnings }
}

/**
 * Calculate data completeness score (0-100%)
 * Based on expected vs. available pollutants
 */
export function calculateDataCompleteness(aqiData: AQIData | null): number {
  if (!aqiData) return 0

  // Expected pollutants for complete air quality monitoring
  const expectedPollutants = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']
  const availablePollutants = extractPollutants(aqiData)
  const sanitized = sanitizePollutants(availablePollutants)

  const validCount = Object.keys(sanitized.clean).length
  const expectedCount = expectedPollutants.length

  const completeness = (validCount / expectedCount) * 100

  return Math.round(completeness)
}

/**
 * Get data quality badge (icon/color indicator)
 */
export function getDataQualityBadge(quality: string): {
  label: string
  color: string
  icon: string
  description: string
} {
  const qualityLower = quality.toLowerCase()

  if (qualityLower === 'high') {
    return {
      label: 'High Quality',
      color: '#059669', // Green
      icon: '✓',
      description: 'Data validated from real-time sensors with complete pollutant coverage',
    }
  } else if (qualityLower === 'medium') {
    return {
      label: 'Medium Quality',
      color: '#D97706', // Orange
      icon: '⚠',
      description: 'Data partially available with some estimated values or missing pollutants',
    }
  } else if (qualityLower === 'low') {
    return {
      label: 'Low Quality',
      color: '#DC2626', // Red
      icon: '!',
      description: 'Limited data availability, significant gaps or estimated values',
    }
  } else {
    return {
      label: 'No Data',
      color: '#6B7280', // Gray
      icon: '✗',
      description: 'No valid air quality data available for this location',
    }
  }
}

/**
 * Comprehensive data cleaning for PDF generation
 * Filters -999, null, undefined, negative, >max values
 * Returns cleaned data with quality report
 */
export function cleanDataForPDF(aqiData: AQIData | null): {
  aqiData: AQIData | null
  pollutants: Record<string, number>
  dataQualityScore: number
  cleaningReport: {
    removedValues: string[]
    warnings: string[]
    usableDataPercentage: number
  }
} | null {
  // Null check
  if (!aqiData) {
    return {
      aqiData: null,
      pollutants: {},
      dataQualityScore: 0,
      cleaningReport: {
        removedValues: ['No AQI data provided'],
        warnings: [],
        usableDataPercentage: 0,
      },
    }
  }

  // Check AQI value itself
  const aqiNorm = normalizeAQI(aqiData.aqi)
  if (!aqiNorm.isValid) {
    return {
      aqiData: null,
      pollutants: {},
      dataQualityScore: 0,
      cleaningReport: {
        removedValues: [aqiNorm.explanation],
        warnings: ['AQI value is invalid - cannot generate report'],
        usableDataPercentage: 0,
      },
    }
  }

  // Extract and sanitize pollutants
  const rawPollutants = extractPollutants(aqiData)
  const { clean, removed, warnings } = sanitizePollutants(rawPollutants)

  // Calculate quality metrics
  const originalCount = Object.keys(rawPollutants).length
  const cleanCount = Object.keys(clean).length
  const usableDataPercentage = originalCount > 0 ? (cleanCount / originalCount) * 100 : 0
  const dataQualityScore = calculateDataCompleteness(aqiData)

  // If no usable pollutant data, return null
  if (cleanCount === 0) {
    return {
      aqiData,
      pollutants: {},
      dataQualityScore: 0,
      cleaningReport: {
        removedValues: removed,
        warnings: warnings.concat(['No usable pollutant data after cleaning']),
        usableDataPercentage: 0,
      },
    }
  }

  console.log(`✓ Data cleaning complete: ${cleanCount}/${originalCount} pollutants valid (${usableDataPercentage.toFixed(0)}%)`)
  if (removed.length > 0) {
    console.warn('Removed invalid values:', removed)
  }
  if (warnings.length > 0) {
    console.warn('Data quality warnings:', warnings)
  }

  return {
    aqiData,
    pollutants: clean,
    dataQualityScore,
    cleaningReport: {
      removedValues: removed,
      warnings,
      usableDataPercentage: Math.round(usableDataPercentage),
    },
  }
}

/**
 * Validate and prepare data for PDF generation
 * Returns null if data is insufficient
 * @deprecated Use cleanDataForPDF instead for comprehensive cleaning
 */
export function prepareDataForPDF(aqiData: AQIData | null): {
  pollutants: Record<string, number>
  validation: ValidationResult
  provenance: DataProvenance
  aqiNormalized: AQINormalizationResult
} | null {
  const validation = validateAQIData(aqiData)

  if (!validation.isValid) {
    console.error('AQI data validation failed:', validation.errors)
    return null
  }

  const pollutants = extractPollutants(aqiData)
  if (Object.keys(pollutants).length === 0) {
    console.error('No pollutant data available')
    return null
  }

  const provenance = getDataProvenance(aqiData)
  const aqiNormalized = normalizeAQI(aqiData!.aqi)

  return {
    pollutants,
    validation,
    provenance,
    aqiNormalized,
  }
}
