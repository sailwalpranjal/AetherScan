"""Industry vs Pollution Overlay Layer - USES GLOBAL POWER PLANT DATABASE"""
from typing import Dict
from data_sources.global_power_plant_loader import global_power_plant_loader
from data_sources.osm_overpass_loader import osm_overpass_loader
from config.settings import settings
import asyncio

async def get_industry_overlay() -> Dict:
    """
    Get all industries from multiple sources

    Uses Global Power Plant Database (1589 plants) as primary source
    Supplements with OSM refineries for complete coverage

    Returns:
        GeoJSON FeatureCollection with all industries
    """
    try:
        # Use Global Power Plant Database (RELIABLE - no API calls)
        plants_gppd = global_power_plant_loader.load_india_power_plants()

        print(f"[OK] Loaded {len(plants_gppd)} power plants from Global Power Plant Database")

        features = []

        # Add power plants from GPPD
        for plant in plants_gppd:
            lat = plant.get('latitude')
            lon = plant.get('longitude')

            if lat is None or lon is None:
                continue

            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [lon, lat]
                },
                'properties': {
                    'name': plant.get('name', 'Unknown Power Plant'),
                    'type': 'power_plant',
                    'capacity_mw': plant.get('capacity_mw', 0),
                    'fuel_type': plant.get('primary_fuel', 'unknown'),
                    'owner': plant.get('owner', ''),
                    'commissioning_year': plant.get('commissioning_year', ''),
                    'source': 'Global Power Plant Database (WRI)'
                }
            })

        # Try to add refineries from OSM (with timeout protection)
        try:
            refineries = await asyncio.wait_for(
                osm_overpass_loader.fetch_refineries(bounds=settings.INDIA_BOUNDS),
                timeout=10.0  # 10 second timeout
            )

            for refinery in refineries:
                lat = refinery.get('latitude')
                lon = refinery.get('longitude')

                if lat is None or lon is None:
                    continue

                try:
                    lat = float(lat)
                    lon = float(lon)
                    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                        continue
                except (ValueError, TypeError):
                    continue

                features.append({
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [lon, lat]
                    },
                    'properties': {
                        'name': refinery.get('name', 'Unknown Refinery'),
                        'type': 'refinery',
                        'operator': refinery.get('operator', ''),
                        'capacity': refinery.get('capacity', ''),
                        'source': 'OpenStreetMap'
                    }
                })

            print(f"[OK] Added {len(refineries)} refineries from OSM")
        except asyncio.TimeoutError:
            print("[WARN] OSM refinery fetch timed out, using only power plant data")
        except Exception as e:
            print(f"[WARN] OSM refinery fetch failed: {e}, using only power plant data")

        print(f"[OK] Total industries: {len(features)} (power plants + refineries)")

        return {
            'type': 'FeatureCollection',
            'features': features,
            'count': len(features),
            'source': 'Global Power Plant Database (WRI) + OpenStreetMap',
            'url': 'https://datasets.wri.org/dataset/globalpowerplantdatabase'
        }

    except Exception as e:
        print(f"[ERROR] Error fetching industries: {e}")
        return {
            'type': 'FeatureCollection',
            'features': [],
            'count': 0,
            'source': 'Error',
            'error': str(e),
            'message': 'Failed to load industries'
        }
