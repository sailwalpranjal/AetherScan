// Industry Details Panel
'use client'

import { X, Factory, Zap, MapPin, AlertTriangle, Download, Users, Link as LinkIcon, ShieldAlert, Activity, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

interface IndustryDetailsPanelProps {
  data: {
    name: string
    type?: string
    industry_type?: string
    capacity?: number
    capacity_mw?: number
    fuel_type?: string
    owner?: string
    commissioning_year?: number | string
    latitude: number
    longitude: number
    source?: string
    gppd_id?: string
    evidence_chain?: Array<{
      id: string;
      timestamp: string;
      source: string;
      type: 'satellite' | 'sensor' | 'visual' | 'inspection';
      description: string;
      confidence: number;
    }>;
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

export default function IndustryDetailsPanel({ data, aqiData, onClose, onDownloadReport }: IndustryDetailsPanelProps) {
  const [downloading, setDownloading] = useState(false)

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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar"
      >
        <div className="glass rounded-2xl overflow-hidden shadow-2xl border border-white/10 mb-4">
          {/* Header */}
          <div className="relative p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg glass hover:bg-white/10 transition-all group"
            >
              <X className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
            </button>

            {/* Title */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
                <Factory className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-1">{data.name}</h2>
                <p className="text-sm text-gray-400">{data.type || data.industry_type || 'Industrial Facility'}</p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <MapPin className="w-4 h-4" />
              <span>{data.latitude.toFixed(4)}°, {data.longitude.toFixed(4)}°</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            
            {/* Environmental Evidence Chain */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Environmental Evidence Chain
              </h3>
              
              <div className="relative border-l border-white/10 ml-3 pl-4 space-y-4">
                {data.evidence_chain && data.evidence_chain.length > 0 ? (
                  data.evidence_chain.map((evidence, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-cyan-500 border-2 border-slate-900" />
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-semibold text-cyan-400 uppercase">{evidence.type}</span>
                          <span className="text-xs text-gray-500">{new Date(evidence.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-300 mb-2">{evidence.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Source: {evidence.source}</span>
                          <div className="flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-green-400" />
                            <span className="text-xs text-green-400 font-mono">{(evidence.confidence * 100).toFixed(0)}% Conf</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-400 italic">No evidence chain data available.</div>
                )}
              </div>
            </div>

            {/* AQI Information */}
            {aqiData && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Nearby Air Quality
                </h3>
                <div className="p-4 rounded-lg glass border border-white/5">
                  {aqiData.isUnavailable ? (
                    <div className="flex flex-col items-center justify-center p-4">
                      <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
                      <span className="text-sm text-gray-300 font-medium">Data Unavailable</span>
                      <span className="text-xs text-gray-500 text-center mt-1">Real-time sensor network down or uncalibrated in this sector.</span>
                    </div>
                  ) : aqiData.isStale ? (
                    <div className="flex flex-col items-center justify-center p-4">
                      <CheckCircle2 className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-300 font-medium">Data Stale</span>
                      <span className="text-xs text-gray-500 text-center mt-1">Last reading was &gt;24 hours ago. Showing latest known state.</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-300">Current AQI</span>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-16 h-8 rounded flex items-center justify-center font-bold text-white text-sm"
                            style={{ backgroundColor: aqiData.color }}
                          >
                            {aqiData.aqi}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mb-3">{aqiData.category}</div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-white/10">
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase">Data Quality</div>
                          <div className="text-sm font-mono text-cyan-400">
                            {aqiData.dataQualityScore ? (aqiData.dataQualityScore * 100).toFixed(1) + '%' : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase">Fusion Confidence</div>
                          <div className="text-sm font-mono text-purple-400">
                            {aqiData.fusionConfidenceScore ? (aqiData.fusionConfidenceScore * 100).toFixed(1) + '%' : 'N/A'}
                          </div>
                        </div>
                      </div>

                      {aqiData.aqi > 150 && (
                        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-red-300">
                              <strong>Alert:</strong> Unhealthy air quality detected near this facility. Recommend investigation and potential action.
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Facility Information</h3>

              {data.capacity_mw && (
                <div className="flex items-center justify-between py-2 px-3 rounded-lg glass">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-300">Capacity</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{data.capacity_mw.toFixed(1)} MW</span>
                </div>
              )}

              {data.capacity && (
                <div className="flex items-center justify-between py-2 px-3 rounded-lg glass">
                  <div className="flex items-center gap-2">
                    <Factory className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-gray-300">Capacity</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{data.capacity}</span>
                </div>
              )}

              {data.fuel_type && (
                <div className="flex items-center justify-between py-2 px-3 rounded-lg glass">
                  <div className="flex items-center gap-2">
                    <Factory className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Fuel Type</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{data.fuel_type}</span>
                </div>
              )}

              {data.commissioning_year && (
                <div className="flex items-center justify-between py-2 px-3 rounded-lg glass">
                  <span className="text-sm text-gray-300">Commissioned</span>
                  <span className="text-sm font-semibold text-white">{data.commissioning_year}</span>
                </div>
              )}

              {data.owner && (
                <div className="py-2 px-3 rounded-lg glass">
                  <span className="text-sm text-gray-300 block mb-1">Owner</span>
                  <span className="text-sm text-white">{data.owner}</span>
                </div>
              )}
            </div>

            {/* Download Report Button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating Report...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Analysis Report (PDF)</span>
                </>
              )}
            </button>

            {/* Source */}
            {data.source && (
              <div className="text-xs text-gray-500 text-center pt-2 border-t border-white/5">
                Data Source: {data.source}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
