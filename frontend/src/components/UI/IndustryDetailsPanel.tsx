// Industry Details Panel - Environmental Evidence Chain
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Factory,
  Zap,
  MapPin,
  AlertTriangle,
  Download,
  Link as LinkIcon,
  ShieldAlert,
  Activity,
  CheckCircle2,
  Flame,
  RefreshCw,
  Radio,
  HelpCircle,
  FileCheck,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { facilityAPI } from '@/lib/api'
import type { FacilityEvidenceChain, EvidenceChainGroundSensor, EvidenceChainFireEvent } from '@/lib/types'

interface IndustryDetailsPanelProps {
  data: {
    id?: string | number
    name: string
    type?: string
    industry_type?: string
    capacity?: number | string
    capacity_mw?: number
    fuel_type?: string
    owner?: string
    commissioning_year?: number | string
    latitude: number
    longitude: number
    source?: string
    gppd_id?: string
    [key: string]: any
  }
  aqiData?: {
    aqi: number
    category: string
    color: string
    dataQualityScore?: number
    fusionConfidenceScore?: number
    isStale?: boolean
    isUnavailable?: boolean
  } | null
  onClose: () => void
  onDownloadReport?: () => void
}

const RADIUS_OPTIONS = [5, 10, 25, 50]

export default function IndustryDetailsPanel({
  data,
  aqiData,
  onClose,
  onDownloadReport,
}: IndustryDetailsPanelProps) {
  const [downloading, setDownloading] = useState(false)
  const [radiusKm, setRadiusKm] = useState<number>(10)
  const [evidenceChain, setEvidenceChain] = useState<FacilityEvidenceChain | null>(null)
  const [loadingEvidence, setLoadingEvidence] = useState<boolean>(true)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'evidence' | 'compliance' | 'facility'>('evidence')

  const fetchEvidence = useCallback(async (rKm: number) => {
    setLoadingEvidence(true)
    setEvidenceError(null)
    try {
      const facilityId = data.id || data.gppd_id || data.name || 'facility'
      const chain = await facilityAPI.getEvidenceChain(
        facilityId,
        rKm,
        data.latitude,
        data.longitude,
        data.name
      )
      setEvidenceChain(chain)
    } catch (err: any) {
      console.warn('Failed to load evidence chain:', err)
      setEvidenceError(err?.response?.data?.detail || 'Evidence chain data unavailable for this sector.')
      setEvidenceChain(null)
    } finally {
      setLoadingEvidence(false)
    }
  }, [data])

  useEffect(() => {
    fetchEvidence(radiusKm)
  }, [fetchEvidence, radiusKm])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      if (onDownloadReport) {
        await onDownloadReport()
      }
    } finally {
      setDownloading(false)
    }
  }

  const getFcsTierColor = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'high':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      case 'moderate':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      case 'low':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30'
    }
  }

  const getComplianceBadge = (status?: string) => {
    switch (status) {
      case 'compliant':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            NAAQS Compliant
          </span>
        )
      case 'exceeded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            Standard Exceeded
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
            <HelpCircle className="w-3.5 h-3.5" />
            No Sensor Baseline
          </span>
        )
    }
  }

  const getThermalBadge = (state?: string) => {
    switch (state) {
      case 'CONCURRENT_THERMAL_AND_PM_ANOMALY':
        return {
          label: 'Concurrent Fire & PM Anomaly',
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          icon: <Flame className="w-4 h-4 text-rose-400" />,
        }
      case 'THERMAL_ANOMALY_ONLY':
        return {
          label: 'Thermal Hotspots Detected',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          icon: <Flame className="w-4 h-4 text-amber-400" />,
        }
      case 'ELEVATED_PM_ONLY':
        return {
          label: 'Elevated Ambient Particulate',
          color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
          icon: <Activity className="w-4 h-4 text-yellow-400" />,
        }
      case 'NORMAL_CONDITIONS':
        return {
          label: 'Nominal Baseline Conditions',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
        }
      default:
        return {
          label: 'Data Unavailable',
          color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
          icon: <HelpCircle className="w-4 h-4 text-slate-400" />,
        }
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar"
      >
        <div className="glass rounded-2xl overflow-hidden shadow-2xl border border-white/10 mb-4 bg-slate-950/80 backdrop-blur-xl">
          {/* Header */}
          <div className="relative p-6 bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-800/80 border-b border-white/10">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg glass hover:bg-white/10 transition-all group"
              aria-label="Close panel"
            >
              <X className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
            </button>

            {/* Title & Type */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-900/20">
                <Factory className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 pr-6">
                <h2 className="text-lg font-bold text-white leading-tight line-clamp-2">{data.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium text-cyan-400 uppercase tracking-wide">
                    {data.type || data.industry_type || 'Industrial Plant'}
                  </span>
                  {data.fuel_type && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10">
                      {data.fuel_type}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Location & Radius Control */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1.5 font-mono">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>
                  {data.latitude.toFixed(4)}°N, {data.longitude.toFixed(4)}°E
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-gray-500">Radius:</span>
                <div className="inline-flex rounded-lg bg-black/40 p-0.5 border border-white/10">
                  {RADIUS_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRadiusKm(r)}
                      disabled={loadingEvidence}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                        radiusKm === r
                          ? 'bg-cyan-500 text-white font-semibold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {r}km
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 bg-slate-900/50">
            <button
              onClick={() => setActiveTab('evidence')}
              className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'evidence'
                  ? 'border-cyan-400 text-cyan-400 bg-white/5'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Evidence Chain
            </button>
            <button
              onClick={() => setActiveTab('compliance')}
              className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'compliance'
                  ? 'border-cyan-400 text-cyan-400 bg-white/5'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              Compliance
            </button>
            <button
              onClick={() => setActiveTab('facility')}
              className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'facility'
                  ? 'border-cyan-400 text-cyan-400 bg-white/5'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Facility Specs
            </button>
          </div>

          {/* Main Content Area */}
          <div className="p-5 space-y-5">
            {/* Loading Indicator */}
            {loadingEvidence && (
              <div className="p-6 glass rounded-xl border border-white/5 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                <div className="text-xs text-gray-300 font-mono">
                  Assembling multi-sensor evidence chain ({radiusKm}km)...
                </div>
              </div>
            )}

            {/* Error Message */}
            {!loadingEvidence && evidenceError && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                {evidenceError}
              </div>
            )}

            {/* TAB 1: EVIDENCE CHAIN */}
            {!loadingEvidence && activeTab === 'evidence' && (
              <>
                {/* Fusion Confidence & Ambient Quality Card */}
                {evidenceChain?.ambient_quality && (
                  <div className="p-4 rounded-xl glass border border-white/10 bg-slate-900/40">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-semibold text-gray-200 uppercase tracking-wide">
                          Multi-Sensor Fusion
                        </span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium border ${getFcsTierColor(
                          evidenceChain.ambient_quality.fcs_confidence
                        )}`}
                      >
                        {(evidenceChain.ambient_quality.fcs * 100).toFixed(1)}% FCS (
                        {evidenceChain.ambient_quality.fcs_confidence})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                        <div className="text-[10px] text-gray-400 uppercase">Dominant Pollutant</div>
                        <div className="text-sm font-semibold font-mono text-cyan-400 mt-0.5">
                          {evidenceChain.ambient_quality.dominant_pollutant
                            ? evidenceChain.ambient_quality.dominant_pollutant.toUpperCase()
                            : 'N/A'}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                        <div className="text-[10px] text-gray-400 uppercase">Valid Observations</div>
                        <div className="text-sm font-semibold font-mono text-gray-200 mt-0.5">
                          {evidenceChain.ambient_quality.observations_count} measurements
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Thermal Anomaly Correlation Card */}
                {evidenceChain?.thermal_correlation && (
                  <div className="p-4 rounded-xl glass border border-white/10 bg-slate-900/40">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span className="text-xs font-semibold text-gray-200 uppercase tracking-wide">
                          Thermal Correlation
                        </span>
                      </div>
                      {(() => {
                        const badge = getThermalBadge(evidenceChain.thermal_correlation.state)
                        return (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1 ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        )
                      })()}
                    </div>

                    <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                      {evidenceChain.thermal_correlation.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block">Active Fires</span>
                        <span className="font-mono text-gray-200">
                          {evidenceChain.thermal_correlation.fire_count} hotspots
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block">Max Brightness</span>
                        <span className="font-mono text-gray-200">
                          {evidenceChain.thermal_correlation.max_brightness_k > 0
                            ? `${evidenceChain.thermal_correlation.max_brightness_k} K`
                            : 'Nominal'}
                        </span>
                      </div>
                    </div>

                    {/* Scientific Disclaimer */}
                    <div className="mt-3 p-2 rounded bg-white/5 border border-white/5 text-[10px] text-gray-400 leading-normal">
                      <span className="font-semibold text-gray-300">Observation Note: </span>
                      {evidenceChain.thermal_correlation.disclaimer}
                    </div>
                  </div>
                )}

                {/* Ground Monitoring Stations (OpenAQ) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      Ground Stations ({evidenceChain?.ground_sensors?.length || 0})
                    </h3>
                    <span className="text-[10px] text-gray-500 font-mono">within {radiusKm}km</span>
                  </div>

                  {evidenceChain?.ground_sensors && evidenceChain.ground_sensors.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {evidenceChain.ground_sensors.map((station: EvidenceChainGroundSensor) => (
                        <div
                          key={station.station_id}
                          className="p-3 rounded-lg glass border border-white/5 bg-white/[0.02]"
                        >
                          <div className="flex items-start justify-between mb-1.5">
                            <div>
                              <div className="text-xs font-medium text-gray-200">{station.name}</div>
                              <div className="text-[10px] text-gray-500 font-mono">
                                ID: {station.station_id}
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                              {station.distance_km} km
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {Object.entries(station.parameters || {}).map(([pName, pData]: [string, any]) => (
                              <div
                                key={pName}
                                className="px-2 py-1 rounded bg-black/30 border border-white/5 text-[11px] font-mono flex items-center gap-1.5"
                              >
                                <span className="text-gray-400 uppercase font-semibold">{pName}:</span>
                                <span className="text-white font-bold">{pData.value}</span>
                                <span className="text-gray-500 text-[9px]">{pData.unit}</span>
                                {typeof pData.dqs === 'number' && (
                                  <span className="text-[9px] text-emerald-400 ml-1">
                                    DQS {(pData.dqs * 100).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg glass border border-white/5 text-center text-xs text-gray-400">
                      No ground monitoring stations detected within {radiusKm} km.
                      <div className="mt-1 text-[11px] text-gray-500">
                        Expand buffer radius to 25km or 50km to capture regional sensors.
                      </div>
                    </div>
                  )}
                </div>

                {/* Thermal Hotspots (NASA FIRMS) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      Thermal Hotspots ({evidenceChain?.fire_events?.length || 0})
                    </h3>
                    <span className="text-[10px] text-gray-500 font-mono">NASA FIRMS</span>
                  </div>

                  {evidenceChain?.fire_events && evidenceChain.fire_events.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {evidenceChain.fire_events.map((fire: EvidenceChainFireEvent) => (
                        <div
                          key={fire.id}
                          className="p-2.5 rounded-lg glass border border-white/5 bg-white/[0.02] flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-gray-200">{fire.distance_km} km away</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/10 text-orange-400 font-mono">
                                {fire.satellite}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {fire.acq_date} {fire.acq_time} • Conf: {fire.confidence}
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="text-amber-400 font-semibold">{fire.brightness} K</div>
                            {fire.frp > 0 && (
                              <div className="text-[10px] text-gray-400">{fire.frp.toFixed(1)} MW FRP</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg glass border border-white/5 text-center text-xs text-gray-400">
                      No active thermal anomalies detected within {radiusKm} km by VIIRS/MODIS.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TAB 2: REGULATORY COMPLIANCE */}
            {!loadingEvidence && activeTab === 'compliance' && (
              <div className="space-y-4">
                {/* Overall Status */}
                <div className="p-4 rounded-xl glass border border-white/10 bg-slate-900/40 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Regulatory Status</div>
                    <div className="text-sm font-semibold text-white mt-1">CPCB NAAQS Benchmark</div>
                  </div>
                  {getComplianceBadge(evidenceChain?.regulatory_summary?.overall_status)}
                </div>

                {/* Exceedances List */}
                {evidenceChain?.regulatory_summary?.exceedances &&
                evidenceChain.regulatory_summary.exceedances.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      Standard Exceedances
                    </h4>
                    {evidenceChain.regulatory_summary.exceedances.map((exc, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-rose-300 uppercase">
                            {exc.pollutant} Exceedance
                          </span>
                          <span className="font-mono font-bold text-rose-400">
                            {exc.exceedance_ratio.toFixed(2)}x limit
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-300">
                          <span>
                            Observed: <strong className="text-white">{exc.observed_value}</strong> {exc.unit}
                          </span>
                          <span className="text-gray-400">
                            Limit: {exc.standard_value} {exc.unit} ({exc.authority} {exc.averaging_period})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg glass border border-white/5 text-center text-xs text-gray-400">
                    {evidenceChain?.regulatory_summary?.overall_status === 'compliant'
                      ? 'All ground sensor observations in the ambient radius are within applicable CPCB NAAQS thresholds.'
                      : 'No ground sensor observations available in the radial buffer to evaluate regulatory compliance.'}
                  </div>
                )}

                {/* Benchmark Reference Table */}
                <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-2">
                  <div className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    NAAQS 24-Hour Limits Reference
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-400">
                    <div>PM2.5: <span className="text-gray-200">60 µg/m³</span></div>
                    <div>PM10: <span className="text-gray-200">100 µg/m³</span></div>
                    <div>NO2: <span className="text-gray-200">80 µg/m³</span></div>
                    <div>SO2: <span className="text-gray-200">80 µg/m³</span></div>
                  </div>
                  <div className="text-[10px] text-gray-500 pt-1 border-t border-white/5">
                    Source: Central Pollution Control Board (CPCB), Government of India.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FACILITY SPECIFICATIONS */}
            {activeTab === 'facility' && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Facility Registry Information
                </h3>

                {data.capacity_mw ? (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg glass">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs text-gray-300">Generation Capacity</span>
                    </div>
                    <span className="text-xs font-semibold text-white font-mono">{data.capacity_mw.toFixed(1)} MW</span>
                  </div>
                ) : data.capacity ? (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg glass">
                    <div className="flex items-center gap-2">
                      <Factory className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-gray-300">Capacity</span>
                    </div>
                    <span className="text-xs font-semibold text-white font-mono">{data.capacity}</span>
                  </div>
                ) : null}

                {data.fuel_type && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg glass">
                    <div className="flex items-center gap-2">
                      <Factory className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-gray-300">Primary Fuel</span>
                    </div>
                    <span className="text-xs font-semibold text-white uppercase">{data.fuel_type}</span>
                  </div>
                )}

                {data.commissioning_year && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg glass">
                    <span className="text-xs text-gray-300">Commissioning Year</span>
                    <span className="text-xs font-semibold text-white font-mono">{data.commissioning_year}</span>
                  </div>
                )}

                {data.owner && (
                  <div className="py-2 px-3 rounded-lg glass">
                    <span className="text-[10px] text-gray-400 uppercase block mb-0.5">Owner / Operator</span>
                    <span className="text-xs text-white font-medium">{data.owner}</span>
                  </div>
                )}

                {data.source && (
                  <div className="py-2 px-3 rounded-lg glass">
                    <span className="text-[10px] text-gray-400 uppercase block mb-0.5">Data Registry Source</span>
                    <span className="text-xs text-gray-300">{data.source}</span>
                  </div>
                )}
              </div>
            )}

            {/* Download Report Button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-900/20"
            >
              {downloading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Compiling Forensic Report...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Evidence Chain (PDF)</span>
                </>
              )}
            </button>

            {/* Provenance Footer */}
            <div className="text-[10px] text-gray-500 text-center pt-2 border-t border-white/5 flex items-center justify-center gap-1">
              <ShieldAlert className="w-3 h-3 text-emerald-400" />
              <span>Zero-Fake-Data Integrity: Verified Spatial Observations Only</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

