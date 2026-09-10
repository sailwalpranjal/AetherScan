"""
AetherScan Backend - FastAPI Application
High-performance pollution and AQI mapping system
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn

from config.settings import settings
from db.database import db_manager
from routes import tiles, layers, aqi, search, facility
from data_sources.aqicn_service import initialize_aqicn_service
from middleware import get_database_guard

# Global quantum components (optional)
quantum_processor = None
quantum_state_manager = None
quantum_enabled = False
APP_VERSION = "1.0.1"

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    print("\n" + "="*60)
    print("[AETHERSCAN] Backend - Professional Air Quality System")
    print("="*60)
    print(f"[API] Endpoint: http://{settings.API_HOST}:{settings.API_PORT}")

    # API Configuration Status
    print("\n[CONFIG] API Configuration:")
    print(f"  [{'OK' if settings.AQICN_API_TOKEN else 'WARN'}] AQICN API     - {'Configured (PRIMARY)' if settings.AQICN_API_TOKEN else 'Missing'}")
    print(f"  [{'OK' if settings.OPENAQ_API_KEY else 'WARN'}] OpenAQ API    - {'Configured (FALLBACK)' if settings.OPENAQ_API_KEY else 'Missing'}")
    print(f"  [{'OK' if settings.NASA_FIRMS_API_KEY else 'WARN'}] NASA FIRMS    - {'Configured' if settings.NASA_FIRMS_API_KEY else 'Missing'}")
    print(f"  [{'OK' if settings.OPENWEATHER_API_KEY else 'WARN'}] OpenWeather   - {'Configured' if settings.OPENWEATHER_API_KEY else 'Missing'}")

    # Initialize database
    await db_manager.initialize()
    await db_manager.seed_industries_if_needed()
    print("\n[OK] Database initialized")

    # Initialize AQICN service
    if settings.AQICN_API_TOKEN:
        initialize_aqicn_service(settings.AQICN_API_TOKEN)
        print("[OK] AQICN service initialized (Primary AQI source)")

    # Ensure cache directories exist
    settings.ensure_cache_dirs()
    print("[OK] Cache directories ready")

    # Initialize Database Guard
    db_guard = get_database_guard()
    print("[OK] Database access guard enabled (API-only access)")

    # Initialize Quantum Processing Pipeline (OPTIONAL - won't break if fails)
    global quantum_processor, quantum_state_manager, quantum_enabled
    print("\n[QUANTUM] Attempting quantum processor initialization...")
    try:
        from quantum import QuantumProcessor, QuantumStateManager
        quantum_processor = QuantumProcessor()
        quantum_state_manager = QuantumStateManager()
        await quantum_state_manager.start()
        quantum_enabled = True
        app.state.quantum_processor = quantum_processor
        app.state.quantum_state_manager = quantum_state_manager
        print("[OK] Quantum processor initialized (classical simulation)")
        print(f"  - Max workers: {quantum_processor.max_workers}")
        print(f"  - State cleanup interval: {quantum_state_manager.cleanup_interval}s")

        # Include quantum router only if initialization succeeded
        from routes import quantum
        app.include_router(quantum.router)
        print("[OK] Quantum API endpoints enabled")
    except Exception as e:
        quantum_enabled = False
        print(f"[SKIP] Quantum processor disabled (optional feature)")
        print(f"       Reason: {str(e)[:80]}")
        print(f"       Core system functionality unaffected")

    print("\n" + "="*60)
    print("[READY] System ready - All layers operational")
    if quantum_enabled:
        print("[QUANTUM] Enhanced with quantum-inspired data processing")
    print("="*60 + "\n")

    yield

    # Shutdown
    print("[SHUTDOWN] Stopping AetherScan Backend...")

    # Shutdown quantum components (if they were initialized)
    if quantum_enabled and quantum_processor:
        try:
            await quantum_processor.shutdown()
            await quantum_state_manager.stop()
            print("[OK] Quantum processor shutdown")
        except Exception as e:
            print(f"[WARN] Quantum shutdown error: {e}")

    await db_manager.close()
    print("[OK] Database closed")

# Create FastAPI app
app = FastAPI(
    title="AetherScan API",
    description="High-performance pollution and AQI mapping system for India",
    version=APP_VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers (quantum router added conditionally during startup)
app.include_router(tiles.router)
app.include_router(layers.router)
app.include_router(aqi.router)
app.include_router(search.router)
app.include_router(facility.router)

@app.get("/")
async def root():
    """API root endpoint"""
    endpoints = {
        "tiles": "/tiles",
        "layers": "/layers",
        "aqi": "/aqi",
        "search": "/search",
        "facility": "/facility",
        "docs": "/docs"
    }
    if quantum_enabled:
        endpoints["quantum"] = "/quantum"

    features = {
        "database_security": "API-only access enforced",
        "parallel_processing": "Optimized for i5 12th Gen (Alder Lake)",
        "quantum_processing": "Enabled - Classical simulation" if quantum_enabled else "Disabled (optional)"
    }

    return {
        "name": "AetherScan API",
        "version": APP_VERSION,
        "description": "High-performance pollution and AQI mapping system for India",
        "endpoints": endpoints,
        "features": features
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        db_guard = get_database_guard()
        health_info = {
            "status": "healthy",
            "database": "connected",
            "cache": "ready",
            "database_guard": "active",
            "security": {
                "api_only_access": True,
                "active_tokens": db_guard.get_stats()['current_active_tokens']
            }
        }
        if quantum_enabled:
            health_info["quantum_processor"] = "operational"
        return health_info
    except Exception as e:
        return {
            "status": "degraded",
            "error": str(e)
        }

@app.get("/api/info")
async def api_info():
    """API information and available layers"""
    return {
        "api_version": APP_VERSION,
        "data_sources": {
            "aqicn": {
                "description": "World Air Quality Index - Global AQI data (PRIMARY)",
                "url": "https://aqicn.org",
                "api_key_required": True,
                "status": "active"
            },
            "openaq": {
                "description": "Real-time air quality measurements (FALLBACK)",
                "url": "https://openaq.org",
                "api_key_required": False,
                "status": "fallback"
            },
            "bhuvan": {
                "description": "ISRO satellite imagery and WMS layers",
                "url": "https://bhuvan.nrsc.gov.in",
                "api_key_required": False
            },
            "nasa_firms": {
                "description": "Active fire detection from satellites",
                "url": "https://firms.modaps.eosdis.nasa.gov",
                "api_key_required": True
            },
            "ogd_india": {
                "description": "Industrial and infrastructure data",
                "url": "https://data.gov.in",
                "api_key_required": False
            },
            "census": {
                "description": "Population and demographic data",
                "url": "https://censusindia.gov.in",
                "api_key_required": False
            }
        },
        "available_layers": [
            "pollution-heatmap",
            "state-heatmap",
            "trend-evolution",
            "sensors",
            "aqi-heatmap",
            "industries",
            "power-plants",
            "refineries",
            "mining-zones",
            "population-density",
            "population-exposure",
            "satellite/no2",
            "satellite/so2",
            "satellite/aod",
            "land-temperature",
            "wind-climate",
            "crop-burning",
            "fire-density",
            "aqi-validation"
        ],
        "tile_endpoints": {
            "heatmap": "/tiles/heatmap/{z}/{x}/{y}.png",
            "vector": "/tiles/vector/{z}/{x}/{y}.geojson"
        }
    }

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "path": str(request.url)
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True,
        log_level="info"
    )
