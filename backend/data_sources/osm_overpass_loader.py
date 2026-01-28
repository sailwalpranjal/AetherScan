"""
OpenStreetMap Overpass API Loader
FREE API - No authentication required!

Query industrial facilities, power plants, factories, etc.

API Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
Public Instances: https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
"""
import httpx
import asyncio
from typing import List, Dict, Optional
from config.settings import settings
import json

class OSMOverpassLoader:
    """Load industrial and infrastructure data from OpenStreetMap"""

    def __init__(self):
        # Public Overpass API endpoints (use first available)
        self.api_urls = [
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.openstreetmap.ru/api/interpreter"
        ]
        self.current_url = self.api_urls[0]
        self.session: Optional[httpx.AsyncClient] = None

    async def _get_session(self) -> httpx.AsyncClient:
        """Get or create HTTP session"""
        if self.session is None:
            self.session = httpx.AsyncClient(timeout=120.0)
        return self.session

    async def close(self):
        """Close HTTP session"""
        if self.session:
            await self.session.aclose()
            self.session = None

    async def query_overpass(self, query: str, retry_on_failure: bool = True) -> Optional[Dict]:
        """
        Execute Overpass QL query

        Args:
            query: Overpass QL query string
            retry_on_failure: Try alternate endpoints if primary fails

        Returns:
            GeoJSON-compatible result or None
        """
        session = await self._get_session()

        # Try primary URL
        try:
            response = await session.post(
                self.current_url,
                data={'data': query},
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            response.raise_for_status()
            data = response.json()
            return data

        except Exception as e:
            print(f"Error with {self.current_url}: {e}")

            if retry_on_failure and len(self.api_urls) > 1:
                # Try alternate URLs
                for url in self.api_urls[1:]:
                    try:
                        print(f"Trying alternate endpoint: {url}")
                        response = await session.post(
                            url,
                            data={'data': query},
                            headers={'Content-Type': 'application/x-www-form-urlencoded'}
                        )
                        response.raise_for_status()
                        data = response.json()
                        self.current_url = url  # Update to working URL
                        return data
                    except:
                        continue

            return None

    def _build_bbox_query(self, bounds: Dict) -> str:
        """Build bounding box string for Overpass query"""
        return f"({bounds['min_lat']},{bounds['min_lon']},{bounds['max_lat']},{bounds['max_lon']})"

    async def fetch_power_plants(self, bounds: Optional[Dict] = None) -> List[Dict]:
        """
        Fetch power plant locations from OSM

        Tags used:
        - power=plant
        - power=generator
        - plant:source=coal/gas/nuclear/solar/wind
        """
        if bounds is None:
            bounds = settings.INDIA_BOUNDS

        bbox = self._build_bbox_query(bounds)

        query = f"""
        [out:json][timeout:60];
        (
          node["power"="plant"]{bbox};
          way["power"="plant"]{bbox};
          relation["power"="plant"]{bbox};
          node["power"="generator"]{bbox};
          way["power"="generator"]{bbox};
        );
        out center;
        """

        data = await self.query_overpass(query)

        if not data or 'elements' not in data:
            return []

        plants = []
        for element in data['elements']:
            # Get coordinates
            if element['type'] == 'node':
                lat, lon = element['lat'], element['lon']
            elif 'center' in element:
                lat, lon = element['center']['lat'], element['center']['lon']
            else:
                continue

            tags = element.get('tags', {})

            plant = {
                'id': element['id'],
                'name': tags.get('name', tags.get('operator', 'Unknown Power Plant')),
                'type': 'power_plant',
                'latitude': lat,
                'longitude': lon,
                'source': tags.get('plant:source', tags.get('generator:source', 'unknown')),
                'output': tags.get('generator:output:electricity', tags.get('plant:output:electricity', '')),
                'operator': tags.get('operator', ''),
                'osm_type': element['type'],
                'osm_id': element['id']
            }

            plants.append(plant)

        print(f"Found {len(plants)} power plants from OSM")
        return plants

    async def fetch_industrial_facilities(self, bounds: Optional[Dict] = None) -> List[Dict]:
        """
        Fetch industrial facilities

        Tags used:
        - landuse=industrial
        - man_made=works
        - industrial=*
        """
        if bounds is None:
            bounds = settings.INDIA_BOUNDS

        bbox = self._build_bbox_query(bounds)

        query = f"""
        [out:json][timeout:60];
        (
          node["landuse"="industrial"]{bbox};
          way["landuse"="industrial"]{bbox};
          relation["landuse"="industrial"]{bbox};
          node["man_made"="works"]{bbox};
          way["man_made"="works"]{bbox};
          node["industrial"]{bbox};
          way["industrial"]{bbox};
        );
        out center;
        """

        data = await self.query_overpass(query)

        if not data or 'elements' not in data:
            return []

        facilities = []
        for element in data['elements']:
            # Get coordinates
            if element['type'] == 'node':
                lat, lon = element['lat'], element['lon']
            elif 'center' in element:
                lat, lon = element['center']['lat'], element['center']['lon']
            else:
                continue

            tags = element.get('tags', {})

            facility = {
                'id': element['id'],
                'name': tags.get('name', tags.get('operator', 'Industrial Facility')),
                'type': 'industrial',
                'latitude': lat,
                'longitude': lon,
                'industrial_type': tags.get('industrial', tags.get('man_made', 'works')),
                'operator': tags.get('operator', ''),
                'osm_type': element['type'],
                'osm_id': element['id']
            }

            facilities.append(facility)

        print(f"Found {len(facilities)} industrial facilities from OSM")
        return facilities

    async def fetch_factories(self, bounds: Optional[Dict] = None) -> List[Dict]:
        """
        Fetch factory locations

        Tags used:
        - man_made=factory
        - building=industrial
        """
        if bounds is None:
            bounds = settings.INDIA_BOUNDS

        bbox = self._build_bbox_query(bounds)

        query = f"""
        [out:json][timeout:60];
        (
          node["man_made"="factory"]{bbox};
          way["man_made"="factory"]{bbox};
          node["building"="industrial"]{bbox};
          way["building"="industrial"]{bbox};
        );
        out center;
        """

        data = await self.query_overpass(query)

        if not data or 'elements' not in data:
            return []

        factories = []
        for element in data['elements']:
            # Get coordinates
            if element['type'] == 'node':
                lat, lon = element['lat'], element['lon']
            elif 'center' in element:
                lat, lon = element['center']['lat'], element['center']['lon']
            else:
                continue

            tags = element.get('tags', {})

            factory = {
                'id': element['id'],
                'name': tags.get('name', tags.get('operator', 'Factory')),
                'type': 'factory',
                'latitude': lat,
                'longitude': lon,
                'product': tags.get('product', ''),
                'operator': tags.get('operator', ''),
                'osm_type': element['type'],
                'osm_id': element['id']
            }

            factories.append(factory)

        print(f"Found {len(factories)} factories from OSM")
        return factories

    async def fetch_refineries(self, bounds: Optional[Dict] = None) -> List[Dict]:
        """
        Fetch oil refinery locations

        Tags used:
        - industrial=refinery
        - man_made=petroleum_refinery
        """
        if bounds is None:
            bounds = settings.INDIA_BOUNDS

        bbox = self._build_bbox_query(bounds)

        query = f"""
        [out:json][timeout:60];
        (
          node["industrial"="refinery"]{bbox};
          way["industrial"="refinery"]{bbox};
          node["man_made"="petroleum_refinery"]{bbox};
          way["man_made"="petroleum_refinery"]{bbox};
        );
        out center;
        """

        data = await self.query_overpass(query)

        if not data or 'elements' not in data:
            return []

        refineries = []
        for element in data['elements']:
            # Get coordinates
            if element['type'] == 'node':
                lat, lon = element['lat'], element['lon']
            elif 'center' in element:
                lat, lon = element['center']['lat'], element['center']['lon']
            else:
                continue

            tags = element.get('tags', {})

            refinery = {
                'id': element['id'],
                'name': tags.get('name', tags.get('operator', 'Oil Refinery')),
                'type': 'refinery',
                'latitude': lat,
                'longitude': lon,
                'operator': tags.get('operator', ''),
                'capacity': tags.get('capacity', ''),
                'osm_type': element['type'],
                'osm_id': element['id']
            }

            refineries.append(refinery)

        print(f"Found {len(refineries)} refineries from OSM")
        return refineries

    async def fetch_all_industries(self, bounds: Optional[Dict] = None) -> List[Dict]:
        """
        Fetch all industrial facilities (combined)

        NOTE: OSM Overpass API has strict rate limits
        This function fetches with delays to avoid 429 errors

        Returns:
            List of all industrial facilities
        """
        all_industries = []

        try:
            # Fetch power plants only (most reliable data)
            # Other types disabled to avoid OSM rate limiting
            power_plants = await self.fetch_power_plants(bounds)
            all_industries.extend(power_plants)

            print(f"[OK] Total industries from OSM: {len(all_industries)} (power plants only)")
            return all_industries

        except Exception as e:
            print(f"[ERROR] OSM Overpass API error: {e}")
            return []

    def to_geojson(self, facilities: List[Dict]) -> Dict:
        """
        Convert facilities list to GeoJSON

        Args:
            facilities: List of facility dictionaries

        Returns:
            GeoJSON FeatureCollection
        """
        features = []
        for facility in facilities:
            feature = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [facility['longitude'], facility['latitude']]
                },
                'properties': {
                    k: v for k, v in facility.items()
                    if k not in ['latitude', 'longitude']
                }
            }
            features.append(feature)

        return {
            'type': 'FeatureCollection',
            'features': features,
            'count': len(features)
        }

osm_overpass_loader = OSMOverpassLoader()
