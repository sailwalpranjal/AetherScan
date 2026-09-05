"""
data.gov.in (OGD India) Data Provider for AetherScan.

Uses the data.gov.in REST API (api.data.gov.in/resource/) authenticated
with the OGD_INDIA_API_KEY (free registration).

Key datasets targeted:
  - Thermal power plants (NTPC / CEA)
  - CPCB ambient air quality monitoring stations

Zero-Fake-Data: if API key missing or request fails → return []
Zero-Cost: data.gov.in API is publicly free.
"""

import logging
import os
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


def _load_env(key: str, default: str = "") -> str:
    val = os.environ.get(key, "")
    if val:
        return val.strip()
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    try:
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith(f"{key}="):
                    return line.split("=", 1)[1].strip()
    except OSError:
        pass
    return default


# Resource IDs on data.gov.in
RESOURCE_IDS = {
    # CPCB ambient monitoring station list
    "cpcb_aqi_stations": "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69",
    # Thermal power plants (CEA)
    "thermal_power_plants": "dd9a33da-da38-4e97-b35c-78e6afc8e4f3",
}

BASE_URL = "https://api.data.gov.in/resource"


class DataGovIndiaProvider:
    """
    Fetches open government datasets from data.gov.in.
    Handles pagination and returns structured records.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = (api_key or _load_env("OGD_INDIA_API_KEY")).strip()

    @property
    def provider_name(self) -> str:
        return "data_gov_india"

    async def fetch_resource(
        self,
        resource_id: str,
        limit: int = 100,
        offset: int = 0,
        filters: Optional[Dict[str, str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch records from a data.gov.in resource endpoint.

        Args:
            resource_id:  The resource UUID from data.gov.in
            limit:        Number of records per page (max 100)
            offset:       Pagination offset
            filters:      Optional field=value filter dict

        Returns empty list on auth failure or network error.
        """
        if not self.api_key:
            logger.warning("[OGD] API key not set — returning empty (zero-fake-data).")
            return []

        params: Dict[str, Any] = {
            "api-key": self.api_key,
            "format": "json",
            "limit": min(100, limit),
            "offset": offset,
        }
        if filters:
            for k, v in filters.items():
                params[f"filters[{k}]"] = v

        url = f"{BASE_URL}/{resource_id}"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(url, params=params)
        except httpx.RequestError as exc:
            logger.warning(f"[OGD] Network error fetching {resource_id}: {exc}")
            return []

        if resp.status_code == 401:
            logger.warning("[OGD] Unauthorized (HTTP 401). Check OGD_INDIA_API_KEY.")
            return []
        if resp.status_code != 200:
            logger.warning(f"[OGD] HTTP {resp.status_code}: {resp.text[:200]}")
            return []

        body = resp.json()
        records = body.get("records", [])
        logger.info(f"[OGD] Fetched {len(records)} records from resource {resource_id}.")
        return records

    async def fetch_cpcb_stations(self, limit: int = 200) -> List[Dict[str, Any]]:
        """Fetch CPCB ambient air quality station list."""
        return await self.fetch_resource(
            RESOURCE_IDS["cpcb_aqi_stations"],
            limit=limit,
        )

    async def fetch_thermal_power_plants(self, limit: int = 200) -> List[Dict[str, Any]]:
        """Fetch thermal power plant locations from CEA dataset."""
        return await self.fetch_resource(
            RESOURCE_IDS["thermal_power_plants"],
            limit=limit,
        )

    async def validate_api_key(self) -> Dict[str, Any]:
        """
        Verify the API key is working by making a minimal probe request.
        Returns status dict suitable for the integration test runner.
        """
        records = await self.fetch_resource(
            RESOURCE_IDS["cpcb_aqi_stations"],
            limit=1,
        )
        if records is not None and isinstance(records, list):
            return {"status": "ok", "sample_count": len(records)}
        return {"status": "error", "message": "Unexpected response structure"}


# Module-level singleton
data_gov_india_provider = DataGovIndiaProvider()
