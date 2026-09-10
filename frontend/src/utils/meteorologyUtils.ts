// Meteorology & Wind Analysis Utilities
// NASA POWER API integration for pollution dispersal assessment

export interface MeteoData {
  temperature: number // °C
  humidity: number // %
  pressure: number // hPa
  windSpeed: number // m/s
  windDirection: number // degrees (0-360, 0=North)
  timestamp: string
  source: 'nasa_power' | 'estimated'
}

export interface WindData {
  direction: number // degrees
  speed: number // m/s
  frequency: number // % of time
  timestamp: string
}

export interface DispersalAnalysis {
  dispersalIndex: number // 0-100 (0=stagnant, 100=high dispersal)
  category: 'stagnant' | 'low_dispersal' | 'moderate_dispersal' | 'high_dispersal'
  staying: boolean // true if pollution is staying
  explanation: string
  recommendations: string[]
}

export interface AtmosphericStability {
  stabilityClass: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' // Pasquill-Gifford
  stabilityName: string
  mixingHeight: number // meters
  ventilationCoefficient: number
  impact: string
}

/**
 * Fetch meteorological data from NASA POWER API
 * https://power.larc.nasa.gov/api/
 */
export async function fetchMeteorology(lat: number, lon: number): Promise<MeteoData> {
  try {
    // NASA POWER daily latency is typically 2-3 days.
    // Query a 10-day window ending 2 days ago to guarantee published records.
    const endDate = new Date()
    endDate.setDate(endDate.getDate() - 2)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 10)

    const dateFormat = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '')

    const params = new URLSearchParams({
      parameters: 'T2M,RH2M,PS,WS10M,WD10M',
      community: 'RE',
      longitude: lon.toString(),
      latitude: lat.toString(),
      start: dateFormat(startDate),
      end: dateFormat(endDate),
      format: 'JSON',
    })

    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?${params}`
    const response = await fetch(url)

    if (!response.ok) {
      return getEstimatedMeteorology(lat, lon)
    }

    const data = await response.json()

    // Extract parameters
    const properties = data.properties?.parameter
    if (!properties || !properties.T2M) {
      return getEstimatedMeteorology(lat, lon)
    }

    // Find the latest date with non -999 valid data
    const dates = Object.keys(properties.T2M).sort().reverse()
    const validDate = dates.find(d => {
      const t = properties.T2M?.[d]
      const ws = properties.WS10M?.[d]
      return t !== undefined && t !== null && t !== -999 && t !== 999 &&
             ws !== undefined && ws !== null && ws !== -999 && ws !== 999
    })

    if (!validDate) {
      return getEstimatedMeteorology(lat, lon)
    }

    // Extract raw values for valid date
    const rawTemp = properties.T2M[validDate]
    const rawHumidity = properties.RH2M?.[validDate] ?? 60
    const rawPressure = properties.PS?.[validDate] ?? 1013
    const rawWindSpeed = properties.WS10M[validDate]
    const rawWindDirection = properties.WD10M?.[validDate] ?? 180

    // Validate and sanitize NASA POWER data
    const validatedData = validateMeteoData({
      temperature: rawTemp,
      humidity: rawHumidity,
      pressure: rawPressure,
      windSpeed: rawWindSpeed,
      windDirection: rawWindDirection,
      timestamp: new Date().toISOString(),
      source: 'nasa_power',
    })

    if (!validatedData.isValid) {
      return getEstimatedMeteorology(lat, lon)
    }

    return validatedData.data

  } catch (error) {
    console.error('NASA POWER API error:', error)
    return getEstimatedMeteorology(lat, lon)
  }
}

/**
 * Get estimated meteorology based on location (fallback)
 */
function getEstimatedMeteorology(lat: number, lon: number): MeteoData {
  // Deterministic climatological reference for Indian subcontinent based on latitude, month, and hour
  const month = new Date().getMonth() + 1 // 1-12
  const hour = new Date().getHours()

  // Determine season
  const isSummer = month >= 3 && month <= 6
  const isMonsoon = month >= 7 && month <= 9
  const isWinter = month >= 11 || month <= 2

  // Latitude adjustment: higher latitudes (North India) have greater seasonal temperature range
  const latFactor = Math.max(0, Math.min(1, (lat - 10) / 20)) // 0 (South) to 1 (North)

  let temp = 25.0
  let humidity = 60.0
  let windSpeed = 2.5
  let windDirection = 270 // Westerly

  if (isSummer) {
    temp = 32.0 + latFactor * 6.0 // 32-38°C
    humidity = 45.0 - latFactor * 15.0 // 30-45%
    windSpeed = 2.8
    windDirection = 290
  } else if (isMonsoon) {
    temp = 28.0 - latFactor * 2.0 // 26-28°C
    humidity = 82.0
    windSpeed = 4.2 // Stronger monsoon winds
    windDirection = 210 // South-westerly
  } else if (isWinter) {
    temp = 24.0 - latFactor * 10.0 // 14-24°C
    humidity = 55.0
    windSpeed = 1.8
    windDirection = 315 // North-westerly
  } else {
    // Post-monsoon
    temp = 28.0 - latFactor * 3.0
    humidity = 65.0
    windSpeed = 2.2
    windDirection = 270
  }

  // Diurnal sinusoidal variation (peak at 14:00, coolest at 05:00)
  const diurnalAngle = ((hour - 5) / 24) * 2 * Math.PI
  const tempOffset = Math.sin(diurnalAngle) * 4.0 // ±4°C diurnal swing
  temp += tempOffset
  humidity -= tempOffset * 2.0 // Inversely proportional to temperature

  temp = Math.max(8, Math.min(48, Math.round(temp * 10) / 10))
  humidity = Math.max(15, Math.min(98, Math.round(humidity)))
  windSpeed = Math.max(0.5, Math.min(15, Math.round(windSpeed * 10) / 10))
  windDirection = Math.round(windDirection) % 360

  const estimatedData: MeteoData = {
    temperature: temp,
    humidity,
    pressure: 1013.2,
    windSpeed,
    windDirection,
    timestamp: new Date().toISOString(),
    source: 'estimated',
  }

  // Validate estimated data
  const validated = validateMeteoData(estimatedData)
  if (!validated.isValid) {
    console.error('CRITICAL: Estimated meteorology data validation failed', validated.errors)
    // Return safe fallback values
    return {
      temperature: 25,
      humidity: 60,
      pressure: 1013,
      windSpeed: 2.5,
      windDirection: 180,
      timestamp: new Date().toISOString(),
      source: 'estimated',
    }
  }

  return estimatedData
}

/**
 * Validate meteorological data
 * Ensures no -999, null, or unrealistic values
 */
export function validateMeteoData(data: MeteoData): {
  isValid: boolean
  data: MeteoData
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Realistic ranges for India
  const METEO_RANGES = {
    temperature: { min: -10, max: 55, unit: '°C' }, // Extreme range for India
    humidity: { min: 0, max: 100, unit: '%' },
    pressure: { min: 950, max: 1050, unit: 'hPa' },
    windSpeed: { min: 0, max: 20, unit: 'm/s' }, // Realistic max (exclude cyclone conditions)
    windDirection: { min: 0, max: 360, unit: 'degrees' },
  }

  // Check for special "no data" codes
  if (data.temperature === -999 || data.temperature === 999) {
    errors.push(`Temperature: Invalid "no data" code (${data.temperature})`)
  }
  if (data.windSpeed === -999 || data.windSpeed === 999) {
    errors.push(`Wind speed: Invalid "no data" code (${data.windSpeed})`)
  }

  // Validate temperature
  if (data.temperature < METEO_RANGES.temperature.min || data.temperature > METEO_RANGES.temperature.max) {
    errors.push(`Temperature out of range: ${data.temperature}°C (valid: ${METEO_RANGES.temperature.min}-${METEO_RANGES.temperature.max}°C)`)
  }

  // Validate humidity
  if (data.humidity < METEO_RANGES.humidity.min || data.humidity > METEO_RANGES.humidity.max) {
    errors.push(`Humidity out of range: ${data.humidity}% (valid: 0-100%)`)
  }

  // Validate pressure
  if (data.pressure < METEO_RANGES.pressure.min || data.pressure > METEO_RANGES.pressure.max) {
    errors.push(`Pressure out of range: ${data.pressure} hPa (valid: ${METEO_RANGES.pressure.min}-${METEO_RANGES.pressure.max} hPa)`)
  }

  // Validate wind speed
  if (data.windSpeed < METEO_RANGES.windSpeed.min || data.windSpeed > METEO_RANGES.windSpeed.max) {
    errors.push(`Wind speed out of range: ${data.windSpeed} m/s (valid: ${METEO_RANGES.windSpeed.min}-${METEO_RANGES.windSpeed.max} m/s)`)
  }

  // Validate wind direction
  if (data.windDirection < METEO_RANGES.windDirection.min || data.windDirection >= METEO_RANGES.windDirection.max) {
    errors.push(`Wind direction out of range: ${data.windDirection}° (valid: 0-359°)`)
  }

  // Check for NaN
  if (isNaN(data.temperature)) errors.push('Temperature is NaN')
  if (isNaN(data.humidity)) errors.push('Humidity is NaN')
  if (isNaN(data.pressure)) errors.push('Pressure is NaN')
  if (isNaN(data.windSpeed)) errors.push('Wind speed is NaN')
  if (isNaN(data.windDirection)) errors.push('Wind direction is NaN')

  // Warnings for extreme but valid values
  if (data.temperature > 45) {
    warnings.push(`Very high temperature: ${data.temperature}°C - verify data source`)
  }
  if (data.temperature < 5) {
    warnings.push(`Very low temperature: ${data.temperature}°C - verify data source`)
  }
  if (data.windSpeed > 15) {
    warnings.push(`Very high wind speed: ${data.windSpeed} m/s - possible storm conditions`)
  }

  return {
    isValid: errors.length === 0,
    data,
    errors,
    warnings,
  }
}

/**
 * Calculate pollution dispersal index
 * Based on wind speed and atmospheric stability
 */
export function calculateDispersalIndex(windSpeed: number, temperature: number, hour: number = new Date().getHours()): number {
  // Wind speed contribution (0-60 points)
  let windContribution = 0
  if (windSpeed < 1) {
    windContribution = 0 // Stagnant
  } else if (windSpeed < 2) {
    windContribution = 15 // Very poor dispersal
  } else if (windSpeed < 3) {
    windContribution = 25 // Poor dispersal
  } else if (windSpeed < 5) {
    windContribution = 40 // Moderate dispersal
  } else if (windSpeed < 7) {
    windContribution = 50 // Good dispersal
  } else {
    windContribution = 60 // Excellent dispersal
  }

  // Atmospheric stability contribution (0-40 points)
  const isDaytime = hour >= 6 && hour <= 18
  let stabilityContribution = 0

  if (isDaytime && temperature > 25) {
    stabilityContribution = 40 // Unstable (good mixing)
  } else if (isDaytime) {
    stabilityContribution = 30 // Neutral
  } else if (windSpeed < 2) {
    stabilityContribution = 10 // Stable at night with low wind (poor dispersal)
  } else {
    stabilityContribution = 20 // Neutral at night
  }

  return Math.min(100, windContribution + stabilityContribution)
}

/**
 * Assess pollution dispersal status
 */
export function assessPollutionDispersal(
  windSpeed: number,
  windDirection: number,
  aqi: number,
  temperature: number = 25
): DispersalAnalysis {
  const dispersalIndex = calculateDispersalIndex(windSpeed, temperature)

  let category: DispersalAnalysis['category']
  let staying: boolean
  let explanation: string
  const recommendations: string[] = []

  if (dispersalIndex < 20) {
    category = 'stagnant'
    staying = true
    explanation = `Critical stagnant conditions (Dispersal Index: ${dispersalIndex}/100). Wind speed (${windSpeed.toFixed(1)} m/s) is insufficient for pollutant dispersal. Pollutants are accumulating in the area, leading to elevated AQI (${aqi}). Atmospheric mixing is minimal.`
    recommendations.push('Reduce/halt emission sources during stagnant periods')
    recommendations.push('Issue public health advisory for sensitive groups')
    recommendations.push('Monitor AQI continuously; expect further degradation')
    recommendations.push('Avoid outdoor activities until wind conditions improve')
  } else if (dispersalIndex < 40) {
    category = 'low_dispersal'
    staying = true
    explanation = `Low dispersal conditions (Dispersal Index: ${dispersalIndex}/100). Wind speed (${windSpeed.toFixed(1)} m/s) provides limited pollutant transport. Pollutants are primarily staying in the region with slow dilution. Current AQI (${aqi}) is likely to persist.`
    recommendations.push('Limit non-essential emission activities')
    recommendations.push('Sensitive groups should remain indoors')
    recommendations.push('Increase monitoring frequency')
  } else if (dispersalIndex < 60) {
    category = 'moderate_dispersal'
    staying = false
    explanation = `Moderate dispersal conditions (Dispersal Index: ${dispersalIndex}/100). Wind speed (${windSpeed.toFixed(1)} m/s) from ${getWindDirectionName(windDirection)} provides adequate pollutant transport. Pollutants are being dispersed, though some accumulation may occur. AQI (${aqi}) should gradually improve if emissions are controlled.`
    recommendations.push('Maintain current emission controls')
    recommendations.push('General population can engage in normal outdoor activities with awareness')
    recommendations.push('Continue routine monitoring')
  } else {
    category = 'high_dispersal'
    staying = false
    explanation = `High dispersal conditions (Dispersal Index: ${dispersalIndex}/100). Strong wind speed (${windSpeed.toFixed(1)} m/s) from ${getWindDirectionName(windDirection)} is actively sweeping pollutants away. Excellent atmospheric mixing. Current AQI (${aqi}) is likely influenced more by regional transport than local emissions.`
    recommendations.push('Favorable conditions for emission-intensive activities (if required)')
    recommendations.push('Pollutants are being rapidly diluted and transported downwind')
    recommendations.push('Consider downwind areas may experience transported pollution')
  }

  return {
    dispersalIndex,
    category,
    staying,
    explanation,
    recommendations,
  }
}

/**
 * Get cardinal/intercardinal direction name
 */
export function getWindDirectionName(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round((degrees % 360) / 22.5) % 16
  return directions[index]
}

/**
 * Calculate Pasquill-Gifford atmospheric stability class
 */
export function calculateAtmosphericStability(
  windSpeed: number,
  temperature: number,
  hour: number = new Date().getHours()
): AtmosphericStability {
  const isDaytime = hour >= 6 && hour <= 18
  let stabilityClass: AtmosphericStability['stabilityClass']
  let stabilityName: string
  let mixingHeight: number
  let impact: string

  // Simplified Pasquill-Gifford classification
  if (isDaytime) {
    if (windSpeed < 2) {
      stabilityClass = 'A'
      stabilityName = 'Very Unstable'
      mixingHeight = 2000
      impact = 'Excellent vertical mixing, rapid pollutant dilution'
    } else if (windSpeed < 3) {
      stabilityClass = 'B'
      stabilityName = 'Unstable'
      mixingHeight = 1500
      impact = 'Good vertical mixing, effective pollutant dispersal'
    } else if (windSpeed < 5) {
      stabilityClass = 'C'
      stabilityName = 'Slightly Unstable'
      mixingHeight = 1200
      impact = 'Moderate mixing, normal pollutant dispersal'
    } else {
      stabilityClass = 'D'
      stabilityName = 'Neutral'
      mixingHeight = 1000
      impact = 'Neutral conditions, standard dispersal rates'
    }
  } else {
    // Nighttime
    if (windSpeed < 2) {
      stabilityClass = 'F'
      stabilityName = 'Very Stable'
      mixingHeight = 200
      impact = 'Minimal vertical mixing, pollutant accumulation near ground'
    } else if (windSpeed < 3) {
      stabilityClass = 'E'
      stabilityName = 'Stable'
      mixingHeight = 400
      impact = 'Limited mixing, pollutants trapped in shallow layer'
    } else {
      stabilityClass = 'D'
      stabilityName = 'Neutral'
      mixingHeight = 800
      impact = 'Neutral conditions, moderate dispersal'
    }
  }

  // Ventilation coefficient (mixing height × wind speed)
  const ventilationCoefficient = mixingHeight * windSpeed

  return {
    stabilityClass,
    stabilityName,
    mixingHeight,
    ventilationCoefficient,
    impact,
  }
}

/**
 * Generate wind rose data for 8 cardinal directions
 * This is a simplified version - ideally would use historical data
 */
export function generateWindRoseData(currentWindSpeed: number, currentWindDirection: number): Array<{
  direction: string
  frequency: number // % of time
  avgSpeed: number // m/s
}> {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const currentDir = getWindDirectionName(currentWindDirection)

  return directions.map(dir => {
    // Dominant direction gets 40%, neighbors get 20%, rest distributed
    let frequency = 5 // Base frequency
    if (dir === currentDir) {
      frequency = 40
    } else if (isAdjacentDirection(dir, currentDir)) {
      frequency = 20
    } else {
      frequency = 5
    }

    return {
      direction: dir,
      frequency,
      avgSpeed: dir === currentDir ? currentWindSpeed : currentWindSpeed * 0.7,
    }
  })
}

/**
 * Check if two directions are adjacent
 */
function isAdjacentDirection(dir1: string, dir2: string): boolean {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const idx1 = directions.indexOf(dir1)
  const idx2 = directions.indexOf(dir2)
  if (idx1 === -1 || idx2 === -1) return false

  const diff = Math.abs(idx1 - idx2)
  return diff === 1 || diff === 7 // Adjacent or wrap-around
}

/**
 * Create meteorology summary table data
 */
export function createMeteoTableData(meteo: MeteoData): string[][] {
  return [
    ['Temperature', `${meteo.temperature.toFixed(1)} °C`, meteo.source === 'nasa_power' ? 'NASA POWER' : 'Seasonal Model'],
    ['Wind Speed', `${meteo.windSpeed.toFixed(1)} m/s`, meteo.source === 'nasa_power' ? 'NASA POWER' : 'Seasonal Model'],
    ['Wind Direction', `${meteo.windDirection.toFixed(0)}° (${getWindDirectionName(meteo.windDirection)})`, meteo.source === 'nasa_power' ? 'NASA POWER' : 'Seasonal Model'],
    ['Humidity', `${meteo.humidity.toFixed(0)} %`, meteo.source === 'nasa_power' ? 'NASA POWER' : 'Seasonal Model'],
    ['Pressure', `${meteo.pressure.toFixed(1)} hPa`, meteo.source === 'nasa_power' ? 'NASA POWER' : 'Seasonal Model'],
    ['Last Updated', new Date(meteo.timestamp).toLocaleString('en-IN'), 'System'],
  ]
}

/**
 * Create atmospheric stability table data
 */
export function createStabilityTableData(stability: AtmosphericStability): string[][] {
  return [
    ['Stability Class', `${stability.stabilityClass} (${stability.stabilityName})`, 'Pasquill-Gifford'],
    ['Mixing Height', `${stability.mixingHeight.toFixed(0)} m`, 'Calculated'],
    ['Ventilation Coefficient', `${stability.ventilationCoefficient.toFixed(0)} m²/s`, 'Calculated'],
    ['Impact on Dispersion', stability.impact, 'Assessment'],
  ]
}
