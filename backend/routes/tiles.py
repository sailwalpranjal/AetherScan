"""Tile generation routes"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from typing import Optional
from core.tile_generator import tile_generator
from layers import dynamic_aqi, pollution_heatmap
import json

router = APIRouter(prefix="/tiles", tags=["tiles"])

@router.get("/heatmap/{z}/{x}/{y}.png")
async def get_heatmap_tile(z: int, x: int, y: int, layer: str = "pollution"):
    """Generate heatmap tile as PNG"""
    try:
        # Check cache first
        cached = tile_generator.get_cached_tile(layer, x, y, z)
        if cached:
            return Response(content=cached, media_type="image/png")

        # Get heatmap data
        if layer == "aqi":
            data = await dynamic_aqi.get_aqi_heatmap_layer(resolution=0.5)
            points = data.get('data', [])
        else:
            data = await pollution_heatmap.get_national_pollution_heatmap()
            points = []
            if data.get('data'):
                lats = data['data']['lats']
                lons = data['data']['lons']
                values = data['data']['values']
                if lats and lons and values:
                    for i in range(len(lats)):
                        for j in range(len(lons[0]) if lons else 0):
                            points.append({
                                'latitude': lats[i],
                                'longitude': lons[j] if j < len(lons) else 0,
                                'value': values[i][j] if isinstance(values[i], list) else values[i]
                            })

        # Generate tile
        tile_data = tile_generator.generate_heatmap_tile(x, y, z, points, color_map='aqi')

        # Cache tile
        tile_generator.cache_tile(layer, x, y, z, tile_data)

        return Response(content=tile_data, media_type="image/png")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vector/{z}/{x}/{y}.geojson")
async def get_vector_tile(z: int, x: int, y: int, layer: str = "sensors"):
    """Generate vector tile as GeoJSON"""
    try:
        features = []

        if layer == "sensors":
            from layers.openaq_sensors import get_sensor_locations
            data = await get_sensor_locations()
            features = data.get('features', [])
        elif layer == "industries":
            from layers.industry_overlay import get_industry_overlay
            data = await get_industry_overlay()
            features = data.get('features', [])
        elif layer == "fires":
            from layers.crop_burning import get_crop_burning_fires
            data = await get_crop_burning_fires(days=7)
            features = data.get('features', [])

        # Generate vector tile
        tile_data = tile_generator.generate_vector_tile(x, y, z, features)

        return tile_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
