"""Location search and geocoding routes"""
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Optional
import httpx
from config.settings import settings

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/location")
async def search_location(
    query: Optional[str] = Query(None, min_length=2, description="Location name or address to search"),
    q: Optional[str] = Query(None, min_length=2, description="Alias for query"),
    limit: int = Query(5, ge=1, le=10, description="Maximum number of results")
) -> Dict:
    """
    Search for locations in India by name using Nominatim (OpenStreetMap)

    Args:
        query: Location name (e.g., "Delhi", "Mumbai", "Bengaluru")
        limit: Maximum number of results to return

    Returns:
        List of matching locations with coordinates and details
    """
    search_term = (query or q or "").strip()
    if len(search_term) < 2:
        raise HTTPException(status_code=422, detail="Query must be at least 2 characters long")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Use Nominatim API (free, no API key required)
            params = {
                'q': search_term,
                'format': 'json',
                'limit': limit,
                'countrycodes': 'in',  # Restrict to India
                'addressdetails': 1,
                'bounded': 1,
                'viewbox': f"{settings.INDIA_BOUNDS['min_lon']},{settings.INDIA_BOUNDS['min_lat']},{settings.INDIA_BOUNDS['max_lon']},{settings.INDIA_BOUNDS['max_lat']}"
            }

            response = await client.get(
                'https://nominatim.openstreetmap.org/search',
                params=params,
                headers={'User-Agent': 'AetherScan/1.0'}
            )

            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Geocoding service unavailable")

            results = response.json()

            # Format results
            locations = []
            for result in results:
                address = result.get('address', {})
                locations.append({
                    'name': result.get('display_name', ''),
                    'latitude': float(result.get('lat', 0)),
                    'longitude': float(result.get('lon', 0)),
                    'type': result.get('type', ''),
                    'city': address.get('city') or address.get('town') or address.get('village', ''),
                    'state': address.get('state', ''),
                    'country': address.get('country', 'India'),
                    'bbox': result.get('boundingbox', [])
                })

            return {
                'query': search_term,
                'count': len(locations),
                'results': locations
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/reverse")
async def reverse_geocode(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude")
) -> Dict:
    """
    Reverse geocode coordinates to get location details

    Args:
        lat: Latitude
        lon: Longitude

    Returns:
        Location details for the coordinates
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            params = {
                'lat': lat,
                'lon': lon,
                'format': 'json',
                'addressdetails': 1
            }

            response = await client.get(
                'https://nominatim.openstreetmap.org/reverse',
                params=params,
                headers={'User-Agent': 'AetherScan/1.0'}
            )

            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Reverse geocoding failed")

            result = response.json()
            address = result.get('address', {})

            return {
                'name': result.get('display_name', ''),
                'latitude': lat,
                'longitude': lon,
                'city': address.get('city') or address.get('town') or address.get('village', ''),
                'state': address.get('state', ''),
                'district': address.get('state_district', ''),
                'country': address.get('country', ''),
                'postcode': address.get('postcode', ''),
                'type': result.get('type', '')
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reverse geocoding failed: {str(e)}")


@router.get("/industries")
async def search_industries(
    query: Optional[str] = Query(None, min_length=2, description="Industry name to search"),
    q: Optional[str] = Query(None, min_length=2, description="Alias for query"),
    limit: int = Query(5, ge=1, le=20, description="Maximum number of results")
) -> Dict:
    """
    Search for industries, power plants, and refineries by name

    Args:
        query: Industry/facility name to search
        limit: Maximum number of results

    Returns:
        List of matching industrial facilities
    """
    search_term = (query or q or "").strip()
    if len(search_term) < 2:
        raise HTTPException(status_code=422, detail="Query must be at least 2 characters long")

    try:
        from db.database import db_manager
        from data_sources.global_power_plant_loader import global_power_plant_loader

        results = []
        query_lower = search_term.lower()

        # 1. Query SQLite database
        try:
            rows = await db_manager.fetch_all(
                """
                SELECT id, name, type, latitude, longitude, state, capacity
                FROM industries
                WHERE LOWER(name) LIKE :pattern OR LOWER(state) LIKE :pattern
                ORDER BY CASE WHEN LOWER(name) LIKE :prefix THEN 0 ELSE 1 END, name ASC
                LIMIT :limit
                """,
                {"pattern": f"%{query_lower}%", "prefix": f"{query_lower}%", "limit": limit}
            )
            for row in rows:
                results.append({
                    'id': row['id'],
                    'name': row['name'],
                    'type': row.get('type', 'Power Plant'),
                    'category': 'power-plant' if 'power' in str(row.get('type', '')).lower() or row.get('type') in ('Coal', 'Gas', 'Hydro', 'Solar', 'Wind', 'Biomass', 'Nuclear') else 'industry',
                    'latitude': float(row['latitude']),
                    'longitude': float(row['longitude']),
                    'capacity_mw': row.get('capacity'),
                    'state': row.get('state'),
                    'details': dict(row)
                })
        except Exception as db_err:
            logger_err = f"DB search failed, using GPPD: {db_err}"

        # 2. Fallback to GPPD in-memory list if SQLite returned nothing
        if not results:
            try:
                plants_gppd = global_power_plant_loader.load_india_power_plants()
                for plant in plants_gppd:
                    name = plant.get('name', '')
                    if query_lower in name.lower():
                        results.append({
                            'id': plant.get('gppd_idnr') or name,
                            'name': name,
                            'type': plant.get('primary_fuel', 'Power Plant'),
                            'category': 'power-plant',
                            'latitude': float(plant.get('latitude', 0)),
                            'longitude': float(plant.get('longitude', 0)),
                            'capacity_mw': plant.get('capacity_mw'),
                            'state': plant.get('state'),
                            'details': plant
                        })
                        if len(results) >= limit:
                            break
            except Exception as gppd_err:
                pass

        return {
            'query': search_term,
            'count': len(results),
            'results': results
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Industry search failed: {str(e)}")
