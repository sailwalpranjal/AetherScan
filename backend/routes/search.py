"""Location search and geocoding routes"""
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, List
import httpx
from config.settings import settings

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/location")
async def search_location(
    query: str = Query(..., min_length=2, description="Location name or address to search"),
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
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Use Nominatim API (free, no API key required)
            params = {
                'q': query,
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
                'query': query,
                'count': len(locations),
                'results': locations
            }

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

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reverse geocoding failed: {str(e)}")


@router.get("/industries")
async def search_industries(
    query: str = Query(..., min_length=2, description="Industry name to search"),
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
    try:
        from layers import power_plants, industry_overlay, refineries

        results = []
        query_lower = query.lower()

        # Search power plants
        try:
            power_plant_data = await power_plants.get_power_plants()
            if power_plant_data and 'features' in power_plant_data:
                for feature in power_plant_data['features']:
                    props = feature.get('properties', {})
                    name = props.get('name', '')
                    if query_lower in name.lower():
                        coords = feature.get('geometry', {}).get('coordinates', [0, 0])
                        results.append({
                            'name': name,
                            'type': 'Power Plant',
                            'category': 'power-plant',
                            'latitude': coords[1],
                            'longitude': coords[0],
                            'capacity_mw': props.get('capacity_mw'),
                            'fuel_type': props.get('fuel_type'),
                            'details': props
                        })
        except Exception as e:
            print(f"Error searching power plants: {e}")

        # Search industries
        try:
            industry_data = await industry_overlay.get_industry_overlay()
            if industry_data and 'features' in industry_data:
                for feature in industry_data['features']:
                    props = feature.get('properties', {})
                    name = props.get('name', '')
                    if query_lower in name.lower():
                        coords = feature.get('geometry', {}).get('coordinates', [0, 0])
                        results.append({
                            'name': name,
                            'type': 'Industry',
                            'category': 'industry',
                            'latitude': coords[1],
                            'longitude': coords[0],
                            'industry_type': props.get('industry_type'),
                            'details': props
                        })
        except Exception as e:
            print(f"Error searching industries: {e}")

        # Search refineries
        try:
            refinery_data = await refineries.get_refineries()
            if refinery_data and 'features' in refinery_data:
                for feature in refinery_data['features']:
                    props = feature.get('properties', {})
                    name = props.get('name', '')
                    if query_lower in name.lower():
                        coords = feature.get('geometry', {}).get('coordinates', [0, 0])
                        results.append({
                            'name': name,
                            'type': 'Refinery',
                            'category': 'refinery',
                            'latitude': coords[1],
                            'longitude': coords[0],
                            'capacity': props.get('capacity'),
                            'details': props
                        })
        except Exception as e:
            print(f"Error searching refineries: {e}")

        # Sort by relevance (exact matches first, then partial)
        results.sort(key=lambda x: (
            not x['name'].lower().startswith(query_lower),
            x['name'].lower()
        ))

        # Limit results
        results = results[:limit]

        return {
            'query': query,
            'count': len(results),
            'results': results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Industry search failed: {str(e)}")
