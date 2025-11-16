'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapPin, Factory, Wind, AlertTriangle, Filter, BarChart3, Search, X, Download, Eye, EyeOff, Clock, Gauge, Droplet, Flame, Cloud, Zap, Building2, Users, Shield, RefreshCw, List, Grid, Target, Navigation } from 'lucide-react';

// Suppress Next.js warnings and errors
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...args) => {
    const msg = args[0]?.toString() || '';
    if (
      msg.includes('hero-bg.jpg') ||
      msg.includes('apple-touch-icon') ||
      msg.includes('ServiceWorker') ||
      msg.includes('preloaded using link') ||
      msg.includes('Manifest') ||
      msg.includes('Download error')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
  
  console.warn = (...args) => {
    const msg = args[0]?.toString() || '';
    if (
      msg.includes('hero-bg.jpg') ||
      msg.includes('apple-touch-icon') ||
      msg.includes('ServiceWorker')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

// Enhanced Types for Air Pollution
interface AirPollutionData {
  pm25: number;
  pm10: number;
  co: number;
  co2: number;
  nox: number;
  so2: number;
  o3: number;
  voc: number;
  aqi: number;
}

interface ParticleComposition {
  organicCarbon: number;
  blackCarbon: number;
  sulfates: number;
  nitrates: number;
  metals: number;
  dust: number;
}

interface EmissionSource {
  stacks: number;
  vehicles: number;
  processes: number;
  fugitive: number;
}

interface Factory {
  id: number;
  name: string;
  lat: number;
  lon: number;
  state: string;
  industryType: string;
  products: string;
  yearEstablished: number;
  employees: number;
  pollution: AirPollutionData;
  particleComposition: ParticleComposition;
  emissionSources: EmissionSource;
  complianceScore: number;
  violations: number;
  healthImpactRadius: number;
  populationAffected: number;
  controlMeasures: string[];
  seasonalVariation: { winter: number; summer: number; monsoon: number; };
}

interface StateInfo {
  name: string;
  center: [number, number];
  spread: number;
}

declare global {
  interface Window {
    L: any;
  }
}

// Generate 300 factories across 10 states with complete air pollution data
const generateFactories = (): Factory[] => {
  const states: StateInfo[] = [
    { name: 'Uttarakhand', center: [78.0322, 30.0668], spread: 1.5 },
    { name: 'Uttar Pradesh', center: [80.9462, 26.8467], spread: 2.5 },
    { name: 'Maharashtra', center: [75.7139, 19.7515], spread: 2.5 },
    { name: 'Gujarat', center: [71.1924, 22.2587], spread: 2 },
    { name: 'West Bengal', center: [88.3639, 22.5726], spread: 1.8 },
    { name: 'Karnataka', center: [77.5946, 15.3173], spread: 2.2 },
    { name: 'Tamil Nadu', center: [78.6569, 11.1271], spread: 2 },
    { name: 'Rajasthan', center: [74.2179, 27.0238], spread: 2.5 },
    { name: 'Punjab', center: [75.3412, 31.1471], spread: 1.5 },
    { name: 'Haryana', center: [76.0856, 29.0588], spread: 1.3 }
  ];

  const industryTypes = [
    { type: 'Steel Manufacturing', products: 'Steel alloys, reinforced bars, structural steel' },
    { type: 'Cement Production', products: 'Portland cement, clinker, construction materials' },
    { type: 'Chemical Processing', products: 'Industrial chemicals, solvents, acids' },
    { type: 'Thermal Power', products: 'Electricity generation from coal combustion' },
    { type: 'Oil Refinery', products: 'Refined petroleum, diesel, lubricants' },
    { type: 'Pharmaceutical', products: 'API manufacturing, bulk drugs, formulations' },
    { type: 'Textile Dyeing', products: 'Dyed fabrics, processed textiles' },
    { type: 'Fertilizer Plant', products: 'Nitrogen fertilizers, urea, ammonia' },
    { type: 'Plastic Manufacturing', products: 'Polymer products, plastic packaging' },
    { type: 'Paper Mill', products: 'Paper pulp, packaging materials' },
    { type: 'Glass Manufacturing', products: 'Float glass, container glass' },
    { type: 'Aluminum Smelting', products: 'Primary aluminum, alloys' },
    { type: 'Battery Production', products: 'Lead-acid batteries, lithium cells' },
    { type: 'Paint Manufacturing', products: 'Industrial paints, coatings' },
    { type: 'Brick Kiln', products: 'Clay bricks, construction materials' }
  ];

  const controlMeasures = [
    'Electrostatic Precipitators',
    'Bag Filters',
    'Scrubbers',
    'Catalytic Converters',
    'Cyclone Separators',
    'Carbon Adsorption',
    'Stack Height Optimization',
    'Continuous Emission Monitoring'
  ];

  const factories: Factory[] = [];
  
  for (let i = 1; i <= 300; i++) {
    const state = states[Math.floor(Math.random() * states.length)]!;
    const lat = state.center[1] + (Math.random() - 0.5) * state.spread;
    const lon = state.center[0] + (Math.random() - 0.5) * state.spread;
    const industry = industryTypes[Math.floor(Math.random() * industryTypes.length)]!;
    
    // Generate realistic pollution levels
    const baseAQI = Math.floor(Math.random() * 450) + 50;
    const pm25 = Math.floor(baseAQI * 0.4 + Math.random() * 50);
    const pm10 = Math.floor(pm25 * 1.8 + Math.random() * 30);
    
    factories.push({
      id: i,
      name: `${industry.type.split(' ')[0]} Facility ${String(i).padStart(3, '0')}`,
      lat: parseFloat(lat.toFixed(6)),
      lon: parseFloat(lon.toFixed(6)),
      state: state.name,
      industryType: industry.type,
      products: industry.products,
      yearEstablished: Math.floor(Math.random() * 45) + 1975,
      employees: Math.floor(Math.random() * 3000) + 200,
      pollution: {
        pm25,
        pm10,
        co: parseFloat((Math.random() * 15 + 2).toFixed(2)),
        co2: Math.floor(Math.random() * 800 + 400),
        nox: Math.floor(Math.random() * 150 + 30),
        so2: Math.floor(Math.random() * 200 + 40),
        o3: Math.floor(Math.random() * 120 + 20),
        voc: parseFloat((Math.random() * 500 + 100).toFixed(1)),
        aqi: baseAQI
      },
      particleComposition: {
        organicCarbon: parseFloat((Math.random() * 30 + 10).toFixed(1)),
        blackCarbon: parseFloat((Math.random() * 20 + 5).toFixed(1)),
        sulfates: parseFloat((Math.random() * 25 + 8).toFixed(1)),
        nitrates: parseFloat((Math.random() * 20 + 6).toFixed(1)),
        metals: parseFloat((Math.random() * 10 + 2).toFixed(1)),
        dust: parseFloat((Math.random() * 30 + 15).toFixed(1))
      },
      emissionSources: {
        stacks: Math.floor(Math.random() * 50 + 20),
        vehicles: Math.floor(Math.random() * 30 + 10),
        processes: Math.floor(Math.random() * 40 + 15),
        fugitive: Math.floor(Math.random() * 25 + 5)
      },
      complianceScore: Math.floor(Math.random() * 100),
      violations: Math.floor(Math.random() * 15),
      healthImpactRadius: parseFloat((Math.random() * 8 + 2).toFixed(1)),
      populationAffected: Math.floor(Math.random() * 100000 + 10000),
      controlMeasures: controlMeasures.slice(0, Math.floor(Math.random() * 5) + 2),
      seasonalVariation: {
        winter: Math.floor(Math.random() * 40 + 80),
        summer: Math.floor(Math.random() * 30 + 60),
        monsoon: Math.floor(Math.random() * 25 + 50)
      }
    });
  }
  
  return factories;
};

const FACTORIES = generateFactories();

// Leaflet Map Component with Smart Marker Sizing
const LeafletMap: React.FC<{
  factories: Factory[];
  onMarkerClick: (factory: Factory) => void;
  mapStyle: string;
  selectedFactory: Factory | null;
}> = ({ factories, onMarkerClick, mapStyle, selectedFactory }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<Map<number, any>>(new Map());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !window.L) return;
    
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    const L = window.L;
    
    map.current = L.map(mapContainer.current, {
      center: [23.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
      attributionControl: false,
      preferCanvas: true
    });

    const tileLayers: Record<string, string> = {
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    };

    L.tileLayer(tileLayers[mapStyle] || tileLayers.dark, {
      maxZoom: 18,
      attribution: ''
    }).addTo(map.current);

    // Smart marker sizing based on zoom level
    const updateMarkerSizes = () => {
      const zoom = map.current.getZoom();
      let size = 12;
      
      if (zoom >= 10) size = 20;
      else if (zoom >= 8) size = 16;
      else if (zoom >= 6) size = 14;
      
      markers.current.forEach((marker) => {
        const icon = marker.getIcon();
        if (icon && icon.options) {
          icon.options.iconSize = [size, size];
          icon.options.iconAnchor = [size / 2, size / 2];
          marker.setIcon(icon);
        }
      });
    };

    map.current.on('zoomend', updateMarkerSizes);

    // Smooth animation to Dehradun (ONE TIME ONLY)
    if (!initialized) {
      setTimeout(() => {
        if (map.current) {
          map.current.flyTo([30.3165, 78.0322], 10, {
            duration: 2.5,
            easeLinearity: 0.25
          });
          setInitialized(true);
        }
      }, 800);
    }

    return () => {
      if (map.current) {
        map.current.off('zoomend', updateMarkerSizes);
        map.current.remove();
        map.current = null;
      }
      markers.current.clear();
    };
  }, [mapStyle]);

  useEffect(() => {
    if (!map.current || !window.L) return;

    const L = window.L;
    
    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current.clear();

    const createMarkerIcon = (factory: Factory, isSelected: boolean) => {
      const aqi = factory.pollution.aqi;
      const severity = aqi > 300 ? 'severe' : aqi > 200 ? 'high' : aqi > 100 ? 'moderate' : 'low';
      
      const colors: Record<string, string> = {
        severe: '#dc2626',
        high: '#f97316',
        moderate: '#eab308',
        low: '#22c55e'
      };

      const zoom = map.current.getZoom();
      let size = zoom >= 10 ? 20 : zoom >= 8 ? 16 : zoom >= 6 ? 14 : 12;
      
      if (isSelected) size *= 1.5;

      return L.divIcon({
        html: `
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: ${colors[severity]};
            border-radius: 50%;
            border: ${isSelected ? '4px' : '2px'} solid #fff;
            box-shadow: 0 ${isSelected ? '6' : '3'}px ${isSelected ? '16' : '10'}px ${colors[severity]}80;
            cursor: pointer;
            transition: all 0.2s ease;
            ${isSelected ? 'z-index: 1000;' : ''}
          " class="pollution-marker"></div>
        `,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });
    };

    factories.forEach(factory => {
      const isSelected = selectedFactory?.id === factory.id;
      const marker = L.marker([factory.lat, factory.lon], {
        icon: createMarkerIcon(factory, isSelected),
        title: `${factory.name} - AQI: ${factory.pollution.aqi}`
      }).addTo(map.current);

      // Tooltip on hover
      marker.bindTooltip(`
        <div style="padding: 4px 8px; font-size: 11px;">
          <strong>${factory.name}</strong><br/>
          <span style="color: #94a3b8;">${factory.products}</span>
        </div>
      `, {
        direction: 'top',
        offset: [0, -10],
        opacity: 0.95,
        className: 'custom-tooltip'
      });

      marker.on('click', () => {
        onMarkerClick(factory);
        map.current.flyTo([factory.lat, factory.lon], Math.max(map.current.getZoom(), 11), {
          duration: 1
        });
      });

      markers.current.set(factory.id, marker);
    });

  }, [factories, onMarkerClick, selectedFactory]);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
};

// Statistics Card
const StatsCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; trend?: string; subtitle?: string }> = 
  ({ title, value, icon, color, trend, subtitle }) => (
  <div style={{
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(12px)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.borderColor = color + '40';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)';
  }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: `${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
          {trend && (
            <div style={{ fontSize: '10px', color: trend.startsWith('+') ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
              {trend}
            </div>
          )}
        </div>
        {subtitle && <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{subtitle}</div>}
      </div>
    </div>
  </div>
);

// Main Component
export default function AirPollutionMonitor() {
  const [selectedMap, setSelectedMap] = useState<'dark' | 'satellite' | 'terrain' | 'street'>('dark');
  const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [aqiRange, setAqiRange] = useState<[number, number]>([0, 500]);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'dashboard' | 'heatmap'>('map');
  const [sortBy, setSortBy] = useState<'aqi' | 'name' | 'compliance' | 'population'>('aqi');
  const [pollutantFilter, setPollutantFilter] = useState<string>('all');
  const [isClient, setIsClient] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Fix hydration issue - only render after client mount
  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadLeaflet = () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }

      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.async = true;
        script.onload = () => {
          setTimeout(() => setScriptsLoaded(true), 300);
        };
        script.onerror = () => {
          setScriptsLoaded(false);
        };
        document.head.appendChild(script);
      } else if (window.L) {
        setScriptsLoaded(true);
      }
    };

    if (isClient) {
      loadLeaflet();
    }
  }, [isClient]);

  const getPollutionColor = (aqi: number): string => {
    if (aqi > 300) return '#dc2626';
    if (aqi > 200) return '#f97316';
    if (aqi > 100) return '#eab308';
    return '#22c55e';
  };

  const getAQICategory = (aqi: number): string => {
    if (aqi > 300) return 'Hazardous';
    if (aqi > 200) return 'Very Unhealthy';
    if (aqi > 150) return 'Unhealthy';
    if (aqi > 100) return 'Unhealthy for Sensitive';
    if (aqi > 50) return 'Moderate';
    return 'Good';
  };

  const filteredFactories = useMemo(() => {
    let filtered = FACTORIES.filter(f => {
      const matchesSearch = searchTerm === '' || 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        f.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.industryType.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesState = selectedState === 'All' || f.state === selectedState;
      const matchesIndustry = selectedIndustry === 'All' || f.industryType === selectedIndustry;
      const matchesAQI = f.pollution.aqi >= aqiRange[0] && f.pollution.aqi <= aqiRange[1];
      
      let matchesPollutant = true;
      if (pollutantFilter !== 'all') {
        const value = f.pollution[pollutantFilter as keyof AirPollutionData] as number;
        matchesPollutant = value > 0;
      }
      
      return matchesSearch && matchesState && matchesIndustry && matchesAQI && matchesPollutant;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'aqi') return b.pollution.aqi - a.pollution.aqi;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'compliance') return b.complianceScore - a.complianceScore;
      if (sortBy === 'population') return b.populationAffected - a.populationAffected;
      return 0;
    });

    return filtered;
  }, [searchTerm, selectedState, selectedIndustry, aqiRange, sortBy, pollutantFilter]);

  const stats = useMemo(() => {
    if (!isClient) {
      return { avgAQI: 0, criticalCount: 0, totalPopulation: 0, avgCompliance: 0, avgPM25: 0, totalViolations: 0 };
    }
    
    const avgAQI = filteredFactories.length > 0 
      ? Math.round(filteredFactories.reduce((sum, f) => sum + f.pollution.aqi, 0) / filteredFactories.length)
      : 0;
    const criticalCount = filteredFactories.filter(f => f.pollution.aqi > 300).length;
    const totalPopulation = filteredFactories.reduce((sum, f) => sum + f.populationAffected, 0);
    const avgCompliance = filteredFactories.length > 0
      ? Math.round(filteredFactories.reduce((sum, f) => sum + f.complianceScore, 0) / filteredFactories.length)
      : 0;
    const avgPM25 = filteredFactories.length > 0
      ? Math.round(filteredFactories.reduce((sum, f) => sum + f.pollution.pm25, 0) / filteredFactories.length)
      : 0;
    const totalViolations = filteredFactories.reduce((sum, f) => sum + f.violations, 0);

    return { avgAQI, criticalCount, totalPopulation, avgCompliance, avgPM25, totalViolations };
  }, [filteredFactories, isClient]);

  const states = useMemo(() => [...new Set(FACTORIES.map(f => f.state))].sort(), []);
  const industries = useMemo(() => [...new Set(FACTORIES.map(f => f.industryType))].sort(), []);

  const exportData = useCallback(() => {
    const dataStr = JSON.stringify(filteredFactories, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `air-pollution-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredFactories]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {!isClient ? (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid rgba(59, 130, 246, 0.2)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <div style={{ fontSize: '16px', color: '#f1f5f9', fontWeight: 600 }}>
              Loading Platform...
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* Top Navigation */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 1000,
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Wind className="w-5 h-5" style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#f1f5f9',
              margin: 0,
              letterSpacing: '-0.3px'
            }}>
              Air Pollution Monitoring • India
            </h1>
            <p style={{
              fontSize: '10px',
              color: '#94a3b8',
              margin: 0
            }}>
              Real-time Air Quality Intelligence Platform
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '6px',
          background: 'rgba(148, 163, 184, 0.05)',
          padding: '4px',
          borderRadius: '10px'
        }}>
          {(['dark', 'satellite', 'terrain', 'street'] as const).map((style) => (
            <button
              key={style}
              onClick={() => setSelectedMap(style)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: selectedMap === style ? '#3b82f6' : 'transparent',
                color: '#f1f5f9',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'capitalize'
              }}
            >
              {style}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative' }}>
            <Search className="w-4 h-4" style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none'
            }} />
            <input
              type="text"
              placeholder="Search facilities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px 8px 32px',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: '#f1f5f9',
                fontSize: '12px',
                outline: 'none',
                width: '200px'
              }}
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: showFilters ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.5)',
              color: '#f1f5f9',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          <button
            onClick={() => setShowStats(!showStats)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(15, 23, 42, 0.5)',
              color: '#f1f5f9',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {showStats ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          <button
            onClick={exportData}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(15, 23, 42, 0.5)',
              color: '#f1f5f9',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.5)';
            }}
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(15, 23, 42, 0.5)',
              color: '#f1f5f9',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.5)';
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View Mode Selector */}
      <div style={{
        position: 'absolute',
        top: '74px',
        left: '20px',
        zIndex: 999,
        display: 'flex',
        gap: '6px',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
        padding: '6px',
        borderRadius: '10px',
        border: '1px solid rgba(148, 163, 184, 0.1)'
      }}>
        {[
          { mode: 'map', icon: <Navigation className="w-4 h-4" />, label: 'Map' },
          { mode: 'list', icon: <List className="w-4 h-4" />, label: 'List' },
          { mode: 'dashboard', icon: <Grid className="w-4 h-4" />, label: 'Dashboard' },
          { mode: 'heatmap', icon: <Target className="w-4 h-4" />, label: 'Heatmap' }
        ].map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode as any)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              background: viewMode === mode ? '#3b82f6' : 'transparent',
              color: '#f1f5f9',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div style={{
          position: 'absolute',
          top: '74px',
          right: '20px',
          width: '340px',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          background: 'rgba(15, 23, 42, 0.98)',
          backdropFilter: 'blur(12px)',
          borderRadius: '12px',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          padding: '20px',
          zIndex: 999
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>Advanced Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
              State / Region
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: '#f1f5f9',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All States ({FACTORIES.length})</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
              Industry Type
            </label>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: '#f1f5f9',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Industries</option>
              {industries.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
              Pollutant Focus
            </label>
            <select
              value={pollutantFilter}
              onChange={(e) => setPollutantFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: '#f1f5f9',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Pollutants</option>
              <option value="pm25">PM2.5 (Fine Particles)</option>
              <option value="pm10">PM10 (Coarse Particles)</option>
              <option value="co">CO (Carbon Monoxide)</option>
              <option value="co2">CO2 (Carbon Dioxide)</option>
              <option value="nox">NOx (Nitrogen Oxides)</option>
              <option value="so2">SO2 (Sulfur Dioxide)</option>
              <option value="o3">O3 (Ozone)</option>
              <option value="voc">VOCs (Volatile Organic)</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
              AQI Range: {aqiRange[0]} - {aqiRange[1]}
            </label>
            <input
              type="range"
              min="0"
              max="500"
              value={aqiRange[1]}
              onChange={(e) => setAqiRange([aqiRange[0], parseInt(e.target.value)])}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: '#f1f5f9',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="aqi">Pollution Level (High to Low)</option>
              <option value="name">Facility Name (A-Z)</option>
              <option value="compliance">Compliance Score</option>
              <option value="population">Population Affected</option>
            </select>
          </div>

          <div style={{
            padding: '12px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
              📊 Showing {filteredFactories.length} of {FACTORIES.length} facilities
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>
              Avg AQI: <span style={{ color: getPollutionColor(stats.avgAQI), fontWeight: 700 }}>{stats.avgAQI}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedState('All');
              setSelectedIndustry('All');
              setPollutantFilter('all');
              setSearchTerm('');
              setAqiRange([0, 500]);
              setSortBy('aqi');
            }}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Stats Panel */}
      {showStats && viewMode !== 'dashboard' && (
        <div style={{
          position: 'absolute',
          top: '140px',
          left: '20px',
          width: '280px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 999,
          maxHeight: 'calc(100vh - 220px)',
          overflowY: 'auto'
        }}>
          <StatsCard
            title="Facilities"
            value={filteredFactories.length}
            icon={<Building2 className="w-5 h-5" />}
            color="#3b82f6"
            trend="+12"
            subtitle="Active monitoring"
          />
          <StatsCard
            title="Avg AQI"
            value={stats.avgAQI}
            icon={<Gauge className="w-5 h-5" />}
            color={getPollutionColor(stats.avgAQI)}
            trend={stats.avgAQI > 200 ? '+8%' : '-3%'}
            subtitle={getAQICategory(stats.avgAQI)}
          />
          <StatsCard
            title="Critical (AQI>300)"
            value={stats.criticalCount}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="#dc2626"
            subtitle="Hazardous levels"
          />
          <StatsCard
            title="Avg PM2.5"
            value={`${stats.avgPM25} μg/m³`}
            icon={<Cloud className="w-5 h-5" />}
            color="#f97316"
            subtitle="Fine particles"
          />
          <StatsCard
            title="Population Affected"
            value={(stats.totalPopulation / 1000000).toFixed(1) + 'M'}
            icon={<Users className="w-5 h-5" />}
            color="#a855f7"
            subtitle="Within impact radius"
          />
          <StatsCard
            title="Avg Compliance"
            value={`${stats.avgCompliance}%`}
            icon={<Shield className="w-5 h-5" />}
            color={stats.avgCompliance > 70 ? '#22c55e' : '#f59e0b'}
            subtitle="Regulatory score"
          />
        </div>
      )}

      {/* Main Content Area */}
      <div style={{
        position: 'absolute',
        top: '64px',
        left: 0,
        right: 0,
        bottom: 0
      }}>
        {viewMode === 'map' || viewMode === 'heatmap' ? (
          scriptsLoaded ? (
            <LeafletMap
              factories={filteredFactories}
              onMarkerClick={setSelectedFactory}
              mapStyle={selectedMap}
              selectedFactory={selectedFactory}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0f172a'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  border: '4px solid rgba(59, 130, 246, 0.2)',
                  borderTopColor: '#3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }} />
                <div style={{ fontSize: '16px', color: '#f1f5f9', fontWeight: 600 }}>
                  Loading Map Engine...
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                  Initializing Leaflet
                </div>
              </div>
            </div>
          )
        ) : viewMode === 'list' ? (
          <div style={{
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            padding: '20px',
            background: '#0f172a'
          }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <h2 style={{ color: '#f1f5f9', fontSize: '20px', marginBottom: '16px', fontWeight: 700 }}>
                Facility List ({filteredFactories.length})
              </h2>
              <div style={{ display: 'grid', gap: '12px' }}>
                {filteredFactories.map((factory) => (
                  <div
                    key={factory.id}
                    onClick={() => {
                      setSelectedFactory(factory);
                      setViewMode('map');
                    }}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid rgba(148, 163, 184, 0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: '16px',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = getPollutionColor(factory.pollution.aqi) + '60';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div>
                      <h3 style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                        {factory.name}
                      </h3>
                      <p style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px' }}>
                        {factory.industryType} • {factory.state}
                      </p>
                      <p style={{ color: '#64748b', fontSize: '11px', marginBottom: '8px' }}>
                        {factory.products}
                      </p>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '10px' }}>
                        <span style={{ color: '#94a3b8' }}>PM2.5: <strong style={{ color: getPollutionColor(factory.pollution.pm25 * 4) }}>{factory.pollution.pm25}</strong></span>
                        <span style={{ color: '#94a3b8' }}>PM10: <strong>{factory.pollution.pm10}</strong></span>
                        <span style={{ color: '#94a3b8' }}>CO: <strong>{factory.pollution.co}</strong></span>
                        <span style={{ color: '#94a3b8' }}>NOx: <strong>{factory.pollution.nox}</strong></span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: 700,
                        color: getPollutionColor(factory.pollution.aqi),
                        marginBottom: '4px'
                      }}>
                        {factory.pollution.aqi}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                        {getAQICategory(factory.pollution.aqi)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            padding: '20px',
            background: '#0f172a'
          }}>
            <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
              <h2 style={{ color: '#f1f5f9', fontSize: '20px', marginBottom: '20px', fontWeight: 700 }}>
                Analytics Dashboard
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <StatsCard
                  title="Total Facilities"
                  value={filteredFactories.length}
                  icon={<Building2 className="w-6 h-6" />}
                  color="#3b82f6"
                  trend="+12"
                />
                <StatsCard
                  title="Average AQI"
                  value={stats.avgAQI}
                  icon={<Gauge className="w-6 h-6" />}
                  color={getPollutionColor(stats.avgAQI)}
                  trend={stats.avgAQI > 200 ? '+8%' : '-3%'}
                />
                <StatsCard
                  title="Critical Facilities"
                  value={stats.criticalCount}
                  icon={<AlertTriangle className="w-6 h-6" />}
                  color="#dc2626"
                />
                <StatsCard
                  title="Avg PM2.5"
                  value={`${stats.avgPM25} μg/m³`}
                  icon={<Cloud className="w-6 h-6" />}
                  color="#f97316"
                />
                <StatsCard
                  title="Population at Risk"
                  value={(stats.totalPopulation / 1000000).toFixed(2) + 'M'}
                  icon={<Users className="w-6 h-6" />}
                  color="#a855f7"
                />
                <StatsCard
                  title="Avg Compliance"
                  value={`${stats.avgCompliance}%`}
                  icon={<Shield className="w-6 h-6" />}
                  color={stats.avgCompliance > 70 ? '#22c55e' : '#f59e0b'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid rgba(148, 163, 184, 0.1)'
                }}>
                  <h3 style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>
                    Top 10 Most Polluted Facilities
                  </h3>
                  {filteredFactories.slice(0, 10).map((f, i) => (
                    <div key={f.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: i < 9 ? '1px solid rgba(148, 163, 184, 0.05)' : 'none'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#f1f5f9', fontWeight: 600 }}>{f.name}</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{f.state}</div>
                      </div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: getPollutionColor(f.pollution.aqi)
                      }}>
                        {f.pollution.aqi}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid rgba(148, 163, 184, 0.1)'
                }}>
                  <h3 style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>
                    State-wise Distribution
                  </h3>
                  {states.map((state) => {
                    const count = filteredFactories.filter(f => f.state === state).length;
                    const avgAqi = Math.round(
                      filteredFactories.filter(f => f.state === state).reduce((sum, f) => sum + f.pollution.aqi, 0) / count
                    );
                    return (
                      <div key={state} style={{
                        padding: '10px 0',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.05)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', color: '#f1f5f9' }}>{state}</span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{count} facilities</span>
                        </div>
                        <div style={{
                          height: '6px',
                          background: 'rgba(148, 163, 184, 0.1)',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${(avgAqi / 500) * 100}%`,
                            background: getPollutionColor(avgAqi),
                            borderRadius: '3px'
                          }} />
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                          Avg AQI: <strong style={{ color: getPollutionColor(avgAqi) }}>{avgAqi}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Factory Detail Popup */}
      {selectedFactory && (
        <div style={{
          position: 'absolute',
          top: '50%',
          right: '20px',
          transform: 'translateY(-50%)',
          width: '420px',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: 'rgba(15, 23, 42, 0.98)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          padding: '24px',
          zIndex: 1001,
          animation: 'slideIn 0.3s ease-out'
        }}>
          <button
            onClick={() => setSelectedFactory(null)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(148, 163, 184, 0.1)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              color: '#94a3b8'
            }}
          >
            <X className="w-4 h-4" />
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: `linear-gradient(135deg, ${getPollutionColor(selectedFactory.pollution.aqi)}, ${getPollutionColor(selectedFactory.pollution.aqi)}dd)`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Factory className="w-6 h-6" style={{ color: '#fff' }} />
            </div>
            <div style={{ flex: 1, paddingRight: '30px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#f1f5f9',
                margin: 0,
                marginBottom: '6px',
                lineHeight: 1.3
              }}>
                {selectedFactory.name}
              </h3>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                {selectedFactory.industryType}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#3b82f6',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <MapPin className="w-3 h-3" />
                {selectedFactory.state}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginBottom: '20px'
          }}>
            {[
              { label: 'Est.', value: selectedFactory.yearEstablished },
              { label: 'Staff', value: selectedFactory.employees },
              { label: 'Score', value: `${selectedFactory.complianceScore}%`, color: selectedFactory.complianceScore > 70 ? '#22c55e' : '#f59e0b' },
              { label: 'Violations', value: selectedFactory.violations, color: '#dc2626' }
            ].map((item, i) => (
              <div key={i} style={{
                background: 'rgba(148, 163, 184, 0.05)',
                padding: '10px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '4px' }}>{item.label}</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: item.color || '#f1f5f9'
                }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            padding: '14px',
            background: `${getPollutionColor(selectedFactory.pollution.aqi)}15`,
            borderRadius: '10px',
            border: `1px solid ${getPollutionColor(selectedFactory.pollution.aqi)}30`,
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>Air Quality Index</div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: 700,
                  color: getPollutionColor(selectedFactory.pollution.aqi)
                }}>
                  {selectedFactory.pollution.aqi}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: getPollutionColor(selectedFactory.pollution.aqi),
                  marginBottom: '4px'
                }}>
                  {getAQICategory(selectedFactory.pollution.aqi)}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  Impact: {selectedFactory.healthImpactRadius}km radius
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', fontWeight: 600 }}>
              Pollutant Breakdown
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {[
                { label: 'PM2.5', value: `${selectedFactory.pollution.pm25} μg/m³`, icon: <Cloud className="w-3 h-3" /> },
                { label: 'PM10', value: `${selectedFactory.pollution.pm10} μg/m³`, icon: <Cloud className="w-3 h-3" /> },
                { label: 'CO', value: `${selectedFactory.pollution.co} ppm`, icon: <Flame className="w-3 h-3" /> },
                { label: 'CO2', value: `${selectedFactory.pollution.co2} ppm`, icon: <Flame className="w-3 h-3" /> },
                { label: 'NOx', value: `${selectedFactory.pollution.nox} ppb`, icon: <Wind className="w-3 h-3" /> },
                { label: 'SO2', value: `${selectedFactory.pollution.so2} ppb`, icon: <Wind className="w-3 h-3" /> },
                { label: 'O3', value: `${selectedFactory.pollution.o3} ppb`, icon: <Zap className="w-3 h-3" /> },
                { label: 'VOC', value: `${selectedFactory.pollution.voc} μg/m³`, icon: <Droplet className="w-3 h-3" /> }
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '10px',
                  background: 'rgba(148, 163, 184, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.1)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px'
                  }}>
                    <div style={{ color: '#94a3b8' }}>{item.icon}</div>
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                      {item.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', fontWeight: 600 }}>
              Particle Composition
            </h4>
            <div style={{
              background: 'rgba(148, 163, 184, 0.05)',
              borderRadius: '8px',
              padding: '12px',
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}>
              {[
                { label: 'Organic Carbon', value: selectedFactory.particleComposition.organicCarbon, color: '#8b5cf6' },
                { label: 'Black Carbon', value: selectedFactory.particleComposition.blackCarbon, color: '#1e293b' },
                { label: 'Sulfates', value: selectedFactory.particleComposition.sulfates, color: '#eab308' },
                { label: 'Nitrates', value: selectedFactory.particleComposition.nitrates, color: '#ef4444' },
                { label: 'Metals', value: selectedFactory.particleComposition.metals, color: '#94a3b8' },
                { label: 'Dust', value: selectedFactory.particleComposition.dust, color: '#a16207' }
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: i < 5 ? '10px' : '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#f1f5f9' }}>{item.label}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>{item.value}%</span>
                  </div>
                  <div style={{
                    height: '4px',
                    background: 'rgba(148, 163, 184, 0.1)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${item.value}%`,
                      background: item.color,
                      borderRadius: '2px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', fontWeight: 600 }}>
              Emission Sources
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {[
                { label: 'Stacks', value: `${selectedFactory.emissionSources.stacks}%` },
                { label: 'Vehicles', value: `${selectedFactory.emissionSources.vehicles}%` },
                { label: 'Processes', value: `${selectedFactory.emissionSources.processes}%` },
                { label: 'Fugitive', value: `${selectedFactory.emissionSources.fugitive}%` }
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '10px',
                  background: 'rgba(148, 163, 184, 0.05)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid rgba(148, 163, 184, 0.1)'
                }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', fontWeight: 600 }}>
              Seasonal Variation (AQI %)
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { label: 'Winter', value: selectedFactory.seasonalVariation.winter, icon: '❄️' },
                { label: 'Summer', value: selectedFactory.seasonalVariation.summer, icon: '☀️' },
                { label: 'Monsoon', value: selectedFactory.seasonalVariation.monsoon, icon: '🌧️' }
              ].map((item, i) => (
                <div key={i} style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(148, 163, 184, 0.05)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid rgba(148, 163, 184, 0.1)'
                }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{item.icon}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>{item.value}%</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', fontWeight: 600 }}>
              Control Measures
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {selectedFactory.controlMeasures.map((measure, i) => (
                <div key={i} style={{
                  padding: '6px 10px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '6px',
                  fontSize: '10px',
                  color: '#4ade80',
                  fontWeight: 600
                }}>
                  {measure}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
              Products & Services
            </h4>
            <p style={{
              fontSize: '11px',
              lineHeight: 1.6,
              color: '#cbd5e1',
              margin: 0,
              background: 'rgba(148, 163, 184, 0.05)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}>
              {selectedFactory.products}
            </p>
          </div>

          <div style={{
            padding: '14px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '10px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <AlertTriangle className="w-5 h-5" style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#f87171', marginBottom: '4px' }}>
                Health Impact Assessment
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.5 }}>
                Approximately <strong>{selectedFactory.populationAffected.toLocaleString()}</strong> people within {selectedFactory.healthImpactRadius}km radius are exposed to elevated pollution levels. Potential health risks include respiratory issues, cardiovascular problems, and reduced lung function.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: showStats && viewMode !== 'dashboard' ? '320px' : '20px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        padding: '16px',
        zIndex: 999,
        transition: 'left 0.3s'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#f1f5f9',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <BarChart3 className="w-4 h-4" style={{ color: '#3b82f6' }} />
          AQI Scale
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { color: '#22c55e', label: 'Good', range: '0-50' },
            { color: '#eab308', label: 'Moderate', range: '51-100' },
            { color: '#f97316', label: 'Unhealthy', range: '101-200' },
            { color: '#dc2626', label: 'Very Unhealthy', range: '201-300' },
            { color: '#7f1d1d', label: 'Hazardous', range: '300+' }
          ].map(({ color, label, range }) => (
            <div key={range} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '20px',
                height: '10px',
                background: color,
                borderRadius: '3px',
                boxShadow: `0 2px 6px ${color}60`
              }} />
              <span style={{ fontSize: '10px', color: '#cbd5e1', flex: 1 }}>{label}</span>
              <span style={{ fontSize: '9px', color: '#64748b' }}>{range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        padding: '12px 16px',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 8px #22c55e',
            animation: 'pulse 2s infinite'
          }} />
          <span style={{ fontSize: '10px', color: '#cbd5e1' }}>
            <Clock className="w-3 h-3" style={{ display: 'inline', marginRight: '4px' }} />
            Live • {currentTime || '--:--'}
          </span>
        </div>
        <div style={{ width: '1px', height: '16px', background: 'rgba(148, 163, 184, 0.2)' }} />
        <span style={{ fontSize: '10px', color: '#64748b' }}>
          300 facilities • 10 states
        </span>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-50%) translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.95);
          }
        }

        button:hover {
          opacity: 0.9;
        }

        button:active {
          transform: scale(0.98);
        }

        div::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        div::-webkit-scrollbar-track {
          background: rgba(148, 163, 184, 0.05);
          border-radius: 3px;
        }

        div::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 3px;
        }

        div::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }

        select option {
          background: #0f172a;
          color: #f1f5f9;
        }

        input::placeholder {
          color: rgba(148, 163, 184, 0.5);
        }

        input:focus {
          border-color: rgba(59, 130, 246, 0.5);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .custom-tooltip {
          background: rgba(15, 23, 42, 0.98) !important;
          border: 1px solid rgba(148, 163, 184, 0.3) !important;
          border-radius: 8px !important;
          padding: 0 !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
          backdrop-filter: blur(8px) !important;
        }

        .pollution-marker {
          will-change: transform;
        }

        .pollution-marker:hover {
          transform: scale(1.2) !important;
          z-index: 999 !important;
        }

        .leaflet-tooltip {
          padding: 0 !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }

        .leaflet-tooltip-top:before {
          border-top-color: rgba(15, 23, 42, 0.98) !important;
        }

        @media (max-width: 1024px) {
          div[style*="width: 280px"] {
            width: 240px !important;
          }
          
          div[style*="width: 420px"] {
            width: 360px !important;
          }
        }

        @media (max-width: 768px) {
          div[style*="width: 280px"],
          div[style*="width: 340px"] {
            display: none !important;
          }
          
          div[style*="width: 420px"] {
            width: calc(100vw - 40px) !important;
            right: 20px !important;
            left: 20px !important;
            top: auto !important;
            bottom: 20px !important;
            transform: none !important;
            max-height: 60vh !important;
          }

          div[style*="gridTemplateColumns: repeat(auto-fit"] {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          div[style*="gap: 16px"] {
            gap: 12px !important;
          }

          button {
            padding: 6px 10px !important;
            font-size: 11px !important;
          }

          input[type="text"] {
            width: 150px !important;
          }
        }
      `}</style>
      </>
      )}
    </div>
  );
}