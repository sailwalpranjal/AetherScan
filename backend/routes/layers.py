"""Layer data routes"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from layers import (
    pollution_heatmap, state_heatmap, trend_evolution, openaq_sensors,
    dynamic_aqi, industry_overlay, power_plants, refineries,
    population_density, population_exposure, satellite_indicators,
    land_temperature, wind_climate, crop_burning, aqi_validation
)

router = APIRouter(prefix="/layers", tags=["layers"])

@router.get("/pollution-heatmap")
async def get_pollution_heatmap(resolution: float = 0.2):
    """Get national pollution heatmap data"""
    try:
        return await pollution_heatmap.get_national_pollution_heatmap(resolution=resolution)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/state-heatmap")
async def get_state_heatmap():
    """Get state-wise pollution aggregation"""
    try:
        return await state_heatmap.get_state_wise_pollution()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trend-evolution")
async def get_trend_evolution(parameter: str = 'pm25', days: int = 30):
    """Get pollution trend over time"""
    try:
        return await trend_evolution.get_pollution_trends(parameter=parameter, days=days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sensors")
async def get_sensors():
    """Get OpenAQ sensor locations"""
    try:
        return await openaq_sensors.get_sensor_locations()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/aqi-heatmap")
async def get_aqi_heatmap(resolution: float = 0.5):
    """Get dynamic AQI heatmap"""
    try:
        return await dynamic_aqi.get_aqi_heatmap_layer(resolution=resolution)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/industries")
async def get_industries():
    """Get all industries overlay"""
    try:
        return await industry_overlay.get_industry_overlay()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/power-plants")
async def get_power_plants_layer():
    """Get power plants"""
    try:
        return await power_plants.get_power_plants()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/refineries")
async def get_refineries_layer():
    """Get refineries"""
    try:
        return await refineries.get_refineries()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/population-density")
async def get_population_density_layer():
    """Get population density WMS info"""
    try:
        return await population_density.get_population_density_wms()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/population-points")
async def get_population_points_layer():
    """Get population as points"""
    try:
        return await population_density.get_population_points()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/population-exposure")
async def get_population_exposure_layer():
    """Get population exposure risk"""
    try:
        return await population_exposure.calculate_population_exposure()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/satellite/no2")
async def get_satellite_no2():
    """Get NO2 satellite layer"""
    try:
        return await satellite_indicators.get_satellite_no2()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/satellite/so2")
async def get_satellite_so2():
    """Get SO2 satellite layer"""
    try:
        return await satellite_indicators.get_satellite_so2()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/satellite/aod")
async def get_satellite_aod():
    """Get AOD satellite layer"""
    try:
        return await satellite_indicators.get_satellite_aod()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/land-temperature")
async def get_land_temperature_layer_route():
    """Get land surface temperature"""
    try:
        return await land_temperature.get_land_temperature_layer()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/wind-climate")
async def get_wind_climate_layer():
    """Get wind and climate data"""
    try:
        return await wind_climate.get_wind_climate()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/crop-burning")
async def get_crop_burning_layer(days: int = Query(7, ge=1, le=30)):
    """Get crop burning fires"""
    try:
        return await crop_burning.get_crop_burning_fires(days=days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/fire-density")
async def get_fire_density_layer(date_from: Optional[str] = None, date_to: Optional[str] = None):
    """Get fire density grid"""
    try:
        return await crop_burning.get_fire_density(date_from, date_to)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/aqi-validation")
async def get_aqi_validation_layer():
    """Get AQI validation with fire correlation"""
    try:
        return await aqi_validation.get_aqi_validation()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bhuvan-aod")
async def get_bhuvan_aod():
    """Get Bhuvan AOD WMS layer info"""
    try:
        return await pollution_heatmap.get_bhuvan_aod_layer()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# NEW: Bhuvan WMS Layer Endpoints
@router.get("/bhuvan/satellite-imagery")
async def get_bhuvan_satellite_imagery():
    """Get Bhuvan high-resolution satellite imagery layer"""
    try:
        return await satellite_indicators.get_satellite_imagery()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bhuvan/layers")
async def get_all_bhuvan_layers():
    """Get all available Bhuvan WMS layers"""
    try:
        from data_sources.bhuvan_loader import bhuvan_loader
        layers = bhuvan_loader.get_all_layers()
        return {
            'type': 'bhuvan_layers',
            'count': len(layers),
            'layers': [
                {
                    'id': key,
                    'name': info['name'],
                    'title': info['title'],
                    'description': info['description'],
                    'wms_url': bhuvan_loader.get_wms_url(key)
                }
                for key, info in layers.items()
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
