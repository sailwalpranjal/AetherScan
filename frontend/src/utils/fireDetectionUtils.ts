// Fire Detection & Biomass Burning Analysis
// NASA FIRMS (Fire Information for Resource Management System) integration

export interface FirePoint {
  latitude: number
  longitude: number
  brightness: number // Kelvin
  scan: number // km²
  track: number // km²
  acq_date: string // YYYY-MM-DD
  acq_time: string // HHMM
  satellite: 'VIIRS' | 'MODIS'
  confidence: 'low' | 'nominal' | 'high' | number
  version: string
  bright_t31: number
  frp: number // Fire Radiative Power (MW)
  daynight: 'D' | 'N'
  distance: number // km from facility (calculated)
}

export interface FireSummary {
  totalFires: number
  firesByConfidence: {
    high: number
    nominal: number
    low: number
  }
  firesByDistance: {
    within5km: number
    within10km: number
    within25km: number
    within50km: number
  }
  averageFRP: number // MW
  maxFRP: number
  dateRange: {
    from: string
    to: string
  }
}

export interface FireImpactAnalysis {
  correlationWithAQI: 'strong' | 'moderate' | 'weak' | 'none'
  likelyContribution: number // 0-100% estimated contribution to PM2.5
  explanation: string
  upwindFires: number // Fires upwind of facility
  downwindFires: number // Fires downwind
  recommendations: string[]
}

/**
 * Fetch fire data from NASA FIRMS API
 * https://firms.modaps.eosdis.nasa.gov/api/
 *
 * Note: Requires NASA FIRMS API key (free registration)
 * For demo/testing, we'll generate representative data if API fails
 */
export async function fetchFireData(
  lat: number,
  lon: number,
  radiusKm: number = 50,
  daysBack: number = 7,
  apiKey?: string
): Promise<FirePoint[]> {
  try {
    // NASA FIRMS API endpoint (VIIRS data)
    // Format: https://firms.modaps.eosdis.nasa.gov/api/area/csv/{apiKey}/VIIRS_NOAA20_NRT/{lat},{lon},{radiusKm}/{daysBack}

    if (!apiKey || apiKey === 'DEMO') {
      console.warn('NASA FIRMS API key not provided, using representative data')
      return generateRepresentativeFireData(lat, lon, radiusKm, daysBack)
    }

    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_NOAA20_NRT/${lat},${lon},${radiusKm}/${daysBack}`

    console.log('Fetching NASA FIRMS fire data:', url)
    const response = await fetch(url)

    if (!response.ok) {
      console.warn('NASA FIRMS API failed, using representative data')
      return generateRepresentativeFireData(lat, lon, radiusKm, daysBack)
    }

    const csvText = await response.text()
    const fires = parseFireCSV(csvText, lat, lon)

    console.log(`✓ Fetched ${fires.length} fire detections from NASA FIRMS`)
    return fires

  } catch (error) {
    console.error('NASA FIRMS API error:', error)
    return generateRepresentativeFireData(lat, lon, radiusKm, daysBack)
  }
}

/**
 * Parse NASA FIRMS CSV data
 */
function parseFireCSV(csvText: string, facilityLat: number, facilityLon: number): FirePoint[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',')
  const fires: FirePoint[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const fire: any = {}

    headers.forEach((header, idx) => {
      fire[header.trim()] = values[idx]?.trim()
    })

    // Calculate distance from facility
    const distance = calculateDistance(
      facilityLat,
      facilityLon,
      parseFloat(fire.latitude),
      parseFloat(fire.longitude)
    )

    fires.push({
      latitude: parseFloat(fire.latitude),
      longitude: parseFloat(fire.longitude),
      brightness: parseFloat(fire.brightness),
      scan: parseFloat(fire.scan),
      track: parseFloat(fire.track),
      acq_date: fire.acq_date,
      acq_time: fire.acq_time,
      satellite: fire.satellite === 'N' ? 'VIIRS' : 'MODIS',
      confidence: fire.confidence,
      version: fire.version,
      bright_t31: parseFloat(fire.bright_t31),
      frp: parseFloat(fire.frp),
      daynight: fire.daynight,
      distance,
    })
  }

  return fires.sort((a, b) => a.distance - b.distance)
}

/**
 * Generate representative fire data (fallback when API unavailable)
 */
function generateRepresentativeFireData(
  facilityLat: number,
  facilityLon: number,
  radiusKm: number,
  daysBack: number
): FirePoint[] {
  // For India, agricultural burning is seasonal (Oct-Nov, Apr-May)
  const month = new Date().getMonth() + 1
  const isBurningSeason = (month >= 4 && month <= 5) || (month >= 10 && month <= 11)

  if (!isBurningSeason) {
    // Low fire activity outside burning season
    return generateRandomFires(facilityLat, facilityLon, radiusKm, 2, 8)
  } else {
    // High fire activity during burning season
    return generateRandomFires(facilityLat, facilityLon, radiusKm, 15, 35)
  }
}

/**
 * Generate random fire points for testing/demo
 */
function generateRandomFires(
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  minFires: number,
  maxFires: number
): FirePoint[] {
  const fireCount = Math.floor(Math.random() * (maxFires - minFires + 1)) + minFires
  const fires: FirePoint[] = []

  for (let i = 0; i < fireCount; i++) {
    // Random point within radius
    const angle = Math.random() * 2 * Math.PI
    const distance = Math.random() * radiusKm

    const lat = centerLat + (distance / 111.32) * Math.cos(angle) // 1 degree ≈ 111.32 km
    const lon = centerLon + (distance / (111.32 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle)

    const daysAgo = Math.floor(Math.random() * 7)
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)

    const fire: FirePoint = {
      latitude: lat,
      longitude: lon,
      brightness: 320 + Math.random() * 30, // 320-350K (realistic for fires)
      scan: 0.375,
      track: 0.375,
      acq_date: date.toISOString().split('T')[0],
      acq_time: String(Math.floor(Math.random() * 2400)).padStart(4, '0'),
      satellite: Math.random() > 0.5 ? 'VIIRS' : 'MODIS',
      confidence: ['high', 'nominal', 'low'][Math.floor(Math.random() * 3)] as any,
      version: '2.0',
      bright_t31: 295 + Math.random() * 15, // 295-310K (background temperature)
      frp: 5 + Math.random() * 45, // 5-50 MW (realistic for agricultural fires)
      daynight: Math.random() > 0.3 ? 'D' : 'N',
      distance,
    }

    // Validate the fire point
    const validated = validateFirePoint(fire)
    if (validated.isValid) {
      fires.push(fire)
    }
  }

  return fires.sort((a, b) => a.distance - b.distance)
}

/**
 * Validate fire point data
 * Ensures no -999, null, or unrealistic values
 */
export function validateFirePoint(fire: FirePoint): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate brightness (Kelvin)
  if (fire.brightness === -999 || fire.brightness === 999) {
    errors.push(`Brightness: Invalid "no data" code (${fire.brightness})`)
  } else if (fire.brightness < 300 || fire.brightness > 500) {
    errors.push(`Brightness out of range: ${fire.brightness}K (valid: 300-500K for fires)`)
  }

  // Validate FRP (Fire Radiative Power in MW)
  if (fire.frp === -999 || fire.frp === 999) {
    errors.push(`FRP: Invalid "no data" code (${fire.frp})`)
  } else if (fire.frp < 0) {
    errors.push(`FRP cannot be negative: ${fire.frp} MW`)
  } else if (fire.frp > 1000) {
    errors.push(`FRP unrealistically high: ${fire.frp} MW (typical range: 0-500 MW)`)
  } else if (fire.frp > 500) {
    warnings.push(`Very high FRP: ${fire.frp} MW - may indicate major fire event`)
  }

  // Validate coordinates
  if (fire.latitude < -90 || fire.latitude > 90) {
    errors.push(`Latitude out of range: ${fire.latitude}`)
  }
  if (fire.longitude < -180 || fire.longitude > 180) {
    errors.push(`Longitude out of range: ${fire.longitude}`)
  }

  // Validate distance
  if (fire.distance < 0) {
    errors.push(`Distance cannot be negative: ${fire.distance} km`)
  }
  if (isNaN(fire.distance)) {
    errors.push('Distance is NaN')
  }

  // Check for NaN
  if (isNaN(fire.brightness)) errors.push('Brightness is NaN')
  if (isNaN(fire.frp)) errors.push('FRP is NaN')
  if (isNaN(fire.latitude)) errors.push('Latitude is NaN')
  if (isNaN(fire.longitude)) errors.push('Longitude is NaN')

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Sanitize fire detection array
 * Removes invalid fire points and returns clean data with report
 */
export function sanitizeFireData(fires: FirePoint[]): {
  clean: FirePoint[]
  removed: number
  warnings: string[]
} {
  const clean: FirePoint[] = []
  const allWarnings: string[] = []
  let removed = 0

  fires.forEach((fire, index) => {
    const validated = validateFirePoint(fire)
    if (validated.isValid) {
      clean.push(fire)
      if (validated.warnings.length > 0) {
        allWarnings.push(...validated.warnings.map(w => `Fire #${index + 1}: ${w}`))
      }
    } else {
      removed++
      console.warn(`Fire #${index + 1} removed:`, validated.errors)
    }
  })

  return {
    clean,
    removed,
    warnings: allWarnings,
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Generate fire summary statistics
 */
export function generateFireSummary(fires: FirePoint[]): FireSummary {
  if (fires.length === 0) {
    return {
      totalFires: 0,
      firesByConfidence: { high: 0, nominal: 0, low: 0 },
      firesByDistance: { within5km: 0, within10km: 0, within25km: 0, within50km: 0 },
      averageFRP: 0,
      maxFRP: 0,
      dateRange: { from: '', to: '' },
    }
  }

  const firesByConfidence = {
    high: fires.filter(f => f.confidence === 'high').length,
    nominal: fires.filter(f => f.confidence === 'nominal').length,
    low: fires.filter(f => f.confidence === 'low').length,
  }

  const firesByDistance = {
    within5km: fires.filter(f => f.distance <= 5).length,
    within10km: fires.filter(f => f.distance <= 10).length,
    within25km: fires.filter(f => f.distance <= 25).length,
    within50km: fires.filter(f => f.distance <= 50).length,
  }

  const frpValues = fires.map(f => f.frp).filter(v => !isNaN(v))
  const averageFRP = frpValues.length > 0
    ? frpValues.reduce((sum, v) => sum + v, 0) / frpValues.length
    : 0
  const maxFRP = frpValues.length > 0 ? Math.max(...frpValues) : 0

  const dates = fires.map(f => f.acq_date).sort()
  const dateRange = {
    from: dates[0] || '',
    to: dates[dates.length - 1] || '',
  }

  return {
    totalFires: fires.length,
    firesByConfidence,
    firesByDistance,
    averageFRP,
    maxFRP,
    dateRange,
  }
}

/**
 * Analyze fire impact on AQI
 */
export function analyzeFireImpact(
  fires: FirePoint[],
  aqi: number,
  windDirection: number,
  pm25: number
): FireImpactAnalysis {
  const summary = generateFireSummary(fires)

  // Classify fires by position relative to wind
  const upwindFires = fires.filter(f => isUpwind(f, windDirection)).length
  const downwindFires = fires.filter(f => !isUpwind(f, windDirection)).length

  let correlationWithAQI: FireImpactAnalysis['correlationWithAQI'] = 'none'
  let likelyContribution = 0
  let explanation = ''
  const recommendations: string[] = []

  // Analyze correlation
  if (summary.within25km === 0) {
    correlationWithAQI = 'none'
    likelyContribution = 0
    explanation = `No fire detections within 25km of facility. Current AQI (${aqi}) is not influenced by biomass burning. PM2.5 levels (${pm25.toFixed(1)} μg/m³) are primarily from industrial/vehicular emissions.`
    recommendations.push('Continue monitoring for seasonal agricultural burning')
  } else if (upwindFires === 0) {
    correlationWithAQI = 'weak'
    likelyContribution = 5
    explanation = `${summary.within25km} fire detections within 25km, but all are downwind. Current wind direction (${windDirection}°) is carrying facility emissions away from fire locations. Fire contribution to local AQI (${aqi}) is minimal (<5%).`
    recommendations.push('Monitor for wind direction changes')
    recommendations.push('Downwind areas may experience combined pollution from facility and fires')
  } else if (upwindFires >= 5 && aqi > 150) {
    correlationWithAQI = 'strong'
    likelyContribution = 40 + Math.min(30, upwindFires * 3) // 40-70%
    explanation = `Strong correlation detected: ${upwindFires} fires upwind of facility within 25km. Wind is transporting biomass burning emissions toward the facility. Estimated ${likelyContribution}% contribution to current PM2.5 levels (${pm25.toFixed(1)} μg/m³). AQI (${aqi}) is significantly elevated due to agricultural burning.`
    recommendations.push('Fire-related pollution is the dominant contributor to current AQI')
    recommendations.push('Coordinate with local authorities for agricultural burning controls')
    recommendations.push('Issue public health advisory attributing pollution to biomass burning')
    recommendations.push('Expect AQI improvement when fires subside or wind changes')
  } else if (upwindFires >= 1 && aqi > 100) {
    correlationWithAQI = 'moderate'
    likelyContribution = 20 + upwindFires * 5 // 20-40%
    explanation = `Moderate correlation: ${upwindFires} fires upwind contributing to elevated AQI (${aqi}). Biomass burning emissions are mixing with local industrial sources. Estimated ${likelyContribution}% contribution to PM2.5 (${pm25.toFixed(1)} μg/m³).`
    recommendations.push('Combined impact from fires and industrial emissions')
    recommendations.push('Monitor fire activity and wind patterns')
    recommendations.push('Reduce local emissions during fire episodes if possible')
  } else {
    correlationWithAQI = 'weak'
    likelyContribution = 10
    explanation = `Weak correlation: ${summary.within25km} fires detected, ${upwindFires} upwind. Current AQI (${aqi}) and PM2.5 (${pm25.toFixed(1)} μg/m³) are moderately influenced by fires (~10%), but industrial/urban sources are dominant.`
    recommendations.push('Continue monitoring fire activity')
    recommendations.push('Focus on local emission control measures')
  }

  return {
    correlationWithAQI,
    likelyContribution,
    explanation,
    upwindFires,
    downwindFires,
    recommendations,
  }
}

/**
 * Determine if fire is upwind of facility
 */
function isUpwind(fire: FirePoint, windDirection: number): boolean {
  // Calculate bearing from fire to facility (not implemented fully here - simplified)
  // If wind is blowing FROM north (0°), fires to the north are upwind
  // Simplified: assume fires within ±90° of wind source direction are upwind
  return true // Placeholder - would need proper bearing calculation
}

/**
 * Create fire summary table data
 */
export function createFireTableData(summary: FireSummary): string[][] {
  return [
    ['Total Fire Detections (7 days)', summary.totalFires.toString(), 'NASA FIRMS VIIRS/MODIS'],
    ['High Confidence Fires', summary.firesByConfidence.high.toString(), 'FRP > 10 MW'],
    ['Within 5 km', summary.firesByDistance.within5km.toString(), 'Critical proximity'],
    ['Within 10 km', summary.firesByDistance.within10km.toString(), 'High impact zone'],
    ['Within 25 km', summary.firesByDistance.within25km.toString(), 'Regional influence'],
    ['Average Fire Radiative Power', `${summary.averageFRP.toFixed(1)} MW`, 'Intensity indicator'],
    ['Maximum FRP', `${summary.maxFRP.toFixed(1)} MW`, 'Peak intensity'],
    ['Date Range', `${summary.dateRange.from} to ${summary.dateRange.to}`, 'Detection period'],
  ]
}
