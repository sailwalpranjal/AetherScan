"""
Copernicus Data Space Ecosystem (CDSE) — Sentinel-5P TROPOMI NO2 Provider.

Uses:
  - CDSE OData v1 API for product discovery (no auth required for search)
  - CDSE OAuth2 client_credentials for authenticated asset download
  - Product filter: Collection/Name eq 'SENTINEL-5P' and contains(Name,'L2__NO2___')

Zero-Fake-Data:
  - If auth fails → log warning and return empty list.
  - If no products found for the bbox/period → return empty list.
  - Never fabricate NO2 values.

Zero-Cost:
  - Only CDSE free-tier open data is accessed.
  - Full NetCDF downloads (multi-GB) are NOT done automatically; only
    metadata + download URLs are returned for scheduled ingestion.
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

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


CDSE_TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu"
    "/auth/realms/CDSE/protocol/openid-connect/token"
)
CDSE_ODATA_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"
CDSE_DOWNLOAD_BASE = "https://zipper.dataspace.copernicus.eu/odata/v1/Products"


class CopernicusNO2Provider:
    """
    Fetches Sentinel-5P TROPOMI NO2 product metadata for a bounding box
    and time range from the CDSE OData v1 API.

    Returns product metadata + signed download URLs.
    Full NetCDF download is intentionally deferred (multi-GB per file).
    """

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
    ):
        self.client_id = (client_id or _load_env("CDSE_CLIENT_ID")).strip()
        self.client_secret = (client_secret or _load_env("CDSE_CLIENT_SECRET")).strip()
        self._token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None

    @property
    def provider_name(self) -> str:
        return "copernicus_no2"

    # ------------------------------------------------------------------
    # OAuth2 token management
    # ------------------------------------------------------------------

    async def _get_token(self, client: httpx.AsyncClient) -> Optional[str]:
        """Obtain or refresh a CDSE OAuth2 access token."""
        if not self.client_id or not self.client_secret:
            logger.warning("[CDSE] client_id or client_secret not set.")
            return None

        now = datetime.now(timezone.utc)
        if self._token and self._token_expiry and now < self._token_expiry - timedelta(minutes=5):
            return self._token

        try:
            resp = await client.post(
                CDSE_TOKEN_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30.0,
            )
        except httpx.RequestError as exc:
            logger.warning(f"[CDSE] Token request failed: {exc}")
            return None

        if resp.status_code != 200:
            logger.warning(f"[CDSE] Token returned HTTP {resp.status_code}: {resp.text[:200]}")
            return None

        body = resp.json()
        self._token = body.get("access_token")
        expires_in = int(body.get("expires_in", 600))
        self._token_expiry = now + timedelta(seconds=expires_in)
        logger.info("[CDSE] OAuth2 token obtained.")
        return self._token

    # ------------------------------------------------------------------
    # OData product search — no auth required
    # ------------------------------------------------------------------

    async def search_no2_products(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        max_results: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Query CDSE OData for Sentinel-5P L2__NO2___ products.

        Args:
            date_from:   ISO datetime string, e.g. "2024-01-01T00:00:00Z"
            date_to:     ISO datetime string, e.g. "2024-01-07T23:59:59Z"
            max_results: Max products to return

        Returns list of product metadata dicts. Empty on error.
        """
        now = datetime.now(timezone.utc)
        if date_from is None:
            date_from = (now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        if date_to is None:
            date_to = now.strftime("%Y-%m-%dT%H:%M:%SZ")

        odata_filter = (
            f"Collection/Name eq 'SENTINEL-5P' "
            f"and contains(Name,'L2__NO2___') "
            f"and ContentDate/Start gt {date_from} "
            f"and ContentDate/Start lt {date_to}"
        )

        params = {
            "$filter": odata_filter,
            "$top": max_results,
            "$orderby": "ContentDate/Start desc",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(CDSE_ODATA_URL, params=params)
        except httpx.RequestError as exc:
            logger.warning(f"[CDSE] OData search failed: {exc}")
            return []

        if resp.status_code != 200:
            logger.warning(f"[CDSE] OData returned HTTP {resp.status_code}: {resp.text[:200]}")
            return []

        products = []
        for item in resp.json().get("value", []):
            content_date = item.get("ContentDate", {})
            products.append({
                "product_id": item.get("Id"),
                "name": item.get("Name"),
                "start_date": content_date.get("Start"),
                "end_date": content_date.get("End"),
                "size_bytes": item.get("ContentLength"),
                "online": item.get("Online", True),
                "download_url": f"{CDSE_DOWNLOAD_BASE}({item.get('Id')})/$value",
                "source": "Sentinel-5P TROPOMI NRTI",
                "provider": self.provider_name,
            })

        logger.info(f"[CDSE] Found {len(products)} NO2 products.")
        return products

    async def validate_credentials(self) -> Dict[str, Any]:
        """
        Test OAuth2 credentials. Returns status dict.
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            token = await self._get_token(client)

        if token:
            return {"status": "ok", "message": "CDSE token obtained successfully"}
        return {
            "status": "error",
            "message": "Failed to obtain token — check CDSE_CLIENT_ID / CDSE_CLIENT_SECRET",
        }


# Module-level singleton
copernicus_no2_provider = CopernicusNO2Provider()
