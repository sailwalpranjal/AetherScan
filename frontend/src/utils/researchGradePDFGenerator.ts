// Research-Grade PDF Generator - Publication-Ready Reports
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { MapRef } from 'react-map-gl/maplibre'
import type { RefObject } from 'react'
import {
  generateChartImage,
  createPollutantBarChart,
  createCompliancePieChart,
  createComparisonChart,
  createPercentageDoughnutChart,
  createComplianceTableData,
  createHealthRiskRadarChart,
  createAQICategoryChart,
  createMultiStandardChart,
  createStatisticalChart,
  createExceedanceSeverityChart,
  createWindRoseChart,
  createDispersalChart,
  createFireTimelineChart,
  createFireAQICorrelationChart,
  // NEW ADVANCED CHARTS
  createAQIGaugeChart,
  createComplianceGapChart,
  createPollutantTreemap,
  createAQIWaterfallChart,
  createForecastAreaChart,
  createAQIMeteoOverlay,
  createPollutantBoxPlot,
  createPollutantCorrelationHeatmap,
  createEmissionSourceSankey,
  createDataQualityGauge,
} from './researchChartGenerator'
import {
  fetchMeteorology,
  assessPollutionDispersal,
  calculateAtmosphericStability,
  generateWindRoseData,
  getWindDirectionName,
  createMeteoTableData,
  createStabilityTableData,
  type MeteoData,
  type DispersalAnalysis,
  type AtmosphericStability,
} from './meteorologyUtils'
import {
  fetchFireData,
  generateFireSummary,
  analyzeFireImpact,
  createFireTableData,
  type FirePoint,
  type FireSummary,
  type FireImpactAnalysis,
} from './fireDetectionUtils'
import {
  validateAQIData,
  normalizeAQI,
  getDataProvenance,
  extractPollutants,
  hasSufficientPollutantData,
  getDataQualitySummary,
  formatTimestamp,
  prepareDataForPDF,
  cleanDataForPDF,
  sanitizePollutants,
  calculateDataCompleteness,
  getDataQualityBadge,
  type AQIData,
  type ValidationResult,
  type DataProvenance,
} from './dataValidator'
import { captureMapCanvas, captureAllLayers } from './mapExportUtils'

// Layout constants - STRICT BOUNDARIES
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 15
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
const MAX_LINE_WIDTH = CONTENT_WIDTH - 2 // Safety margin

// Chart sizing - GUARANTEED to fit
const CHART_WIDTH = CONTENT_WIDTH - 5
const CHART_HEIGHT = 70

// ENHANCED Professional Color System
const COLORS = {
  // Primary
  primary: '#1E40AF',
  primaryLight: '#3B82F6',
  primaryDark: '#1E3A8A',

  // Semantic
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0891B2',

  // Text
  text: '#1F2937',
  textLight: '#6B7280',
  textLighter: '#9CA3AF',

  // Borders & Backgrounds
  border: '#E5E7EB',
  borderDark: '#D1D5DB',
  background: '#F9FAFB',

  // Data Quality Badges
  qualityHigh: '#059669',    // Green
  qualityMedium: '#D97706',  // Orange
  qualityLow: '#DC2626',     // Red
  qualityNone: '#6B7280',    // Gray
}

// Types
interface IndustryData {
  name: string
  type?: string
  latitude: number
  longitude: number
  location?: string
  capacity?: string
  [key: string]: any
}

// Note: AQIData interface is now imported from dataValidator.ts
// Note: getPollutants is replaced by extractPollutants from dataValidator.ts

// Hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 }
}

// Safe text wrapper - NEVER exceeds page width
function addSafeText(
  pdf: jsPDF,
  text: string | string[],
  x: number,
  y: number,
  maxWidth: number = MAX_LINE_WIDTH
): number {
  const lines = Array.isArray(text) ? text : [text]
  let currentY = y

  lines.forEach(line => {
    if (!line) {
      currentY += 4
      return
    }

    const wrapped = pdf.splitTextToSize(line, maxWidth)
    wrapped.forEach((wLine: string) => {
      // Check if we need new page
      if (currentY > PAGE_HEIGHT - 20) {
        pdf.addPage()
        currentY = MARGIN
      }
      pdf.text(wLine, x, currentY)
      currentY += 4.5
    })
  })

  return currentY
}

/**
 * Generate Logo
 */
function generateLogo(): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 100
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 300, 0)
    gradient.addColorStop(0, '#1E40AF')
    gradient.addColorStop(1, '#3B82F6')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(0, 0, 300, 100, 12)
    ctx.fill()

    // Icon
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(40, 50, 12, 0, Math.PI * 2)
    ctx.arc(55, 45, 15, 0, Math.PI * 2)
    ctx.arc(70, 50, 12, 0, Math.PI * 2)
    ctx.stroke()

    // Text
    ctx.font = 'bold 32px Arial'
    ctx.fillStyle = '#fff'
    ctx.fillText('AetherScan', 100, 50)
    ctx.font = '14px Arial'
    ctx.fillText('Air Quality Intelligence', 100, 72)

    return canvas.toDataURL('image/png', 1.0)
  } catch (error) {
    console.error('Logo error:', error)
    return ''
  }
}

/**
 * Cover Page - Modern Professional Design
 */
function addCoverPage(pdf: jsPDF, industry: IndustryData, aqiData: AQIData | null) {
  // Modern gradient background (dark blue gradient)
  pdf.setFillColor(15, 23, 42)
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F')

  // Top accent bar (gradient effect with multiple bars)
  for (let i = 0; i < 5; i++) {
    const alpha = 0.8 - (i * 0.15)
    pdf.setFillColor(59, 130, 246, alpha)
    pdf.rect(0, i * 2, PAGE_WIDTH, 2, 'F')
  }

  // Logo with shadow effect
  try {
    const logo = generateLogo()
    if (logo) {
      // Shadow
      pdf.setFillColor(0, 0, 0, 0.2)
      pdf.ellipse((PAGE_WIDTH - 100) / 2 + 50, 48, 52, 18, 'F')
      // Logo
      pdf.addImage(logo, 'PNG', (PAGE_WIDTH - 100) / 2, 25, 100, 33.33)
    }
  } catch (error) {
    console.error('Logo generation failed:', error)
  }

  // Title card with modern styling
  const titleY = 75
  // White background card with shadow
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(MARGIN + 2, titleY + 2, CONTENT_WIDTH - 4, 42, 4, 4, 'F')
  // Main title card
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(MARGIN, titleY, CONTENT_WIDTH, 42, 4, 4, 'F')

  // Title with gradient-like effect
  pdf.setTextColor(30, 64, 175)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text('ENVIRONMENTAL IMPACT ASSESSMENT', PAGE_WIDTH / 2, titleY + 12, { align: 'center' })

  pdf.setFontSize(12)
  pdf.setTextColor(59, 130, 246)
  pdf.text('Air Quality Analysis Report', PAGE_WIDTH / 2, titleY + 21, { align: 'center' })

  // Subtitle
  pdf.setFontSize(9)
  pdf.setTextColor(107, 114, 128)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Research-Grade Assessment | CPCB Standards | WHO Guidelines', PAGE_WIDTH / 2, titleY + 31, { align: 'center' })

  // Facility Information Card (modern two-column layout)
  const infoY = 135
  // Card shadow
  pdf.setFillColor(0, 0, 0, 0.1)
  pdf.roundedRect(MARGIN + 1, infoY + 1, CONTENT_WIDTH - 2, 75, 3, 3, 'F')
  // Main card
  pdf.setFillColor(248, 250, 252)
  pdf.roundedRect(MARGIN, infoY, CONTENT_WIDTH, 75, 3, 3, 'F')

  // Header for info card
  pdf.setFillColor(30, 64, 175)
  pdf.roundedRect(MARGIN, infoY, CONTENT_WIDTH, 10, 3, 3, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.text('FACILITY DETAILS', PAGE_WIDTH / 2, infoY + 7, { align: 'center' })

  let yPos = infoY + 18
  const leftCol = MARGIN + 10
  const rightCol = PAGE_WIDTH / 2 + 8

  // Left column - Facility Details
  pdf.setFontSize(9)
  pdf.setTextColor(71, 85, 105)
  pdf.setFont('helvetica', 'bold')

  pdf.text('FACILITY NAME', leftCol, yPos)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(30, 41, 59)
  pdf.setFontSize(8.5)
  const facName = industry.name.length > 35 ? industry.name.substring(0, 32) + '...' : industry.name
  pdf.text(facName, leftCol, yPos + 5)

  yPos += 13
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(71, 85, 105)
  pdf.text('FACILITY TYPE', leftCol, yPos)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(30, 41, 59)
  pdf.setFontSize(8.5)
  pdf.text(industry.type || 'Industrial Facility', leftCol, yPos + 5)

  yPos += 13
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(71, 85, 105)
  pdf.text('GEOGRAPHIC COORDINATES', leftCol, yPos)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(30, 41, 59)
  pdf.setFontSize(8.5)
  pdf.text(`${industry.latitude.toFixed(4)}°N, ${industry.longitude.toFixed(4)}°E`, leftCol, yPos + 5)

  // Right column - AQI Status
  yPos = infoY + 18
  if (aqiData) {
    const aqiColor = hexToRgb(aqiData.color)

    // AQI Badge
    pdf.setFillColor(aqiColor.r, aqiColor.g, aqiColor.b, 0.1)
    pdf.roundedRect(rightCol - 2, yPos - 5, 75, 20, 2, 2, 'F')

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(71, 85, 105)
    pdf.text('AIR QUALITY INDEX', rightCol, yPos)

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(20)
    pdf.setTextColor(aqiColor.r, aqiColor.g, aqiColor.b)
    pdf.text(aqiData.aqi.toString(), rightCol, yPos + 12)

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text(aqiData.category.toUpperCase(), rightCol + 25, yPos + 12)

    yPos += 26
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(71, 85, 105)
    pdf.text('DOMINANT POLLUTANT', rightCol, yPos)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(30, 41, 59)
    pdf.setFontSize(8.5)
    pdf.text(aqiData.dominant_pollutant?.toUpperCase() || 'N/A', rightCol, yPos + 5)
  }

  yPos += 13
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(71, 85, 105)
  pdf.text('REPORT DATE', rightCol, yPos)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(30, 41, 59)
  pdf.setFontSize(8.5)
  pdf.text(new Date().toLocaleDateString('en-IN', { dateStyle: 'long' }), rightCol, yPos + 5)

  // Bottom accent bar
  pdf.setFillColor(30, 64, 175)
  pdf.rect(0, PAGE_HEIGHT - 20, PAGE_WIDTH, 2, 'F')

  // Footer with professional branding
  pdf.setFontSize(9)
  pdf.setTextColor(100, 116, 139)
  pdf.setFont('helvetica', 'bold')
  pdf.text('AetherScan', PAGE_WIDTH / 2, PAGE_HEIGHT - 12, { align: 'center' })
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Air Quality Intelligence Platform | Professional Environmental Assessment', PAGE_WIDTH / 2, PAGE_HEIGHT - 7, { align: 'center' })
}

/**
 * Section Header - Modern Design with Visual Accent
 */
function addSectionHeader(pdf: jsPDF, title: string, yPos: number): number {
  // Left accent bar (gradient effect)
  for (let i = 0; i < 3; i++) {
    pdf.setFillColor(59, 130, 246, 0.3 + (i * 0.2))
    pdf.rect(MARGIN, yPos + (i * 3), 3, 9 - (i * 2), 'F')
  }

  // Main header background with gradient
  pdf.setFillColor(248, 250, 252)
  pdf.roundedRect(MARGIN + 5, yPos, CONTENT_WIDTH - 5, 9, 1, 1, 'F')

  // Bottom border accent
  pdf.setFillColor(30, 64, 175)
  pdf.rect(MARGIN + 5, yPos + 8, CONTENT_WIDTH - 5, 1, 'F')

  // Title text
  pdf.setTextColor(30, 64, 175)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text(title.toUpperCase(), MARGIN + 8, yPos + 6)

  return yPos + 14
}

/**
 * Executive Summary - Enhanced Visual Layout
 */
function addExecutiveSummary(pdf: jsPDF, industry: IndustryData, aqiData: AQIData | null): number {
  let yPos = addSectionHeader(pdf, '1. Executive Summary', MARGIN)

  // Introduction paragraph
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(31, 41, 55)

  yPos = addSafeText(pdf, [
    `This report provides a comprehensive environmental impact assessment for ${industry.name}, located at ${industry.latitude.toFixed(4)}°N, ${industry.longitude.toFixed(4)}°E. The assessment follows CPCB standards and WHO guidelines for air quality evaluation.`,
  ], MARGIN, yPos, MAX_LINE_WIDTH)

  yPos += 5

  if (aqiData) {
    const pollutants = extractPollutants(aqiData)
    const limits: Record<string, number> = { pm25: 60, pm10: 100, no2: 80, so2: 80, co: 2000, o3: 100 }
    const exceedances = Object.entries(pollutants).filter(([key, value]) => {
      const limit = limits[key]
      return limit && value > limit
    })

    // Key Findings Box
    const boxY = yPos
    const boxHeight = exceedances.length > 0 ? 38 + (exceedances.length * 5) : 35

    // Shadow
    pdf.setFillColor(0, 0, 0, 0.05)
    pdf.roundedRect(MARGIN + 1, boxY + 1, CONTENT_WIDTH - 2, boxHeight, 2, 2, 'F')

    // Main box
    const aqiColor = hexToRgb(aqiData.color)
    pdf.setFillColor(aqiColor.r, aqiColor.g, aqiColor.b, 0.08)
    pdf.roundedRect(MARGIN, boxY, CONTENT_WIDTH, boxHeight, 2, 2, 'FD')
    pdf.setDrawColor(aqiColor.r, aqiColor.g, aqiColor.b)
    pdf.setLineWidth(0.5)
    pdf.roundedRect(MARGIN, boxY, CONTENT_WIDTH, boxHeight, 2, 2, 'D')

    // Box header
    pdf.setFillColor(aqiColor.r, aqiColor.g, aqiColor.b, 0.15)
    pdf.roundedRect(MARGIN, boxY, CONTENT_WIDTH, 8, 2, 2, 'F')
    pdf.setTextColor(aqiColor.r, aqiColor.g, aqiColor.b)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text('KEY FINDINGS', MARGIN + 3, boxY + 5.5)

    // Content
    let contentY = boxY + 14
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(31, 41, 55)
    pdf.setFontSize(8.5)
    pdf.text('Air Quality Status:', MARGIN + 5, contentY)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`AQI ${aqiData.aqi} (${aqiData.category})`, MARGIN + 40, contentY)

    contentY += 6
    pdf.setFont('helvetica', 'bold')
    pdf.text('Dominant Pollutant:', MARGIN + 5, contentY)
    pdf.setFont('helvetica', 'normal')
    pdf.text(aqiData.dominant_pollutant?.toUpperCase() || 'N/A', MARGIN + 42, contentY)

    contentY += 6
    pdf.setFont('helvetica', 'bold')
    if (exceedances.length > 0) {
      pdf.setTextColor(220, 38, 38)
      pdf.text(`⚠ Compliance Status: ${exceedances.length} Exceedance(s)`, MARGIN + 5, contentY)
      contentY += 6
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(31, 41, 55)
      exceedances.forEach(([pollutant, value]) => {
        const limit = limits[pollutant]
        const exceeds = ((value - limit) / limit * 100).toFixed(0)
        pdf.text(`• ${pollutant.toUpperCase()}: ${value.toFixed(1)} μg/m³ (${exceeds}% above ${limit} limit)`, MARGIN + 8, contentY)
        contentY += 5
      })
    } else {
      pdf.setTextColor(5, 150, 105)
      pdf.text('✓ Compliance Status: All parameters within limits', MARGIN + 5, contentY)
    }

    yPos = boxY + boxHeight + 8
  } else {
    yPos = addSafeText(pdf, [
      'Air Quality Data: Not available for this location. Real-time monitoring data is required for comprehensive assessment.',
    ], MARGIN, yPos, MAX_LINE_WIDTH)
    yPos += 8
  }

  return yPos
}

/**
 * Data Sources & Methodology - CRITICAL SECTION
 * Documents data provenance, sources, limitations, and methodology
 */
function addDataSourcesMethodology(pdf: jsPDF, aqiData: AQIData | null, startY: number): number {
  // Only add new page if not enough space (need ~100mm)
  if (startY > PAGE_HEIGHT - 100) {
    pdf.addPage()
    startY = MARGIN
  }
  let yPos = addSectionHeader(pdf, '2. Data Sources & Methodology', startY)

  // Introduction
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(31, 41, 55)
  yPos = addSafeText(pdf, [
    'This section documents all data sources used in this assessment, their quality, limitations, and the methodologies applied for analysis. Transparency and reproducibility are fundamental to research-grade reporting.',
  ], MARGIN, yPos, MAX_LINE_WIDTH)
  yPos += 8

  // Get data provenance
  const provenance = aqiData ? getDataProvenance(aqiData) : null
  const validation = aqiData ? validateAQIData(aqiData) : null

  // 2.1 Air Quality Data
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(30, 64, 175)
  pdf.text('2.1 Air Quality Data', MARGIN, yPos)
  yPos += 7

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(31, 41, 55)

  if (provenance) {
    const sourceText = [
      `Primary Source: ${provenance.source.toUpperCase()} API`,
      `Data Status: ${provenance.measurementType}`,
      `Timestamp: ${formatTimestamp(provenance.timestamp)}`,
      `Available Pollutants: ${provenance.pollutantsAvailable.join(', ').toUpperCase() || 'None'}`,
      provenance.forecastAvailable ? 'Forecast Data: Available (7-day AQICN forecast)' : 'Forecast Data: Not available',
      '',
      'Calculation Method: CPCB (Central Pollution Control Board) sub-index method, following National Air Quality Index standards (NAQI, 2014).',
    ]
    yPos = addSafeText(pdf, sourceText, MARGIN, yPos, MAX_LINE_WIDTH)
  } else {
    yPos = addSafeText(pdf, ['No air quality data available for this location.'], MARGIN, yPos, MAX_LINE_WIDTH)
  }

  yPos += 5

  // 2.2 Geographic & Satellite Data
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(30, 64, 175)
  pdf.text('2.2 Geographic & Satellite Data', MARGIN, yPos)
  yPos += 7

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(31, 41, 55)

  const geoSources = [
    'Satellite Imagery: ISRO Bhuvan WMS (Web Map Service)',
    'NO₂ Data: NASA OMI (Ozone Monitoring Instrument) satellite - cached/daily',
    'AOD Data: NASA VIIRS (Visible Infrared Imaging Radiometer Suite) - cached',
    'SO₂ Data: Industrial emission model (12 zones with IDW interpolation)',
    'Fire Detection: NASA FIRMS (Fire Information for Resource Management System)',
    'Meteorology: NASA POWER API (Prediction Of Worldwide Energy Resources)',
  ]
  yPos = addSafeText(pdf, geoSources, MARGIN, yPos, MAX_LINE_WIDTH)
  yPos += 5

  // 2.3 Population & Infrastructure Data
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(30, 64, 175)
  pdf.text('2.3 Population & Infrastructure Data', MARGIN, yPos)
  yPos += 7

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(31, 41, 55)

  const popSources = [
    'Population Density: WorldPop 2020 dataset + Census India 2011',
    'Power Plants: WRI Global Power Plant Database (1,589 facilities in India)',
    'Refineries: OpenStreetMap Overpass API (verified industrial facilities)',
  ]
  yPos = addSafeText(pdf, popSources, MARGIN, yPos, MAX_LINE_WIDTH)
  yPos += 5

  // 2.4 Data Quality & Limitations
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(30, 64, 175)
  pdf.text('2.4 Data Quality & Limitations', MARGIN, yPos)
  yPos += 7

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(31, 41, 55)

  if (validation) {
    const qualityText = [
      `Data Quality Assessment: ${validation.dataQuality.toUpperCase()}`,
      `Validation Status: ${validation.isValid ? 'PASSED' : 'FAILED'}`,
    ]

    if (validation.warnings.length > 0) {
      qualityText.push('', 'Warnings:')
      validation.warnings.forEach((w, i) => {
        qualityText.push(`  ${i + 1}. ${w}`)
      })
    }

    if (validation.errors.length > 0) {
      qualityText.push('', 'Errors:')
      validation.errors.forEach((e, i) => {
        qualityText.push(`  ${i + 1}. ${e}`)
      })
    }

    qualityText.push(
      '',
      'General Limitations:',
      '• Real-time data availability depends on sensor network coverage',
      '• Satellite data may have 1-3 day lag due to processing time',
      '• Modeled data (SO₂) uses industrial zone approximations',
      '• Temporal coverage gaps may exist in historical data',
      '• Spatial resolution varies by data source (1km - 25km)',
    )

    yPos = addSafeText(pdf, qualityText, MARGIN, yPos, MAX_LINE_WIDTH)
  }

  return yPos + 10
}

/**
 * Air Quality Analysis with Charts - Modern Professional Design
 */
async function addAirQualityAnalysis(pdf: jsPDF, aqiData: AQIData | null): Promise<number> {
  if (!aqiData) {
    pdf.addPage()
    let yPos = addSectionHeader(pdf, '3. Air Quality Analysis', MARGIN)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(220, 38, 38)
    yPos = addSafeText(pdf, ['Air quality data not available for this location.'], MARGIN, yPos, MAX_LINE_WIDTH)
    return yPos + 10
  }

  pdf.addPage()
  let yPos = addSectionHeader(pdf, '3. Air Quality Analysis', MARGIN)

  const pollutants = extractPollutants(aqiData)
  const hasPollutantData = Object.keys(pollutants).length > 0

  // 3.1 Current AQI Status Card - Premium Design
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(30, 64, 175)
  pdf.text('3.1 Current Air Quality Status', MARGIN, yPos)
  yPos += 6

  const aqiColor = hexToRgb(aqiData.color)

  // Large AQI Status Card with gradient effect
  const cardHeight = 32
  // Shadow
  pdf.setFillColor(0, 0, 0, 0.08)
  pdf.roundedRect(MARGIN + 1, yPos + 1, CONTENT_WIDTH - 2, cardHeight, 3, 3, 'F')

  // Main card background
  pdf.setFillColor(aqiColor.r, aqiColor.g, aqiColor.b, 0.12)
  pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, cardHeight, 3, 3, 'F')

  // Border
  pdf.setDrawColor(aqiColor.r, aqiColor.g, aqiColor.b)
  pdf.setLineWidth(0.8)
  pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, cardHeight, 3, 3, 'D')

  // Left section - Large AQI Number
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(32)
  pdf.setTextColor(aqiColor.r, aqiColor.g, aqiColor.b)
  pdf.text(aqiData.aqi.toString(), MARGIN + 10, yPos + 22)

  // Vertical divider
  pdf.setDrawColor(aqiColor.r, aqiColor.g, aqiColor.b, 0.3)
  pdf.setLineWidth(0.5)
  pdf.line(MARGIN + 45, yPos + 5, MARGIN + 45, yPos + cardHeight - 5)

  // Middle section - Category
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(71, 85, 105)
  pdf.text('CATEGORY', MARGIN + 52, yPos + 10)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(aqiColor.r, aqiColor.g, aqiColor.b)
  pdf.text(aqiData.category.toUpperCase(), MARGIN + 52, yPos + 19)

  // Health Impact (brief)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(71, 85, 105)
  const healthText = aqiData.aqi > 200 ? 'Serious health effects' : aqiData.aqi > 100 ? 'Health concerns' : 'Acceptable quality'
  pdf.text(healthText, MARGIN + 52, yPos + 26)

  // Right section - Dominant Pollutant Badge
  const badgeX = MARGIN + CONTENT_WIDTH - 70
  pdf.setFillColor(30, 64, 175, 0.15)
  pdf.roundedRect(badgeX, yPos + 8, 65, 16, 2, 2, 'F')
  pdf.setDrawColor(30, 64, 175)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(badgeX, yPos + 8, 65, 16, 2, 2, 'D')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.setTextColor(30, 64, 175)
  pdf.text('DOMINANT POLLUTANT', badgeX + 3, yPos + 13)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(31, 41, 55)
  pdf.text(aqiData.dominant_pollutant?.toUpperCase() || 'N/A', badgeX + 3, yPos + 21)

  yPos += cardHeight + 8

  // Check if we have pollutant data before generating charts
  if (!hasPollutantData) {
    // No Data Warning Box
    pdf.setFillColor(254, 226, 226)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 40, 2, 2, 'F')
    pdf.setDrawColor(220, 38, 38)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 40, 2, 2, 'D')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(153, 27, 27)
    pdf.text('⚠ POLLUTANT DATA UNAVAILABLE', MARGIN + 3, yPos + 8)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(127, 29, 29)
    yPos = addSafeText(pdf, [
      'Individual pollutant concentrations are not available for this location.',
      'This may occur when monitoring stations do not exist in the area or sensor',
      'network coverage is limited. Deploy CAAQMS for detailed analysis.',
    ], MARGIN + 3, yPos + 15, CONTENT_WIDTH - 6)

    return yPos + 10
  }

  // 3.2 Pollutant Concentrations
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(30, 64, 175)
  pdf.text('3.2 Measured Pollutant Concentrations', MARGIN, yPos)
  yPos += 6

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(71, 85, 105)
  yPos = addSafeText(pdf, [
    `${Object.keys(pollutants).length} pollutants detected: ${Object.keys(pollutants).map(p => p.toUpperCase()).join(', ')} | All values in μg/m³`,
  ], MARGIN, yPos, MAX_LINE_WIDTH)

  yPos += 3

  console.log('=== Generating Charts with White Backgrounds ===')

  try {
    // Start charts on new page for clean layout
    pdf.addPage()
    yPos = MARGIN

    // Chart 1: Pollutant Bar Chart
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(30, 64, 175)
    pdf.text('Figure 1: Measured Pollutant Concentrations', MARGIN, yPos)
    yPos += 7

    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(8)
    pdf.setTextColor(107, 114, 128)
    yPos = addSafeText(pdf, [
      'Source: AetherScan Monitoring System, ' + new Date().toLocaleDateString('en-IN')
    ], MARGIN, yPos, MAX_LINE_WIDTH)
    yPos += 3

    console.log('Generating Chart 1: Pollutant Bar Chart...')
    const chart1 = createPollutantBarChart(pollutants)
    const img1 = await generateChartImage(chart1, 600, 360)
    pdf.addImage(img1, 'PNG', MARGIN, yPos, CHART_WIDTH, CHART_HEIGHT)
    console.log('✓ Chart 1 SUCCESS')
    yPos += CHART_HEIGHT + 8

    // CHART 2 REMOVED: Compliance Pie was just counting pollutants, not showing severity
    // Same pie chart appeared for all reports regardless of actual pollution levels
    // The compliance table provides better, more detailed information

    // Chart 2: Measured vs. Regulatory Limits (try to fit on same page)
    const spaceNeeded = 7 + 3 + CHART_HEIGHT + 8  // title + source + chart + spacing
    if (yPos + spaceNeeded > PAGE_HEIGHT - 20) {
      pdf.addPage()
      yPos = MARGIN
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(30, 64, 175)
    pdf.text('Figure 2: Measured vs. Regulatory Limits', MARGIN, yPos)
    yPos += 7

    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(8)
    pdf.setTextColor(107, 114, 128)
    yPos = addSafeText(pdf, [
      'Source: Measured data vs. NAAQS limits'
    ], MARGIN, yPos, MAX_LINE_WIDTH)
    yPos += 3

    console.log('Generating Chart 2: Comparison Chart...')
    const chart2 = createComparisonChart(pollutants)
    const img2 = await generateChartImage(chart2, 600, 360)
    pdf.addImage(img2, 'PNG', MARGIN, yPos, CHART_WIDTH, CHART_HEIGHT)
    console.log('✓ Chart 2 SUCCESS')
    yPos += CHART_HEIGHT + 8

    // CHART 3 REMOVED: Percentage Doughnut was redundant with Chart 2 (Comparison)
    // Both showed the same pollutant/limit relationship in different formats
    // Keeping the comparison bar chart as it's more informative

    // Chart 3: AQI Category Position (check if fits)
    if (yPos + spaceNeeded > PAGE_HEIGHT - 20) {
      pdf.addPage()
      yPos = MARGIN
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(30, 64, 175)
    pdf.text('Figure 3: AQI Category Position', MARGIN, yPos)
    yPos += 7

    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(8)
    pdf.setTextColor(107, 114, 128)
    yPos = addSafeText(pdf, [
      'Source: CPCB 6-tier Air Quality Index Scale'
    ], MARGIN, yPos, MAX_LINE_WIDTH)
    yPos += 3

    console.log('Generating Chart 3: AQI Category Chart...')
    const chart3 = createAQICategoryChart(aqiData.aqi)
    const img3 = await generateChartImage(chart3, 600, 360)
    pdf.addImage(img3, 'PNG', MARGIN, yPos, CHART_WIDTH, CHART_HEIGHT)
    console.log('✓ Chart 3 SUCCESS')
    yPos += CHART_HEIGHT + 8

    // Chart 4: Multi-Standard Comparison (ONLY if dominant pollutant data exists)
    const dominantPollutant = aqiData.dominant_pollutant || 'pm25'
    const dominantValue = pollutants[dominantPollutant.toLowerCase()]

    if (dominantValue !== undefined && dominantValue > 0) {
      if (yPos + spaceNeeded > PAGE_HEIGHT - 20) {
        pdf.addPage()
        yPos = MARGIN
      }

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(30, 64, 175)
      pdf.text('Figure 4: Multi-Standard Comparison (Dominant Pollutant)', MARGIN, yPos)
      yPos += 7

      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(8)
      pdf.setTextColor(107, 114, 128)
      yPos = addSafeText(pdf, [
        'Comparison of NAAQS, CPCB, and WHO standards for ' + (aqiData.dominant_pollutant?.toUpperCase() || 'PM2.5')
      ], MARGIN, yPos, MAX_LINE_WIDTH)
      yPos += 3

      console.log('Generating Chart 4: Multi-Standard Comparison...')
      const chart4 = createMultiStandardChart(dominantPollutant, dominantValue)
      const img4 = await generateChartImage(chart4, 600, 360)
      pdf.addImage(img4, 'PNG', MARGIN, yPos, CHART_WIDTH, CHART_HEIGHT)
      console.log('✓ Chart 4 SUCCESS')
      yPos += CHART_HEIGHT + 8
    } else {
      console.log('⊘ Chart 4 SKIPPED: No dominant pollutant data available')
    }

    // Chart 5: Exceedance Severity Matrix (ONLY if we have at least 2 pollutants)
    const pollutantCount = Object.keys(pollutants).length
    if (pollutantCount >= 2) {
      if (yPos + spaceNeeded > PAGE_HEIGHT - 20) {
        pdf.addPage()
        yPos = MARGIN
      }

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(30, 64, 175)
      pdf.text('Figure 5: Exceedance Severity Matrix', MARGIN, yPos)
      yPos += 7

      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(8)
      pdf.setTextColor(107, 114, 128)
      yPos = addSafeText(pdf, [
        'Bubble size indicates health impact severity. X-axis: concentration, Y-axis: % of limit'
      ], MARGIN, yPos, MAX_LINE_WIDTH)
      yPos += 3

      console.log('Generating Chart 5: Exceedance Severity Chart...')
      const chart5 = createExceedanceSeverityChart(pollutants)
      const img5 = await generateChartImage(chart5, 600, 360)
      pdf.addImage(img5, 'PNG', MARGIN, yPos, CHART_WIDTH, CHART_HEIGHT)
      console.log('✓ Chart 5 SUCCESS')
      yPos += CHART_HEIGHT + 8
    } else {
      console.log('⊘ Chart 5 SKIPPED: Need at least 2 pollutants for severity analysis')
    }

    // Chart 6: Health Risk Radar (ALWAYS show - based on AQI, not individual pollutants)
    if (yPos + spaceNeeded > PAGE_HEIGHT - 20) {
      pdf.addPage()
      yPos = MARGIN
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(30, 64, 175)
    pdf.text('Figure 6: Multi-Dimensional Health Risk Assessment', MARGIN, yPos)
    yPos += 7

    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(8)
    pdf.setTextColor(107, 114, 128)
    yPos = addSafeText(pdf, [
      'Based on epidemiological relationships between AQI and health outcomes. Risk scaled 0-100.'
    ], MARGIN, yPos, MAX_LINE_WIDTH)
    yPos += 3

    console.log('Generating Chart 6: Health Risk Radar Chart...')
    const chart6 = createHealthRiskRadarChart(aqiData.aqi)
    const img6 = await generateChartImage(chart6, 600, 360)
    pdf.addImage(img6, 'PNG', MARGIN, yPos, CHART_WIDTH, CHART_HEIGHT)
    console.log('✓ Chart 6 SUCCESS')
    yPos += CHART_HEIGHT + 8

    console.log('=== All Charts Generated Successfully ===')

  } catch (error) {
    console.error('Chart generation failed:', error)
    pdf.setTextColor(220, 38, 38)
    pdf.setFontSize(10)
    pdf.text('Error: Chart generation failed. See data tables below.', MARGIN, yPos)
    yPos += 10
  }

  return yPos
}

/**
 * Geographic Analysis with Map Screenshot - Enhanced Layout
 */
async function addGeographicAnalysis(pdf: jsPDF, industry: IndustryData, mapImage: string | null): Promise<number> {
  pdf.addPage()
  let yPos = addSectionHeader(pdf, '4. Geographic Analysis', MARGIN)

  // Introduction
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(31, 41, 55)

  yPos = addSafeText(pdf, [
    `This section provides geographic context for ${industry.name}. The facility location is analyzed in relation to pollution sources, population centers, and environmental monitoring infrastructure.`,
  ], MARGIN, yPos, MAX_LINE_WIDTH)

  yPos += 4

  // Facility Details Box (compact)
  const boxY = yPos
  pdf.setFillColor(248, 250, 252)
  pdf.roundedRect(MARGIN, boxY, CONTENT_WIDTH, 20, 2, 2, 'F')
  pdf.setDrawColor(30, 64, 175)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(MARGIN, boxY, CONTENT_WIDTH, 20, 2, 2, 'D')

  let boxContentY = boxY + 6
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(30, 64, 175)
  pdf.text('Facility:', MARGIN + 5, boxContentY)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(31, 41, 55)
  const facName = industry.name.length > 50 ? industry.name.substring(0, 47) + '...' : industry.name
  pdf.text(facName, MARGIN + 23, boxContentY)

  boxContentY += 6
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(30, 64, 175)
  pdf.text('Coordinates:', MARGIN + 5, boxContentY)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(31, 41, 55)
  pdf.text(`${industry.latitude.toFixed(4)}°N, ${industry.longitude.toFixed(4)}°E`, MARGIN + 28, boxContentY)

  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(30, 64, 175)
  pdf.text('Type:', MARGIN + 110, boxContentY)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(31, 41, 55)
  pdf.text(industry.type || 'Industrial Facility', MARGIN + 122, boxContentY)

  yPos = boxY + 24

  // Add map screenshot if available
  if (mapImage) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(30, 64, 175)
    pdf.text('Figure 7: Facility Location & Surrounding Environment', MARGIN, yPos)
    yPos += 6

    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(8)
    pdf.setTextColor(107, 114, 128)
    yPos = addSafeText(pdf, [
      'Interactive map showing facility location with active monitoring layers (AQI, pollution sources, population exposure)'
    ], MARGIN, yPos, MAX_LINE_WIDTH)
    yPos += 3

    try {
      // Add map image with border
      const mapWidth = CONTENT_WIDTH
      const mapHeight = (mapWidth * 600) / 800 // Maintain aspect ratio

      // Check if we need a new page
      if (yPos + mapHeight > PAGE_HEIGHT - 20) {
        pdf.addPage()
        yPos = MARGIN
      }

      // Add shadow effect
      pdf.setFillColor(0, 0, 0, 0.1)
      pdf.rect(MARGIN + 1, yPos + 1, mapWidth - 1, mapHeight - 1, 'F')

      // Add border
      pdf.setDrawColor(30, 64, 175)
      pdf.setLineWidth(0.5)
      pdf.rect(MARGIN, yPos, mapWidth, mapHeight, 'D')

      // Add map image
      pdf.addImage(mapImage, 'PNG', MARGIN, yPos, mapWidth, mapHeight)
      yPos += mapHeight + 6

      console.log('✓ Map screenshot added to PDF')
    } catch (error) {
      console.error('Failed to add map image:', error)
      // Show error box instead of just text
      pdf.setFillColor(254, 226, 226)
      pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 15, 2, 2, 'F')
      pdf.setDrawColor(220, 38, 38)
      pdf.setLineWidth(0.3)
      pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 15, 2, 2, 'D')
      pdf.setTextColor(153, 27, 27)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8.5)
      pdf.text('⚠ Map Capture Error', MARGIN + 3, yPos + 6)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.text('Map screenshot could not be generated. Ensure map is fully loaded before generating PDF.', MARGIN + 3, yPos + 11)
      yPos += 18
    }
  } else {
    // Show information box instead of plain text
    pdf.setFillColor(254, 249, 195)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 20, 2, 2, 'F')
    pdf.setDrawColor(245, 158, 11)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 20, 2, 2, 'D')
    pdf.setTextColor(146, 64, 14)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.text('ℹ Map Screenshot Not Available', MARGIN + 3, yPos + 7)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.text('Map visualization unavailable - ensure map is fully loaded before generating PDF.', MARGIN + 3, yPos + 13)
    pdf.text('Geographic analysis will continue with coordinate-based data.', MARGIN + 3, yPos + 18)
    yPos += 24
  }

  return yPos
}

/**
 * Compliance Assessment with Table
 */
function addComplianceAssessment(pdf: jsPDF, aqiData: AQIData | null): number {
  if (!aqiData) return MARGIN

  pdf.addPage()
  let yPos = addSectionHeader(pdf, '5. Regulatory Compliance', MARGIN)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(31, 41, 55)
  yPos = addSafeText(pdf, [
    'Detailed compliance status for all monitored pollutants:',
  ], MARGIN, yPos, MAX_LINE_WIDTH)

  yPos += 5

  const pollutants = extractPollutants(aqiData)
  const complianceData = createComplianceTableData(pollutants)

  autoTable(pdf, {
    startY: yPos,
    head: [['Pollutant', 'Measured', 'Unit', 'NAAQS\nLimit', 'NAAQS\nStatus', 'WHO\nLimit', 'WHO\nStatus']],
    body: complianceData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [31, 41, 55],
      overflow: 'linebreak', // CRITICAL: Enable text wrapping to prevent overflow
      cellPadding: 2,
    },
    styles: {
      overflow: 'linebreak', // Apply to all cells
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 25 },
      1: { halign: 'right', cellWidth: 23 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 30 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 30 },
    },
    didParseCell: (data: any) => {
      if ((data.column.index === 4 || data.column.index === 6) && data.section === 'body') {
        const cellValue = data.cell.raw
        if (cellValue && cellValue.includes('EXCEEDS')) {
          data.cell.styles.textColor = [220, 38, 38]
          data.cell.styles.fontStyle = 'bold'
        } else if (cellValue && cellValue.includes('COMPLIANT')) {
          data.cell.styles.textColor = [5, 150, 105]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  })

  yPos = (pdf as any).lastAutoTable.finalY + 10

  return yPos
}

/**
 * Meteorological Conditions & Pollution Dispersal Analysis
 */
async function addMeteorologyAnalysis(
  pdf: jsPDF,
  industry: IndustryData,
  aqiData: AQIData | null,
  meteoData: MeteoData | null,
  dispersalAnalysis: DispersalAnalysis | null,
  stability: AtmosphericStability | null
): Promise<number> {
  pdf.addPage()
  let yPos = addSectionHeader(pdf, '8. Meteorological Conditions & Pollution Dispersal', MARGIN)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(31, 41, 55)

  if (!meteoData || !dispersalAnalysis) {
    yPos = addSafeText(pdf, [
      'Meteorological data unavailable. Dispersal analysis requires real-time weather data.',
      '',
      'Recommendation: Integrate NASA POWER API or local weather station data for comprehensive wind analysis.',
    ], MARGIN, yPos, MAX_LINE_WIDTH)
    return yPos + 10
  }

  // 8.1 Current Weather Conditions
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(30, 64, 175)
  pdf.text('8.1 Current Meteorological Conditions', MARGIN, yPos)
  yPos += 8

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(31, 41, 55)
  yPos = addSafeText(pdf, [
    `Data Source: ${meteoData.source === 'nasa_power' ? 'NASA POWER API' : 'Estimated seasonal values'}`,
    `Location: ${industry.latitude.toFixed(4)}°N, ${industry.longitude.toFixed(4)}°E`,
    '',
  ], MARGIN, yPos, MAX_LINE_WIDTH)
  yPos += 3

  // Meteorology Table
  const meteoTableData = createMeteoTableData(meteoData)
  autoTable(pdf, {
    startY: yPos,
    head: [['Parameter', 'Value', 'Source']],
    body: meteoTableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [31, 41, 55],
      overflow: 'linebreak',
      cellPadding: 2,
    },
    styles: {
      overflow: 'linebreak',
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'center', cellWidth: 50 },
      2: { cellWidth: 68 },
    },
    margin: { left: MARGIN, right: MARGIN },
  })

  yPos = (pdf as any).lastAutoTable.finalY + 10

  // 8.2 Wind Analysis & Pollution Dispersal
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(30, 64, 175)
  pdf.text('8.2 Wind Analysis & Pollution Dispersal', MARGIN, yPos)
  yPos += 8

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(31, 41, 55)

  // Simplified dispersal assessment
  const dispersalSummary = [
    `Dispersal Status: ${dispersalAnalysis.staying ? 'POLLUTION STAYING' : 'POLLUTION DISPERSING'}`,
    `Index: ${dispersalAnalysis.dispersalIndex}/100 (${dispersalAnalysis.category.replace('_', ' ').toUpperCase()})`,
    `Wind Speed: ${meteoData.windSpeed.toFixed(1)} m/s - ${dispersalAnalysis.windSpeed < 2 ? 'Insufficient for dispersal' : dispersalAnalysis.windSpeed < 4 ? 'Moderate dispersal' : 'Good dispersal'}`,
    '',
  ]
  yPos = addSafeText(pdf, dispersalSummary, MARGIN, yPos, MAX_LINE_WIDTH)
  yPos += 3

  // Check if new page needed for charts
  if (yPos > PAGE_HEIGHT - 110) {
    pdf.addPage()
    yPos = MARGIN
  }

  // Wind Rose Diagram with error handling
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(30, 64, 175)
  pdf.text('Figure: Wind Rose Diagram', MARGIN, yPos)
  yPos += 7

  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(8)
  pdf.setTextColor(107, 114, 128)
  yPos = addSafeText(pdf, [
    `Current wind: ${meteoData.windSpeed.toFixed(1)} m/s from ${meteoData.windDirection}° (${getWindDirectionName(meteoData.windDirection)})`
  ], MARGIN, yPos, MAX_LINE_WIDTH)
  yPos += 3

  try {
    const windRoseData = generateWindRoseData(meteoData.windSpeed, meteoData.windDirection)
    console.log('Wind rose data generated:', windRoseData)
    const windRoseChart = createWindRoseChart(windRoseData)
    const windRoseImg = await generateChartImage(windRoseChart, 600, 360)
    pdf.addImage(windRoseImg, 'PNG', MARGIN, yPos, CHART_WIDTH, CHART_HEIGHT)
    console.log('✓ Wind rose chart rendered successfully')
    yPos += CHART_HEIGHT + 8
  } catch (error) {
    console.error('Wind rose chart generation failed:', error)
    // Show visual wind information box instead
    pdf.setFillColor(254, 249, 195)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 25, 2, 2, 'F')
    pdf.setDrawColor(245, 158, 11)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 25, 2, 2, 'D')

    pdf.setTextColor(146, 64, 14)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text('Wind Analysis Summary', MARGIN + 3, yPos + 7)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.text(`Wind Direction: ${getWindDirectionName(meteoData.windDirection)} (${meteoData.windDirection}°)`, MARGIN + 3, yPos + 14)
    pdf.text(`Wind Speed: ${meteoData.windSpeed.toFixed(1)} m/s`, MARGIN + 3, yPos + 20)
    yPos += 28
  }

  // Dispersal Potential Chart with error handling
  if (yPos > PAGE_HEIGHT - 90) {
    pdf.addPage()
    yPos = MARGIN
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(30, 64, 175)
  pdf.text('Figure: Pollution Dispersal Potential', MARGIN, yPos)
  yPos += 7

  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(8)
  pdf.setTextColor(107, 114, 128)
  yPos = addSafeText(pdf, [
    `Index: ${dispersalAnalysis.dispersalIndex}/100 (${dispersalAnalysis.staying ? 'Pollution staying' : 'Pollution dispersing'})`
  ], MARGIN, yPos, MAX_LINE_WIDTH)
  yPos += 3

  try {
    const dispersalChart = createDispersalChart(dispersalAnalysis.dispersalIndex, dispersalAnalysis.category)
    const dispersalImg = await generateChartImage(dispersalChart, 600, 360)
    pdf.addImage(dispersalImg, 'PNG', MARGIN, yPos, CHART_WIDTH, CHART_HEIGHT)
    console.log('✓ Dispersal chart rendered successfully')
    yPos += CHART_HEIGHT + 8
  } catch (error) {
    console.error('Dispersal chart generation failed:', error)
    // Show dispersal info box instead
    const statusColor = dispersalAnalysis.staying ? '#DC2626' : '#059669'
    const statusColorRgb = hexToRgb(statusColor)

    pdf.setFillColor(statusColorRgb.r, statusColorRgb.g, statusColorRgb.b, 0.1)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 25, 2, 2, 'F')
    pdf.setDrawColor(statusColorRgb.r, statusColorRgb.g, statusColorRgb.b)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 25, 2, 2, 'D')

    pdf.setTextColor(statusColorRgb.r, statusColorRgb.g, statusColorRgb.b)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text(`Dispersal Status: ${dispersalAnalysis.staying ? 'POLLUTION STAYING' : 'POLLUTION DISPERSING'}`, MARGIN + 3, yPos + 7)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(31, 41, 55)
    pdf.text(`Dispersal Index: ${dispersalAnalysis.dispersalIndex}/100`, MARGIN + 3, yPos + 14)
    pdf.text(`Category: ${dispersalAnalysis.category.replace('_', ' ').toUpperCase()}`, MARGIN + 3, yPos + 20)
    yPos += 28
  }

  // 8.3 Atmospheric Stability
  if (stability) {
    if (yPos > PAGE_HEIGHT - 70) {
      pdf.addPage()
      yPos = MARGIN
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(30, 64, 175)
    pdf.text('8.3 Atmospheric Stability Assessment', MARGIN, yPos)
    yPos += 8

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(31, 41, 55)
    yPos = addSafeText(pdf, [
      `Pasquill-Gifford Classification: ${stability.stabilityClass} (${stability.stabilityName})`,
      '',
    ], MARGIN, yPos, MAX_LINE_WIDTH)
    yPos += 3

    const stabilityTableData = createStabilityTableData(stability)
    autoTable(pdf, {
      startY: yPos,
      head: [['Parameter', 'Value', 'Method']],
      body: stabilityTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [31, 41, 55],
        overflow: 'linebreak',
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 50 },
        2: { cellWidth: 68 },
      },
      margin: { left: MARGIN, right: MARGIN },
    })

    yPos = (pdf as any).lastAutoTable.finalY + 10
  }

  return yPos
}

/**
 * Fire Detection & Biomass Burning Impact Analysis
 */
async function addFireDetectionAnalysis(
  pdf: jsPDF,
  aqiData: AQIData | null,
  fires: FirePoint[],
  fireSummary: FireSummary | null,
  fireImpact: FireImpactAnalysis | null
): Promise<number> {
  pdf.addPage()
  let yPos = addSectionHeader(pdf, '9. Fire Detection & Biomass Burning Impact', MARGIN)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(31, 41, 55)

  if (!fireSummary || fireSummary.totalFires === 0) {
    yPos = addSafeText(pdf, [
      'No active fire detections within 50km of facility (past 7 days).',
      '',
      `Data Source: NASA FIRMS (Fire Information for Resource Management System) - VIIRS/MODIS satellites`,
      '',
      'This indicates minimal biomass burning impact on current air quality. Pollution is primarily from industrial/urban sources.',
    ], MARGIN, yPos, MAX_LINE_WIDTH)
    return yPos + 10
  }

  // 9.1 Active Fire Detections
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(30, 64, 175)
  pdf.text('9.1 Active Fire Detections (7-Day Lookback)', MARGIN, yPos)
  yPos += 8

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(31, 41, 55)
  yPos = addSafeText(pdf, [
    `Data Source: NASA FIRMS VIIRS/MODIS Active Fire Products`,
    `Detection Period: ${fireSummary.dateRange.from} to ${fireSummary.dateRange.to}`,
    `Total Detections: ${fireSummary.totalFires} fires within 50km radius`,
    '',
  ], MARGIN, yPos, MAX_LINE_WIDTH)
  yPos += 3

  // Fire Summary Table
  const fireTableData = createFireTableData(fireSummary)
  autoTable(pdf, {
    startY: yPos,
    head: [['Metric', 'Value', 'Notes']],
    body: fireTableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [31, 41, 55],
      overflow: 'linebreak',
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'center', cellWidth: 35 },
      2: { cellWidth: 73 },
    },
    margin: { left: MARGIN, right: MARGIN },
  })

  yPos = (pdf as any).lastAutoTable.finalY + 10

  // 9.2 Fire Impact on Air Quality
  if (fireImpact && aqiData) {
    // Check if new page needed
    if (yPos > PAGE_HEIGHT - 50) {
      pdf.addPage()
      yPos = MARGIN
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(30, 64, 175)
    pdf.text('9.2 Fire Impact Analysis', MARGIN, yPos)
    yPos += 8

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(31, 41, 55)

    // Simplified impact summary
    const impactSummary = [
      `Correlation: ${fireImpact.correlationWithAQI.toUpperCase().replace('_', ' ')}`,
      `PM2.5 Contribution: ${fireImpact.likelyContribution}%`,
      `Upwind Fires: ${fireImpact.upwindFires} | Downwind: ${fireImpact.downwindFires}`,
      `Assessment: ${fireImpact.likelyContribution > 30 ? 'Fires significantly impacting AQI' : fireImpact.likelyContribution > 15 ? 'Moderate fire contribution' : 'Minimal fire impact'}`,
      '',
    ]
    yPos = addSafeText(pdf, impactSummary, MARGIN, yPos, MAX_LINE_WIDTH)
    yPos += 3
  }

  // Fire Charts
  if (fires.length > 0) {
    try {
      // Check if new page needed
      if (yPos > PAGE_HEIGHT - 110) {
        pdf.addPage()
        yPos = MARGIN
      }

      // Fire Timeline Chart
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(30, 64, 175)
      pdf.text('Figure: Fire Detection Timeline', MARGIN, yPos)
      yPos += 7

      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(8)
      pdf.setTextColor(107, 114, 128)
      yPos = addSafeText(pdf, ['Source: NASA FIRMS VIIRS/MODIS (7-day lookback)'], MARGIN, yPos, MAX_LINE_WIDTH)
      yPos += 3

      const fireTimelineChart = createFireTimelineChart(fires)
      const fireTimelineImg = await generateChartImage(fireTimelineChart, 600, 360)
      pdf.addImage(fireTimelineImg, 'PNG', MARGIN, yPos, CHART_WIDTH, CHART_HEIGHT)
      yPos += CHART_HEIGHT + 8

      // Fire vs AQI Correlation Chart
      if (aqiData && yPos > PAGE_HEIGHT - 90) {
        pdf.addPage()
        yPos = MARGIN
      }

      if (aqiData) {
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        pdf.setTextColor(30, 64, 175)
        pdf.text('Figure: Fire Distribution & Impact Analysis', MARGIN, yPos)
        yPos += 7

        pdf.setFont('helvetica', 'italic')
        pdf.setFontSize(8)
        pdf.setTextColor(107, 114, 128)
        yPos = addSafeText(pdf, [
          `Fire count by distance zones with estimated pollution impact contribution. Current AQI: ${aqiData.aqi}`
        ], MARGIN, yPos, MAX_LINE_WIDTH)
        yPos += 3

        const fireAQIChart = createFireAQICorrelationChart(fireSummary.firesByDistance, aqiData.aqi)
        const fireAQIImg = await generateChartImage(fireAQIChart, 600, 360)
        pdf.addImage(fireAQIImg, 'PNG', MARGIN, yPos, CHART_WIDTH, CHART_HEIGHT)
        yPos += CHART_HEIGHT + 8
      }

    } catch (error) {
      console.error('Fire chart generation failed:', error)
      pdf.setTextColor(220, 38, 38)
      pdf.setFontSize(9)
      pdf.text('Chart generation failed. See data tables above.', MARGIN, yPos)
      yPos += 10
    }
  }

  return yPos
}

/**
 * Recommendations
 */
function addRecommendations(pdf: jsPDF, aqiData: AQIData | null): number {
  pdf.addPage()
  let yPos = addSectionHeader(pdf, '10. Recommendations', MARGIN)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(31, 41, 55)

  const recommendations = [
    '1. Deploy continuous ambient air quality monitoring systems at facility boundaries.',
    '2. Implement dust suppression measures including water sprinklers and green belts.',
    '3. Conduct regular maintenance of emission control equipment.',
    '4. Conduct periodic stack emission monitoring as per regulatory requirements.',
    '5. Develop an emergency response plan for air quality exceedances.',
  ]

  yPos = addSafeText(pdf, recommendations, MARGIN, yPos, MAX_LINE_WIDTH)

  if (aqiData) {
    const pollutants = extractPollutants(aqiData)
    const limits: Record<string, number> = { pm25: 60, pm10: 100, no2: 80, so2: 80, co: 2000, o3: 100 }
    const exceedances = Object.entries(pollutants).filter(([key, value]) => {
      const limit = limits[key]
      return limit && value > limit
    })

    if (exceedances.length > 0) {
      yPos += 5
      pdf.setFont('helvetica', 'bold')
      pdf.text('Priority Actions for Exceedances:', MARGIN, yPos)
      yPos += 7
      pdf.setFont('helvetica', 'normal')

      exceedances.forEach(([pollutant, value]) => {
        const limit = limits[pollutant]
        const exceedancePercent = (((value - limit) / limit) * 100).toFixed(1)
        yPos = addSafeText(pdf, [
          `${pollutant.toUpperCase()}: ${value.toFixed(2)} μg/m³ (${exceedancePercent}% above limit)`,
          '  Action: Install/upgrade emission control systems, increase monitoring frequency.'
        ], MARGIN, yPos, MAX_LINE_WIDTH)
        yPos += 3
      })
    }
  }

  return yPos + 10
}

/**
 * Add Conclusions Section
 */
function addConclusions(pdf: jsPDF, industry: IndustryData, aqiData: AQIData | null): number {
  pdf.addPage()
  let yPos = addSectionHeader(pdf, '11. Conclusions', MARGIN)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(31, 41, 55)

  const conclusions: string[] = []

  // Summary of assessment
  conclusions.push(
    `This environmental impact assessment analyzed air quality conditions at ${industry.name}, located at ${industry.latitude.toFixed(4)}°N, ${industry.longitude.toFixed(4)}°E.`
  )
  conclusions.push('')

  if (aqiData) {
    const aqiNormalized = normalizeAQI(aqiData.aqi)
    const pollutants = extractPollutants(aqiData)

    // AQI Status
    if (aqiNormalized.isValid) {
      conclusions.push(
        `Air Quality Status: The current Air Quality Index (AQI) is ${aqiData.aqi}, categorized as "${aqiData.category}". This indicates ${aqiData.category === 'Good' ? 'satisfactory air quality with minimal health impact' : aqiData.category === 'Moderate' ? 'acceptable air quality with some health concerns for sensitive groups' : 'health concerns that may affect the general population'}.`
      )
    } else {
      conclusions.push(
        `Air Quality Status: ${aqiNormalized.explanation}`
      )
    }
    conclusions.push('')

    // Pollutant Data
    if (Object.keys(pollutants).length > 0) {
      const limits: Record<string, number> = { pm25: 60, pm10: 100, no2: 80, so2: 80, co: 2000, o3: 100 }
      const exceedances = Object.entries(pollutants).filter(([key, value]) => {
        const limit = limits[key]
        return limit && value > limit
      })

      if (exceedances.length > 0) {
        conclusions.push(
          `Regulatory Compliance: ${exceedances.length} pollutant(s) exceed NAAQS limits (${exceedances.map(([p]) => p.toUpperCase()).join(', ')}). Immediate corrective actions are required to achieve compliance.`
        )
      } else {
        conclusions.push(
          `Regulatory Compliance: All measured pollutants are within NAAQS limits. The facility demonstrates satisfactory environmental performance in terms of air quality.`
        )
      }
      conclusions.push('')

      // Dominant pollutant
      conclusions.push(
        `Dominant Pollutant: ${aqiData.dominant_pollutant?.toUpperCase() || 'PM2.5'} is the primary contributor to the current AQI. Control measures should prioritize reduction of this pollutant.`
      )
    } else {
      conclusions.push(
        `Pollutant Data: Individual pollutant concentrations are not available for this location. Deployment of continuous monitoring systems is recommended for comprehensive assessment.`
      )
    }
    conclusions.push('')

  } else {
    conclusions.push('Air Quality Data: No air quality data is available for this location. This assessment is limited without real-time monitoring data.')
    conclusions.push('')
  }

  // Data quality
  if (aqiData) {
    const validation = validateAQIData(aqiData)
    const provenance = getDataProvenance(aqiData)
    conclusions.push(
      `Data Quality: ${validation.dataQuality.toUpperCase()}. Data sourced from ${provenance.source.toUpperCase()} API with ${validation.warnings.length} warning(s) and ${validation.errors.length} error(s). ${validation.isValid ? 'Data quality is suitable for decision-making.' : 'Data limitations should be considered in interpretation.'}`
    )
    conclusions.push('')
  }

  // Key findings summary
  conclusions.push('Key Findings:')
  if (aqiData && aqiData.aqi < 100) {
    conclusions.push('  • Air quality is generally acceptable for outdoor activities')
    conclusions.push('  • Sensitive groups should take precautions during elevated pollution episodes')
  } else if (aqiData && aqiData.aqi >= 100 && aqiData.aqi < 200) {
    conclusions.push('  • Health effects possible for sensitive groups')
    conclusions.push('  • General public may experience irritation with prolonged exposure')
    conclusions.push('  • Enhanced emission controls are recommended')
  } else if (aqiData && aqiData.aqi >= 200) {
    conclusions.push('  • Significant health concerns for all population groups')
    conclusions.push('  • Immediate action required to reduce emissions')
    conclusions.push('  • Public health advisories should be issued')
  }
  conclusions.push('  • Continuous ambient air quality monitoring (CAAQMS) is essential')
  conclusions.push('  • Regular compliance monitoring and reporting are necessary')
  conclusions.push('')

  // Next steps
  conclusions.push(
    'Next Steps: Implementation of recommended mitigation measures, establishment of continuous monitoring systems, and periodic reassessment are essential to ensure sustained environmental compliance and protection of public health.'
  )

  yPos = addSafeText(pdf, conclusions, MARGIN, yPos, MAX_LINE_WIDTH)

  return yPos + 10
}

/**
 * Add Data Quality Badge
 * Visual indicator of data quality in PDF
 */
function addDataQualityBadge(
  pdf: jsPDF,
  x: number,
  y: number,
  quality: string,
  score?: number
): number {
  const badge = getDataQualityBadge(quality)
  const rgb = hexToRgb(badge.color)

  // Draw rounded rectangle badge
  pdf.setFillColor(rgb.r, rgb.g, rgb.b, 0.1)
  pdf.setDrawColor(rgb.r, rgb.g, rgb.b)
  pdf.setLineWidth(0.5)
  pdf.roundedRect(x, y, 50, 8, 1.5, 1.5, 'FD')

  // Add icon and label
  pdf.setTextColor(rgb.r, rgb.g, rgb.b)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`${badge.icon} ${badge.label}`, x + 3, y + 5.5)

  // Add score if provided
  if (score !== undefined) {
    pdf.setFontSize(8)
    pdf.setTextColor(107, 114, 128)
    pdf.text(`(${score}%)`, x + 42, y + 5.5)
  }

  return y + 10
}

/**
 * Add Professional Page Headers and Footers
 */
function addProfessionalHeadersFooters(pdf: jsPDF, industry: IndustryData) {
  const pageCount = (pdf as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    if (i === 1) continue // Skip cover page

    // Top header line
    pdf.setDrawColor(30, 64, 175)
    pdf.setLineWidth(0.5)
    pdf.line(MARGIN, 8, PAGE_WIDTH - MARGIN, 8)

    // Header text
    pdf.setFontSize(7.5)
    pdf.setTextColor(107, 114, 128)
    pdf.setFont('helvetica', 'normal')
    pdf.text('AetherScan Air Quality Assessment', MARGIN, 6)
    pdf.text(industry.name.substring(0, 50), PAGE_WIDTH - MARGIN, 6, { align: 'right' })

    // Bottom footer line
    pdf.setDrawColor(30, 64, 175)
    pdf.setLineWidth(0.5)
    pdf.line(MARGIN, PAGE_HEIGHT - 12, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12)

    // Footer text
    pdf.setFontSize(7.5)
    pdf.setTextColor(107, 114, 128)
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, MARGIN, PAGE_HEIGHT - 8)
    pdf.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 8, { align: 'center' })
    pdf.text('Confidential', PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 8, { align: 'right' })
  }
}

/**
 * MAIN FUNCTION - Generate Complete PDF Report
 * @param industry - Facility/industry data
 * @param aqiData - Air quality data
 * @param mapRef - Optional map reference for screenshot capture (Phase 4)
 */
export async function generateComprehensiveReport(
  industry: IndustryData,
  aqiData: AQIData | null,
  mapRef?: RefObject<MapRef> | null
): Promise<void> {
  console.log('=== Research-Grade PDF Generation Started ===')

  const pdf = new jsPDF('p', 'mm', 'a4')

  try {
    // STEP 0: DATA CLEANING (CRITICAL - Do First!)
    console.log('Step 0: Cleaning and validating data...')
    const cleanedData = cleanDataForPDF(aqiData)
    let cleanPollutants: Record<string, number> = {}
    let dataQualityScore = 0
    let cleaningReport: any = null

    if (cleanedData) {
      cleanPollutants = cleanedData.pollutants
      dataQualityScore = cleanedData.dataQualityScore
      cleaningReport = cleanedData.cleaningReport
      console.log(`✓ Data cleaning complete: ${dataQualityScore}% quality score`)
      console.log(`  Usable data: ${cleaningReport.usableDataPercentage}%`)
      if (cleaningReport.removedValues.length > 0) {
        console.warn(`  Removed ${cleaningReport.removedValues.length} invalid values`)
      }
    } else {
      console.warn('⚠ No valid data after cleaning - report will be limited')
    }

    // Step 1: Capture map screenshot with retry logic
    let mapImage: string | null = null

    if (mapRef?.current) {
      try {
        console.log('Step 1: Capturing map screenshot...')
        // Wait a bit for map to fully render
        await new Promise(resolve => setTimeout(resolve, 1000))
        mapImage = await captureMapCanvas(mapRef, 800, 600)
        console.log('✓ Map screenshot captured successfully')
      } catch (error) {
        console.warn('First map capture attempt failed, retrying...', error)
        // Retry once after longer wait
        try {
          await new Promise(resolve => setTimeout(resolve, 2000))
          mapImage = await captureMapCanvas(mapRef, 800, 600)
          console.log('✓ Map screenshot captured on retry')
        } catch (retryError) {
          console.error('Map capture failed after retry:', retryError)
          mapImage = null
        }
      }
    } else {
      console.warn('Map reference not provided - skipping map screenshot')
    }

    // Step 2: Fetch meteorological data
    let meteoData: MeteoData | null = null
    let dispersalAnalysis: DispersalAnalysis | null = null
    let stability: AtmosphericStability | null = null

    if (aqiData) {
      try {
        console.log('Step 2: Fetching meteorological data...')
        meteoData = await fetchMeteorology(industry.latitude, industry.longitude)
        console.log(`✓ Meteorology data fetched (${meteoData.source})`)

        // Calculate dispersal analysis - use CLEAN pollutants
        const pm25 = cleanPollutants.pm25 || cleanPollutants.pm10 || 0
        dispersalAnalysis = assessPollutionDispersal(
          meteoData.windSpeed,
          meteoData.windDirection,
          aqiData.aqi,
          meteoData.temperature
        )
        console.log(`✓ Dispersal analysis: ${dispersalAnalysis.category} (Index: ${dispersalAnalysis.dispersalIndex})`)

        // Calculate atmospheric stability
        stability = calculateAtmosphericStability(
          meteoData.windSpeed,
          meteoData.temperature
        )
        console.log(`✓ Atmospheric stability: ${stability.stabilityClass} (${stability.stabilityName})`)

      } catch (error) {
        console.error('Meteorology data fetch failed:', error)
        meteoData = null
        dispersalAnalysis = null
        stability = null
      }
    }

    // Step 3: Fetch fire detection data
    let fires: FirePoint[] = []
    let fireSummary: FireSummary | null = null
    let fireImpact: FireImpactAnalysis | null = null

    if (aqiData) {
      try {
        console.log('Fetching fire detection data...')
        fires = await fetchFireData(
          industry.latitude,
          industry.longitude,
          50, // 50km radius
          7,  // 7 days back
          'DEMO' // Use demo data (API key would go here)
        )
        console.log(`✓ Fire data fetched: ${fires.length} detections`)

        if (fires.length > 0) {
          fireSummary = generateFireSummary(fires)
          const pollutants = extractPollutants(aqiData)
          const pm25 = pollutants.pm25 || pollutants.pm10 || 0

          fireImpact = analyzeFireImpact(
            fires,
            aqiData.aqi,
            meteoData?.windDirection || 180,
            pm25
          )
          console.log(`✓ Fire impact analysis: ${fireImpact.correlationWithAQI} (${fireImpact.likelyContribution}% contribution)`)
        }

      } catch (error) {
        console.error('Fire data fetch failed:', error)
        fires = []
        fireSummary = null
        fireImpact = null
      }
    }

    // PDF Generation begins
    // Cover Page
    console.log('Page 1: Cover')
    addCoverPage(pdf, industry, aqiData)

    // Executive Summary
    pdf.addPage()
    console.log('Page 2: Executive Summary')
    let yPos = addExecutiveSummary(pdf, industry, aqiData)

    // Data Sources & Methodology (CRITICAL SECTION)
    console.log('Data Sources & Methodology')
    yPos = addDataSourcesMethodology(pdf, aqiData, yPos)

    // Air Quality Analysis with Charts
    console.log('Air Quality Analysis with Charts')
    yPos = await addAirQualityAnalysis(pdf, aqiData)

    // Geographic Analysis with Map
    console.log('Geographic Analysis')
    yPos = await addGeographicAnalysis(pdf, industry, mapImage)

    // Compliance Assessment
    console.log('Compliance Assessment')
    yPos = addComplianceAssessment(pdf, aqiData)

    // Recommendations
    console.log('Recommendations')
    yPos = addRecommendations(pdf, aqiData)

    // Conclusions (CRITICAL SECTION)
    console.log('Conclusions')
    yPos = addConclusions(pdf, industry, aqiData)

    // NEW: Meteorology & Wind Analysis
    console.log('Meteorology & Wind Analysis')
    yPos = await addMeteorologyAnalysis(pdf, industry, aqiData, meteoData, dispersalAnalysis, stability)

    // NEW: Fire Detection Analysis
    console.log('Fire Detection & Biomass Burning')
    yPos = await addFireDetectionAnalysis(pdf, aqiData, fires, fireSummary, fireImpact)

    // Professional Headers & Footers
    console.log('Adding professional headers and footers')
    addProfessionalHeadersFooters(pdf, industry)

    // OPEN IN NEW TAB
    const pdfBlob = pdf.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    window.open(pdfUrl, '_blank')

    console.log('=== PDF Generation Complete - Opened in new tab ===')

  } catch (error) {
    console.error('=== PDF Generation Failed ===', error)
    alert(`PDF generation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    throw error
  }
}
