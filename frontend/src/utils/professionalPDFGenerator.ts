// EXECUTIVE-GRADE PDF REPORT GENERATOR
// Magazine-quality layout with professional design following corporate standards
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { MapRef } from 'react-map-gl/maplibre'
import type { RefObject } from 'react'
import {
  generateChartImage,
  createPollutantBarChart,
  createComparisonChart,
  createHealthRiskRadarChart,
  createFireAQICorrelationChart,
} from './researchChartGenerator'
import {
  fetchMeteorology,
  assessPollutionDispersal,
  calculateAtmosphericStability,
  getWindDirectionName,
  createMeteoTableData,
} from './meteorologyUtils'
import {
  fetchFireData,
  generateFireSummary,
  analyzeFireImpact,
  createFireTableData,
} from './fireDetectionUtils'
import {
  extractPollutants,
  cleanDataForPDF,
  type AQIData,
} from './dataValidator'
import { captureMapCanvas } from './mapExportUtils'

// PROFESSIONAL LAYOUT CONSTANTS
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 12 // Tighter margins
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
const MAX_LINE_WIDTH = CONTENT_WIDTH

// Professional color palette - Executive blue theme
const COLORS = {
  primary: '#00A3E0',      // Cyan blue (main brand)
  primaryDark: '#0077A0',  // Dark cyan
  accent: '#00D4FF',       // Bright cyan accent
  dark: '#1A1A1A',         // Almost black text
  gray: '#4A4A4A',         // Dark gray
  lightGray: '#E8E8E8',    // Light gray backgrounds
  white: '#FFFFFF',        // Pure white
  red: '#E63946',          // Alert red
  green: '#06D6A0',        // Success green
  orange: '#F77F00',       // Warning orange
}

interface IndustryData {
  name: string
  type?: string
  latitude: number
  longitude: number
  [key: string]: any
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 }
}

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
      if (currentY > PAGE_HEIGHT - 15) {
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
 * COVER PAGE - Magazine Style
 */
function addExecutiveCoverPage(pdf: jsPDF, industry: IndustryData) {
  // Full-page cyan background with gradient effect
  const cyan = hexToRgb(COLORS.primary)
  pdf.setFillColor(cyan.r, cyan.g, cyan.b)
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F')

  // Dark overlay for text contrast (bottom third)
  pdf.setFillColor(0, 0, 0, 0.7)
  pdf.rect(0, PAGE_HEIGHT * 0.6, PAGE_WIDTH, PAGE_HEIGHT * 0.4, 'F')

  // Main Title - Large, Bold, White
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(36)
  pdf.text('ENVIRONMENTAL', PAGE_WIDTH / 2, PAGE_HEIGHT * 0.65, { align: 'center' })
  pdf.setFontSize(32)
  pdf.text('IMPACT ASSESSMENT', PAGE_WIDTH / 2, PAGE_HEIGHT * 0.72, { align: 'center' })

  // Subtitle line
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Air Quality Analysis Report', PAGE_WIDTH / 2, PAGE_HEIGHT * 0.78, { align: 'center' })

  // Facility name
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  const facName = industry.name.length > 60 ? industry.name.substring(0, 57) + '...' : industry.name
  pdf.text(facName.toUpperCase(), PAGE_WIDTH / 2, PAGE_HEIGHT * 0.84, { align: 'center' })

  // Date and location
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text(new Date().toLocaleDateString('en-IN', { dateStyle: 'long' }).toUpperCase(), PAGE_WIDTH / 2, PAGE_HEIGHT * 0.89, { align: 'center' })
  pdf.text(`${industry.latitude.toFixed(4)}°N, ${industry.longitude.toFixed(4)}°E`, PAGE_WIDTH / 2, PAGE_HEIGHT * 0.93, { align: 'center' })

  // Bottom branding
  pdf.setFontSize(8)
  pdf.text('AETHERSCAN AIR QUALITY INTELLIGENCE PLATFORM', PAGE_WIDTH / 2, PAGE_HEIGHT - 8, { align: 'center' })
}

/**
 * TABLE OF CONTENTS - Professional
 */
function addTableOfContents(pdf: jsPDF) {
  pdf.addPage()

  // Header bar
  const cyan = hexToRgb(COLORS.primary)
  pdf.setFillColor(cyan.r, cyan.g, cyan.b)
  pdf.rect(0, 0, PAGE_WIDTH, 40, 'F')

  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(28)
  pdf.text('CONTENTS', MARGIN, 25)

  let yPos = 55

  const contents = [
    { num: '1', title: 'Executive Summary', page: '3' },
    { num: '2', title: 'Data Sources & Methodology', page: '4' },
    { num: '3', title: 'Air Quality Analysis', page: '5' },
    { num: '4', title: 'Geographic Analysis', page: '8' },
    { num: '5', title: 'Regulatory Compliance', page: '9' },
    { num: '6', title: 'Meteorological Conditions', page: '10' },
    { num: '7', title: 'Fire Detection Analysis', page: '12' },
    { num: '8', title: 'Recommendations', page: '14' },
    { num: '9', title: 'Conclusions', page: '15' },
  ]

  contents.forEach((item, index) => {
    // Number box
    pdf.setFillColor(cyan.r, cyan.g, cyan.b, 0.1)
    pdf.roundedRect(MARGIN, yPos, 12, 12, 1, 1, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(cyan.r, cyan.g, cyan.b)
    pdf.text(item.num, MARGIN + 6, yPos + 8, { align: 'center' })

    // Title
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    pdf.setTextColor(30, 30, 30)
    pdf.text(item.title, MARGIN + 18, yPos + 8)

    // Dotted line
    pdf.setDrawColor(180, 180, 180)
    pdf.setLineWidth(0.1)
    const dots = 50
    for (let i = 0; i < dots; i++) {
      pdf.circle(MARGIN + 90 + (i * 1.5), yPos + 6, 0.2, 'F')
    }

    // Page number
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(cyan.r, cyan.g, cyan.b)
    pdf.text(item.page, PAGE_WIDTH - MARGIN - 10, yPos + 8)

    yPos += 18
  })
}

/**
 * SECTION HEADER - Executive Style
 */
function addExecutiveSectionHeader(pdf: jsPDF, number: string, title: string, yPos: number): number {
  const cyan = hexToRgb(COLORS.primary)

  // Full-width header bar
  pdf.setFillColor(cyan.r, cyan.g, cyan.b)
  pdf.rect(0, yPos, PAGE_WIDTH, 12, 'F')

  // White text
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text(`${number}. ${title.toUpperCase()}`, MARGIN, yPos + 8)

  return yPos + 18
}

/**
 * EXECUTIVE SUMMARY - Two Column Layout
 */
function addExecutiveExecutiveSummary(pdf: jsPDF, industry: IndustryData, aqiData: AQIData | null): number {
  pdf.addPage()
  let yPos = addExecutiveSectionHeader(pdf, '1', 'Executive Summary', MARGIN)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9.5)
  pdf.setTextColor(50, 50, 50)

  const summaryText = `This comprehensive environmental impact assessment evaluates air quality conditions at ${industry.name}, located at ${industry.latitude.toFixed(4)}°N, ${industry.longitude.toFixed(4)}°E. The analysis follows CPCB standards and WHO guidelines for air quality evaluation.`

  yPos = addSafeText(pdf, [summaryText], MARGIN, yPos, CONTENT_WIDTH)
  yPos += 6

  if (aqiData) {
    const pollutants = extractPollutants(aqiData)
    const limits: Record<string, number> = { pm25: 60, pm10: 100, no2: 80, so2: 80, co: 2000, o3: 100 }
    const exceedances = Object.entries(pollutants).filter(([key, value]) => {
      const limit = limits[key]
      return limit && value > limit
    })

    // AQI Status Box - Large and Prominent
    const aqiColor = hexToRgb(aqiData.color)
    const boxH = 45

    // Shadow
    pdf.setFillColor(0, 0, 0, 0.1)
    pdf.roundedRect(MARGIN + 1, yPos + 1, CONTENT_WIDTH, boxH, 2, 2, 'F')

    // Main box
    pdf.setFillColor(aqiColor.r, aqiColor.g, aqiColor.b, 0.1)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, boxH, 2, 2, 'F')
    pdf.setDrawColor(aqiColor.r, aqiColor.g, aqiColor.b)
    pdf.setLineWidth(1)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, boxH, 2, 2, 'D')

    // Large AQI number - Left
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(40)
    pdf.setTextColor(aqiColor.r, aqiColor.g, aqiColor.b)
    pdf.text(aqiData.aqi.toString(), MARGIN + 15, yPos + 30)

    // Vertical line
    pdf.setDrawColor(aqiColor.r, aqiColor.g, aqiColor.b, 0.3)
    pdf.setLineWidth(0.5)
    pdf.line(MARGIN + 50, yPos + 8, MARGIN + 50, yPos + boxH - 8)

    // Category - Middle
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(80, 80, 80)
    pdf.text('CATEGORY', MARGIN + 58, yPos + 15)
    pdf.setFontSize(14)
    pdf.setTextColor(aqiColor.r, aqiColor.g, aqiColor.b)
    pdf.text(aqiData.category.toUpperCase(), MARGIN + 58, yPos + 27)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    const healthMsg = aqiData.aqi > 200 ? 'Serious health effects' : aqiData.aqi > 100 ? 'Health concerns' : 'Acceptable quality'
    pdf.text(healthMsg, MARGIN + 58, yPos + 36)

    // Dominant pollutant - Right
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(80, 80, 80)
    pdf.text('DOMINANT POLLUTANT', MARGIN + CONTENT_WIDTH - 60, yPos + 15)
    pdf.setFontSize(14)
    pdf.setTextColor(30, 30, 30)
    pdf.text(aqiData.dominant_pollutant?.toUpperCase() || 'N/A', MARGIN + CONTENT_WIDTH - 60, yPos + 27)

    yPos += boxH + 10

    // Compliance Status
    if (exceedances.length > 0) {
      pdf.setFillColor(239, 68, 68, 0.1)
      pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 8 + (exceedances.length * 5), 1, 1, 'F')

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(185, 28, 28)
      pdf.text(`⚠ COMPLIANCE ALERT: ${exceedances.length} Pollutant(s) Exceed Limits`, MARGIN + 3, yPos + 6)

      yPos += 11
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(127, 29, 29)
      exceedances.forEach(([pollutant, value]) => {
        const limit = limits[pollutant]
        const excess = ((value - limit) / limit * 100).toFixed(0)
        pdf.text(`• ${pollutant.toUpperCase()}: ${value.toFixed(1)} μg/m³ (${excess}% above ${limit} limit)`, MARGIN + 6, yPos)
        yPos += 5
      })
      yPos += 5
    } else {
      pdf.setFillColor(16, 185, 129, 0.1)
      pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 10, 1, 1, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(5, 150, 105)
      pdf.text('✓ COMPLIANCE STATUS: All parameters within NAAQS limits', MARGIN + 3, yPos + 7)
      yPos += 14
    }
  }

  return yPos
}

/**
 * DATA SOURCES & METHODOLOGY - Professional Layout
 */
function addDataSourcesMethodology(pdf: jsPDF, aqiData: AQIData | null): number {
  pdf.addPage()
  let yPos = addExecutiveSectionHeader(pdf, '2', 'Data Sources & Methodology', MARGIN)

  const cyan = hexToRgb(COLORS.primary)
  const green = hexToRgb(COLORS.green)
  const orange = hexToRgb(COLORS.orange)

  // Data sources with icon boxes
  const sources = [
    { name: 'Air Quality', source: 'OpenAQ & Government Sensors', quality: 'HIGH', color: green },
    { name: 'Meteorology', source: 'NASA POWER Satellite Data', quality: 'HIGH', color: green },
    { name: 'Fire Detection', source: 'NASA FIRMS (VIIRS/MODIS)', quality: 'MEDIUM', color: orange },
  ]

  sources.forEach((item, idx) => {
    // Icon box (cyan square)
    pdf.setFillColor(cyan.r, cyan.g, cyan.b, 0.15)
    pdf.roundedRect(MARGIN, yPos, 8, 8, 1, 1, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(cyan.r, cyan.g, cyan.b)
    pdf.text((idx + 1).toString(), MARGIN + 4, yPos + 5.5, { align: 'center' })

    // Title
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(30, 30, 30)
    pdf.text(item.name, MARGIN + 12, yPos + 4)

    // Source
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text(item.source, MARGIN + 12, yPos + 8.5)

    // Quality badge
    pdf.setFillColor(item.color.r, item.color.g, item.color.b, 0.15)
    pdf.roundedRect(PAGE_WIDTH - MARGIN - 35, yPos + 1, 32, 6, 1, 1, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(item.color.r, item.color.g, item.color.b)
    pdf.text(item.quality, PAGE_WIDTH - MARGIN - 19, yPos + 5, { align: 'center' })

    yPos += 12
  })

  yPos += 5

  // Methodology text
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(50, 50, 50)

  const methodText = [
    'This assessment integrates multiple authoritative data sources to provide comprehensive environmental analysis:',
    '',
    '• Real-time air quality measurements from government-certified monitoring stations',
    '• Satellite-derived meteorological parameters for atmospheric dispersion modeling',
    '• Active fire detection from thermal satellite imagery (24-48 hour latency)',
    '• Regulatory compliance evaluated against CPCB National Ambient Air Quality Standards',
  ]

  yPos = addSafeText(pdf, methodText, MARGIN, yPos, CONTENT_WIDTH)

  return yPos + 10
}

/**
 * AIR QUALITY ANALYSIS - With Charts
 */
async function addAirQualityAnalysis(pdf: jsPDF, aqiData: AQIData | null, cleanPollutants: Record<string, number>): Promise<number> {
  pdf.addPage()
  let yPos = addExecutiveSectionHeader(pdf, '3', 'Air Quality Analysis', MARGIN)

  const cyan = hexToRgb(COLORS.primary)

  if (!aqiData || Object.keys(cleanPollutants).length === 0) {
    // No data available box
    pdf.setFillColor(254, 249, 195)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 25, 2, 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(146, 64, 14)
    pdf.text('⚠ Air Quality Data Unavailable', MARGIN + 3, yPos + 10)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.text('No valid air quality measurements available for this location and time period.', MARGIN + 3, yPos + 18)
    return yPos + 30
  }

  // Pollutant concentration bar chart
  try {
    const pollutantChart = createPollutantBarChart(cleanPollutants)
    const chartImg = await generateChartImage(pollutantChart, 700, 350)

    const chartW = CONTENT_WIDTH
    const chartH = (chartW * 350) / 700

    pdf.addImage(chartImg, 'PNG', MARGIN, yPos, chartW, chartH)
    yPos += chartH + 8

    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('Figure 1: Current Pollutant Concentrations (μg/m³)', MARGIN, yPos)
    yPos += 10
  } catch (error) {
    console.error('Pollutant chart failed:', error)
    yPos += 5
  }

  // Compliance comparison chart
  try {
    const comparisonChart = createComparisonChart(cleanPollutants)
    const chartImg = await generateChartImage(comparisonChart, 700, 350)

    const chartW = CONTENT_WIDTH
    const chartH = (chartW * 350) / 700

    if (yPos + chartH > PAGE_HEIGHT - 20) {
      pdf.addPage()
      yPos = MARGIN
    }

    pdf.addImage(chartImg, 'PNG', MARGIN, yPos, chartW, chartH)
    yPos += chartH + 8

    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('Figure 2: Regulatory Compliance Analysis (NAAQS Limits)', MARGIN, yPos)
    yPos += 10
  } catch (error) {
    console.error('Comparison chart failed:', error)
    yPos += 5
  }

  // Health risk radar (requires AQI value)
  if (aqiData) {
    try {
      const radarChart = createHealthRiskRadarChart(aqiData.aqi)
      const chartImg = await generateChartImage(radarChart, 600, 400)

      const chartW = CONTENT_WIDTH * 0.85
      const chartH = (chartW * 400) / 600

      if (yPos + chartH > PAGE_HEIGHT - 20) {
        pdf.addPage()
        yPos = MARGIN
      }

      pdf.addImage(chartImg, 'PNG', MARGIN + (CONTENT_WIDTH - chartW) / 2, yPos, chartW, chartH)
      yPos += chartH + 8

      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      pdf.text('Figure 3: Multi-Pollutant Health Risk Profile', MARGIN, yPos)
      yPos += 10
    } catch (error) {
      console.error('Radar chart failed:', error)
      yPos += 5
    }
  }

  return yPos
}

/**
 * GEOGRAPHIC ANALYSIS - With Map
 */
async function addGeographicAnalysis(pdf: jsPDF, industry: IndustryData, mapImage: string | null): Promise<number> {
  pdf.addPage()
  let yPos = addExecutiveSectionHeader(pdf, '4', 'Geographic Analysis', MARGIN)

  const cyan = hexToRgb(COLORS.primary)

  // Facility info card
  pdf.setFillColor(cyan.r, cyan.g, cyan.b, 0.08)
  pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 18, 2, 2, 'F')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(30, 30, 30)
  pdf.text('Facility Location', MARGIN + 3, yPos + 6)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(60, 60, 60)
  pdf.text(`Latitude: ${industry.latitude.toFixed(4)}°N`, MARGIN + 3, yPos + 11)
  pdf.text(`Longitude: ${industry.longitude.toFixed(4)}°E`, MARGIN + 3, yPos + 15)

  if (industry.type) {
    pdf.text(`Type: ${industry.type}`, MARGIN + 70, yPos + 11)
  }

  yPos += 22

  // Map screenshot
  if (mapImage) {
    const mapW = CONTENT_WIDTH
    const mapH = mapW * 0.6 // 5:3 aspect ratio

    // Shadow
    pdf.setFillColor(0, 0, 0, 0.08)
    pdf.rect(MARGIN + 1, yPos + 1, mapW, mapH, 'F')

    // Border
    pdf.setDrawColor(cyan.r, cyan.g, cyan.b)
    pdf.setLineWidth(0.5)
    pdf.rect(MARGIN, yPos, mapW, mapH, 'D')

    // Map image
    pdf.addImage(mapImage, 'PNG', MARGIN, yPos, mapW, mapH)
    yPos += mapH + 8

    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('Figure 4: Geographic Context and Active Monitoring Layers', MARGIN, yPos)
    yPos += 10
  } else {
    // No map available
    pdf.setFillColor(254, 249, 195)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 20, 2, 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(146, 64, 14)
    pdf.text('⚠ Map Screenshot Unavailable', MARGIN + 3, yPos + 9)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.text('Map visualization could not be captured. Coordinates provided above.', MARGIN + 3, yPos + 16)
    yPos += 25
  }

  return yPos
}

/**
 * REGULATORY COMPLIANCE - Professional Table
 */
function addRegulatoryCompliance(pdf: jsPDF, cleanPollutants: Record<string, number>): number {
  pdf.addPage()
  let yPos = addExecutiveSectionHeader(pdf, '5', 'Regulatory Compliance', MARGIN)

  const cyan = hexToRgb(COLORS.primary)
  const red = hexToRgb(COLORS.red)
  const green = hexToRgb(COLORS.green)

  // NAAQS limits
  const limits: Record<string, { limit: number; unit: string; standard: string }> = {
    pm25: { limit: 60, unit: 'μg/m³', standard: 'CPCB NAAQS (24h avg)' },
    pm10: { limit: 100, unit: 'μg/m³', standard: 'CPCB NAAQS (24h avg)' },
    no2: { limit: 80, unit: 'μg/m³', standard: 'CPCB NAAQS (24h avg)' },
    so2: { limit: 80, unit: 'μg/m³', standard: 'CPCB NAAQS (24h avg)' },
    co: { limit: 2000, unit: 'μg/m³', standard: 'CPCB NAAQS (8h avg)' },
    o3: { limit: 100, unit: 'μg/m³', standard: 'CPCB NAAQS (8h avg)' },
  }

  // Build table data
  const tableData: string[][] = []
  Object.entries(cleanPollutants).forEach(([pollutant, value]) => {
    const limitInfo = limits[pollutant.toLowerCase()]
    if (limitInfo) {
      const compliant = value <= limitInfo.limit
      const status = compliant ? '✓ Compliant' : '✗ Exceeds'
      const excess = compliant ? '-' : `+${((value - limitInfo.limit) / limitInfo.limit * 100).toFixed(0)}%`

      tableData.push([
        pollutant.toUpperCase(),
        value.toFixed(1),
        limitInfo.limit.toString(),
        limitInfo.unit,
        status,
        excess,
      ])
    }
  })

  // Professional table
  autoTable(pdf, {
    head: [['Pollutant', 'Measured', 'Limit', 'Unit', 'Status', 'Deviation']],
    body: tableData,
    startY: yPos,
    theme: 'grid',
    headStyles: {
      fillColor: [cyan.r, cyan.g, cyan.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left', cellWidth: 30 },
      1: { halign: 'right', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 25 },
      3: { halign: 'center', cellWidth: 25 },
      4: { halign: 'center', cellWidth: 35 },
      5: { halign: 'center', cellWidth: 30 },
    },
    didParseCell: (data) => {
      // Color code status column
      if (data.column.index === 4 && data.row.index > 0) {
        const status = data.cell.text[0]
        if (status.includes('✓')) {
          data.cell.styles.textColor = [green.r, green.g, green.b]
          data.cell.styles.fontStyle = 'bold'
        } else if (status.includes('✗')) {
          data.cell.styles.textColor = [red.r, red.g, red.b]
          data.cell.styles.fontStyle = 'bold'
        }
      }
      // Color code deviation column
      if (data.column.index === 5 && data.row.index > 0) {
        const deviation = data.cell.text[0]
        if (deviation !== '-' && deviation.startsWith('+')) {
          data.cell.styles.textColor = [red.r, red.g, red.b]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  yPos = (pdf as any).lastAutoTable.finalY + 10

  // Summary box
  const exceedances = Object.entries(cleanPollutants).filter(([key, value]) => {
    const limitInfo = limits[key.toLowerCase()]
    return limitInfo && value > limitInfo.limit
  })

  if (exceedances.length > 0) {
    pdf.setFillColor(red.r, red.g, red.b, 0.1)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 12, 2, 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(red.r, red.g, red.b)
    pdf.text(`⚠ NON-COMPLIANCE: ${exceedances.length} of ${Object.keys(cleanPollutants).length} measured pollutants exceed NAAQS limits`, MARGIN + 3, yPos + 8)
    yPos += 15
  } else {
    pdf.setFillColor(green.r, green.g, green.b, 0.1)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 12, 2, 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(green.r, green.g, green.b)
    pdf.text(`✓ FULL COMPLIANCE: All ${Object.keys(cleanPollutants).length} measured pollutants within NAAQS limits`, MARGIN + 3, yPos + 8)
    yPos += 15
  }

  return yPos
}

/**
 * METEOROLOGICAL CONDITIONS - With Data Table
 */
async function addMeteorologicalConditions(pdf: jsPDF, industry: IndustryData): Promise<number> {
  pdf.addPage()
  let yPos = addExecutiveSectionHeader(pdf, '6', 'Meteorological Conditions', MARGIN)

  const cyan = hexToRgb(COLORS.primary)

  try {
    // Fetch meteorology
    const meteoData = await fetchMeteorology(industry.latitude, industry.longitude)

    // Meteorology table
    const meteoTableData = createMeteoTableData(meteoData)

    autoTable(pdf, {
      head: [['Parameter', 'Value', 'Source']],
      body: meteoTableData,
      startY: yPos,
      theme: 'grid',
      headStyles: {
        fillColor: [cyan.r, cyan.g, cyan.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [40, 40, 40],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { halign: 'right', cellWidth: 50 },
        2: { halign: 'center', cellWidth: 60 },
      },
    })

    yPos = (pdf as any).lastAutoTable.finalY + 10

    // Atmospheric stability
    const stability = calculateAtmosphericStability(meteoData.temperature, meteoData.windSpeed)
    const dispersal = assessPollutionDispersal(meteoData.windSpeed, meteoData.windDirection, 100, meteoData.temperature)

    // Stability info box
    pdf.setFillColor(cyan.r, cyan.g, cyan.b, 0.08)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 22, 2, 2, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(30, 30, 30)
    pdf.text('Atmospheric Stability Analysis', MARGIN + 3, yPos + 6)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(60, 60, 60)
    pdf.text(`Stability Class: ${stability.stabilityClass} (${stability.stabilityName})`, MARGIN + 3, yPos + 11)
    pdf.text(`Dispersal Index: ${dispersal.dispersalIndex}/100 (${dispersal.category})`, MARGIN + 3, yPos + 15.5)
    pdf.text(`Wind: ${getWindDirectionName(meteoData.windDirection)} at ${meteoData.windSpeed.toFixed(1)} m/s`, MARGIN + 3, yPos + 20)

    yPos += 26

  } catch (error) {
    console.error('Meteorology section failed:', error)
    pdf.setFillColor(254, 249, 195)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 20, 2, 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(146, 64, 14)
    pdf.text('⚠ Meteorological Data Unavailable', MARGIN + 3, yPos + 9)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.text('Could not retrieve meteorological conditions for this location.', MARGIN + 3, yPos + 16)
    yPos += 25
  }

  return yPos
}

/**
 * FIRE DETECTION ANALYSIS - With Charts
 */
async function addFireDetectionAnalysis(pdf: jsPDF, industry: IndustryData, aqiData: AQIData | null): Promise<number> {
  pdf.addPage()
  let yPos = addExecutiveSectionHeader(pdf, '7', 'Fire Detection Analysis', MARGIN)

  const cyan = hexToRgb(COLORS.primary)
  const orange = hexToRgb(COLORS.orange)

  try {
    // Fetch fire data
    const fireData = await fetchFireData(industry.latitude, industry.longitude, 50)
    const fireSummary = generateFireSummary(fireData)

    // Get fire impact (requires meteorology for wind direction and pollutant data)
    let fireImpact: any = null
    if (aqiData && fireData.length > 0) {
      try {
        const meteo = await fetchMeteorology(industry.latitude, industry.longitude)
        const pollutants = extractPollutants(aqiData)
        fireImpact = analyzeFireImpact(fireData, aqiData.aqi, meteo.windDirection, pollutants.pm25 || 0)
      } catch (error) {
        console.warn('Could not analyze fire impact:', error)
      }
    }

    // Fire summary table
    const fireTableData = createFireTableData(fireSummary)

    autoTable(pdf, {
      head: [['Metric', 'Value', 'Details']],
      body: fireTableData,
      startY: yPos,
      theme: 'grid',
      headStyles: {
        fillColor: [orange.r, orange.g, orange.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [40, 40, 40],
      },
      alternateRowStyles: {
        fillColor: [254, 249, 245],
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55 },
        1: { halign: 'right', cellWidth: 40 },
        2: { cellWidth: 75 },
      },
    })

    yPos = (pdf as any).lastAutoTable.finalY + 10

    // Fire impact chart
    if (aqiData) {
      try {
        const fireChart = createFireAQICorrelationChart(fireSummary.firesByDistance, aqiData.aqi)
        const chartImg = await generateChartImage(fireChart, 700, 350)

        const chartW = CONTENT_WIDTH
        const chartH = (chartW * 350) / 700

        if (yPos + chartH > PAGE_HEIGHT - 20) {
          pdf.addPage()
          yPos = MARGIN
        }

        pdf.addImage(chartImg, 'PNG', MARGIN, yPos, chartW, chartH)
        yPos += chartH + 8

        pdf.setFont('helvetica', 'italic')
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        pdf.text('Figure 5: Fire Distribution and Estimated Air Quality Impact', MARGIN, yPos)
        yPos += 10
      } catch (error) {
        console.error('Fire chart failed:', error)
      }
    }

    // Impact assessment
    if (fireImpact) {
      pdf.setFillColor(orange.r, orange.g, orange.b, 0.1)
      pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 15, 2, 2, 'F')

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(orange.r, orange.g, orange.b)
      pdf.text(`Fire Impact: ${fireImpact.correlationWithAQI.toUpperCase()} (${fireImpact.likelyContribution.toFixed(0)}% PM2.5 contribution)`, MARGIN + 3, yPos + 6)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(80, 80, 80)
      pdf.text(fireImpact.explanation, MARGIN + 3, yPos + 11)

      yPos += 18
    }

  } catch (error) {
    console.error('Fire detection failed:', error)
    pdf.setFillColor(254, 249, 195)
    pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 20, 2, 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(146, 64, 14)
    pdf.text('⚠ Fire Detection Data Unavailable', MARGIN + 3, yPos + 9)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.text('Could not retrieve active fire detections for this region.', MARGIN + 3, yPos + 16)
    yPos += 25
  }

  return yPos
}

/**
 * RECOMMENDATIONS - Professional List
 */
function addRecommendations(pdf: jsPDF, cleanPollutants: Record<string, number>, aqiData: AQIData | null): number {
  pdf.addPage()
  let yPos = addExecutiveSectionHeader(pdf, '8', 'Recommendations', MARGIN)

  const cyan = hexToRgb(COLORS.primary)

  // Determine recommendations based on AQI and exceedances
  const recommendations: string[] = []

  if (!aqiData || Object.keys(cleanPollutants).length === 0) {
    recommendations.push('Establish continuous air quality monitoring at this location')
    recommendations.push('Implement baseline environmental assessment program')
  } else {
    const limits: Record<string, number> = { pm25: 60, pm10: 100, no2: 80, so2: 80, co: 2000, o3: 100 }
    const exceedances = Object.entries(cleanPollutants).filter(([key, value]) => {
      const limit = limits[key]
      return limit && value > limit
    })

    if (exceedances.length > 0) {
      recommendations.push('IMMEDIATE ACTION REQUIRED: Implement pollution control measures for non-compliant parameters')
      recommendations.push('Conduct root cause analysis for elevated pollutant concentrations')
      recommendations.push('Enhance emission control systems and monitoring frequency')
      recommendations.push('Develop pollution mitigation action plan with timeline')
    }

    if (aqiData.aqi > 100) {
      recommendations.push('Issue health advisory for sensitive groups (children, elderly, respiratory patients)')
      recommendations.push('Consider temporary operational adjustments during peak pollution periods')
    }

    if (aqiData.aqi > 200) {
      recommendations.push('CRITICAL: Implement emergency pollution reduction protocols')
      recommendations.push('Restrict outdoor activities and consider operational shutdown if AQI remains severe')
    }

    // General recommendations
    recommendations.push('Continue real-time monitoring and data validation')
    recommendations.push('Implement green belt development and dust suppression measures')
    recommendations.push('Conduct quarterly environmental audits and compliance reviews')
    recommendations.push('Maintain meteorological monitoring for dispersion modeling')
  }

  // Numbered recommendations
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(50, 50, 50)

  recommendations.forEach((rec, idx) => {
    // Number circle
    pdf.setFillColor(cyan.r, cyan.g, cyan.b, 0.15)
    pdf.circle(MARGIN + 4, yPos + 3, 3.5, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(cyan.r, cyan.g, cyan.b)
    pdf.text((idx + 1).toString(), MARGIN + 4, yPos + 4.5, { align: 'center' })

    // Recommendation text
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(50, 50, 50)

    const textLines = pdf.splitTextToSize(rec, CONTENT_WIDTH - 12)
    textLines.forEach((line: string, lineIdx: number) => {
      pdf.text(line, MARGIN + 10, yPos + 4.5 + (lineIdx * 4.5))
    })

    yPos += textLines.length * 4.5 + 3

    if (yPos > PAGE_HEIGHT - 30) {
      pdf.addPage()
      yPos = MARGIN
    }
  })

  return yPos + 10
}

/**
 * CONCLUSIONS - Executive Summary
 */
function addConclusions(pdf: jsPDF, aqiData: AQIData | null, industry: IndustryData): number {
  pdf.addPage()
  let yPos = addExecutiveSectionHeader(pdf, '9', 'Conclusions', MARGIN)

  const cyan = hexToRgb(COLORS.primary)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9.5)
  pdf.setTextColor(50, 50, 50)

  const conclusions: string[] = []

  if (!aqiData) {
    conclusions.push(
      `This environmental impact assessment for ${industry.name} could not be fully completed due to insufficient air quality data availability. Establishment of continuous monitoring infrastructure is strongly recommended.`
    )
  } else {
    const aqiStatus = aqiData.aqi <= 50 ? 'satisfactory' : aqiData.aqi <= 100 ? 'acceptable but concerning' : aqiData.aqi <= 200 ? 'unhealthy and requires immediate attention' : 'hazardous and demands urgent action'

    conclusions.push(
      `This comprehensive environmental impact assessment for ${industry.name} reveals that air quality conditions are currently ${aqiStatus}, with an Air Quality Index of ${aqiData.aqi} (${aqiData.category}).`
    )

    conclusions.push(
      'The analysis integrates real-time air quality measurements, satellite-derived meteorological conditions, and active fire detection data to provide a holistic environmental perspective.'
    )

    if (aqiData.aqi > 100) {
      conclusions.push(
        'The elevated pollution levels identified in this assessment require immediate mitigation measures and enhanced monitoring to protect public health and ensure regulatory compliance.'
      )
    } else {
      conclusions.push(
        'While current air quality parameters are within acceptable ranges, continuous monitoring and proactive pollution prevention measures remain essential to maintain environmental standards.'
      )
    }

    conclusions.push(
      'All findings and recommendations in this report are based on scientifically validated methodologies and authoritative data sources. Implementation of suggested actions will enhance environmental performance and regulatory compliance.'
    )
  }

  yPos = addSafeText(pdf, conclusions, MARGIN, yPos, CONTENT_WIDTH)

  yPos += 15

  // Signature block
  pdf.setFillColor(cyan.r, cyan.g, cyan.b, 0.05)
  pdf.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 35, 2, 2, 'F')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(30, 30, 30)
  pdf.text('Report Generated By:', MARGIN + 3, yPos + 8)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(cyan.r, cyan.g, cyan.b)
  pdf.text('AETHERSCAN', MARGIN + 3, yPos + 15)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(100, 100, 100)
  pdf.text('Air Quality Intelligence Platform', MARGIN + 3, yPos + 20)
  pdf.text(`Report Date: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, MARGIN + 3, yPos + 25)
  pdf.text(`Location: ${industry.latitude.toFixed(4)}°N, ${industry.longitude.toFixed(4)}°E`, MARGIN + 3, yPos + 30)

  return yPos + 40
}

/**
 * PROFESSIONAL HEADERS AND FOOTERS
 */
function addProfessionalHeadersFooters(pdf: jsPDF, industry: IndustryData) {
  const cyan = hexToRgb(COLORS.primary)
  const pageCount = (pdf as any).internal.getNumberOfPages()

  for (let i = 3; i <= pageCount; i++) {
    pdf.setPage(i)

    // Top header line
    pdf.setDrawColor(cyan.r, cyan.g, cyan.b, 0.3)
    pdf.setLineWidth(0.3)
    pdf.line(MARGIN, 8, PAGE_WIDTH - MARGIN, 8)

    // Header text
    pdf.setFontSize(7)
    pdf.setTextColor(120, 120, 120)
    pdf.setFont('helvetica', 'normal')
    pdf.text('ENVIRONMENTAL IMPACT ASSESSMENT', MARGIN, 6)
    const facilityShort = industry.name.substring(0, 45) + (industry.name.length > 45 ? '...' : '')
    pdf.text(facilityShort.toUpperCase(), PAGE_WIDTH - MARGIN, 6, { align: 'right' })

    // Bottom footer line
    pdf.setDrawColor(cyan.r, cyan.g, cyan.b, 0.3)
    pdf.setLineWidth(0.3)
    pdf.line(MARGIN, PAGE_HEIGHT - 10, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10)

    // Footer text
    pdf.setFontSize(7)
    pdf.setTextColor(120, 120, 120)
    pdf.text('AetherScan Platform', MARGIN, PAGE_HEIGHT - 6)
    pdf.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 6, { align: 'center' })
    pdf.text(new Date().toLocaleDateString('en-IN'), PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 6, { align: 'right' })
  }
}

/**
 * MAIN GENERATION FUNCTION
 */
export async function generateExecutivePDF(
  industry: IndustryData,
  aqiData: AQIData | null,
  mapRef?: RefObject<MapRef> | null
): Promise<void> {
  console.log('=== EXECUTIVE PDF GENERATION STARTED ===')

  const pdf = new jsPDF('p', 'mm', 'a4')

  try {
    // Step 0: Data validation and cleaning
    console.log('Step 0: Data validation and cleaning')
    const cleanedData = cleanDataForPDF(aqiData)
    let cleanPollutants: Record<string, number> = {}

    if (cleanedData) {
      cleanPollutants = cleanedData.pollutants
      console.log(`✓ Data quality: ${cleanedData.dataQualityScore}%`)
      if (cleanedData.cleaningReport.removedValues.length > 0) {
        console.warn('Removed invalid values:', cleanedData.cleaningReport.removedValues)
      }
    }

    // Step 1: Capture map screenshot
    let mapImage: string | null = null
    if (mapRef?.current) {
      try {
        console.log('Step 1: Capturing map screenshot...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        mapImage = await captureMapCanvas(mapRef, 800, 600)
        console.log('✓ Map screenshot captured successfully')
      } catch (error) {
        console.warn('Map capture failed:', error)
        mapImage = null
      }
    }

    // Cover page
    console.log('Page 1: Executive Cover')
    addExecutiveCoverPage(pdf, industry)

    // Table of contents
    console.log('Page 2: Table of Contents')
    addTableOfContents(pdf)

    // Executive summary
    console.log('Page 3: Executive Summary')
    addExecutiveExecutiveSummary(pdf, industry, aqiData)

    // Data sources & methodology
    console.log('Page 4: Data Sources & Methodology')
    addDataSourcesMethodology(pdf, aqiData)

    // Air quality analysis
    console.log('Page 5+: Air Quality Analysis')
    await addAirQualityAnalysis(pdf, aqiData, cleanPollutants)

    // Geographic analysis
    console.log('Page: Geographic Analysis')
    await addGeographicAnalysis(pdf, industry, mapImage)

    // Regulatory compliance
    console.log('Page: Regulatory Compliance')
    addRegulatoryCompliance(pdf, cleanPollutants)

    // Meteorological conditions
    console.log('Page: Meteorological Conditions')
    await addMeteorologicalConditions(pdf, industry)

    // Fire detection analysis
    console.log('Page: Fire Detection Analysis')
    await addFireDetectionAnalysis(pdf, industry, aqiData)

    // Recommendations
    console.log('Page: Recommendations')
    addRecommendations(pdf, cleanPollutants, aqiData)

    // Conclusions
    console.log('Page: Conclusions')
    addConclusions(pdf, aqiData, industry)

    // Add professional headers and footers
    console.log('Final: Adding headers/footers')
    addProfessionalHeadersFooters(pdf, industry)

    // Open in new tab
    const pdfBlob = pdf.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    window.open(pdfUrl, '_blank')

    console.log('=== EXECUTIVE PDF GENERATION COMPLETE ===')
  } catch (error) {
    console.error('PDF generation failed:', error)
    throw error
  }
}
