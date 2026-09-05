import math
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class FacilityIntelligenceService:
    """
    Core service for the AetherScan Environmental Evidence Chain.
    Coordinates geocoding, buffering, and event detection around industrial facilities.
    """

    def __init__(self, db_manager):
        self.db = db_manager

    def generate_bounding_box(self, lat: float, lon: float, radius_km: float = 10.0) -> Dict[str, float]:
        """
        Generate a bounding box around a coordinate based on a radius.
        1 degree of latitude is ~111km.
        """
        lat_delta = radius_km / 111.0
        # Longitude degree length varies by latitude
        lon_delta = radius_km / (111.0 * math.cos(math.radians(lat)))

        return {
            "min_lat": lat - lat_delta,
            "max_lat": lat + lat_delta,
            "min_lon": lon - lon_delta,
            "max_lon": lon + lon_delta
        }

    async def get_environmental_context(self, facility_id: str) -> Dict[str, Any]:
        """
        Build the Environmental Evidence Chain for a specific facility.
        """
        # Fetch facility details
        facility = await self.db.fetch_one(
            "SELECT * FROM industries WHERE id = :id", 
            {"id": facility_id}
        )
        
        if not facility:
            raise ValueError(f"Facility {facility_id} not found.")

        bbox = self.generate_bounding_box(facility["latitude"], facility["longitude"])

        # In a real implementation, we would query the spatial index here for:
        # - OpenAQ stations within bbox
        # - FIRMS hotspots within bbox
        # - TROPOMI NO2 values within bbox

        logger.info(f"Generated intelligence context for facility {facility['name']}")

        return {
            "facility": dict(facility),
            "spatial_context": {
                "bbox": bbox,
                "radius_km": 10.0
            },
            "evidence_chain": {
                "ground_sensors": [],
                "satellite_observations": [],
                "fire_events": []
            }
        }
