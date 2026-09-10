"""
Integration test — validates every external API key / secret in .env.

Run from the backend/ directory:
    python tests/test_integrations.py

Each test makes exactly ONE real HTTP request and asserts a valid response.
No fake fallbacks — a failed assertion means the key is invalid or unreachable.
"""

__test__ = False

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict

import httpx

_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))


# ── Load .env ─────────────────────────────────────────────────────────────────
def _load_dotenv(env_path: Path) -> None:
    if not env_path.exists():
        return
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


_load_dotenv(_backend_dir / ".env")


def _env(key: str) -> str:
    v = os.environ.get(key, "").strip()
    if not v:
        return ""
    return v


def _safe_str(s: Any) -> str:
    """Return ASCII-safe string (strip non-ASCII chars)."""
    return str(s).encode("ascii", "replace").decode("ascii")


# ── 1. OpenAQ v3 ─────────────────────────────────────────────────────────────
async def test_openaq(client: httpx.AsyncClient) -> Dict[str, Any]:
    key = _env("OPENAQ_API_KEY")
    if not key:
        return {"status": "SKIP", "reason": "OPENAQ_API_KEY not set"}

    resp = await client.get(
        "https://api.openaq.org/v3/locations",
        params={"countries_id": 9, "limit": 1},
        headers={"X-API-Key": key},
        timeout=20.0,
    )
    if resp.status_code == 200:
        results = resp.json().get("results", [])
        return {"status": "PASS", "detail": f"{len(results)} location(s) returned for India"}
    return {"status": "FAIL", "detail": f"HTTP {resp.status_code}: {resp.text[:100]}"}


# ── 2. NASA FIRMS MAP_KEY ─────────────────────────────────────────────────────
async def test_firms(client: httpx.AsyncClient) -> Dict[str, Any]:
    key = _env("NASA_FIRMS_API_KEY")
    if not key:
        return {"status": "SKIP", "reason": "NASA_FIRMS_API_KEY not set"}

    # Small 1-day VIIRS NOAA-20 NRT request over India
    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/VIIRS_NOAA20_NRT/68.0,6.0,97.5,37.5/1"
    resp = await client.get(url, timeout=60.0)

    if resp.status_code != 200:
        return {"status": "FAIL", "detail": f"HTTP {resp.status_code}"}
    if "<!DOCTYPE" in resp.text[:50] or "Invalid" in resp.text[:100]:
        return {"status": "FAIL", "detail": "HTML/error response — MAP_KEY may be invalid"}

    lines = [l for l in resp.text.strip().splitlines() if l]
    fire_count = max(0, len(lines) - 1)
    return {"status": "PASS", "detail": f"{fire_count} fire point(s) in CSV (0 = no fires, key OK)"}


# ── 3. NASA Earthdata Token ───────────────────────────────────────────────────
async def test_earthdata(client: httpx.AsyncClient) -> Dict[str, Any]:
    """
    Validate the Earthdata JWT Bearer token against NASA CMR search API.
    CMR is the canonical Earthdata service that accepts this token type.
    The /api/users/tokens endpoint requires Basic auth (username+password),
    not Bearer — wrong endpoint for this token type.
    """
    token = _env("NASA_EARTHDATA_TOKEN")
    if not token:
        return {"status": "SKIP", "reason": "NASA_EARTHDATA_TOKEN not set"}

    # NASA Common Metadata Repository — accepts Earthdata Bearer JWT
    resp = await client.get(
        "https://cmr.earthdata.nasa.gov/search/collections.json",
        params={"short_name": "VIIRS_SNPP_NRT", "page_size": 1},
        headers={"Authorization": f"Bearer {token}"},
        timeout=20.0,
    )
    if resp.status_code == 200:
        entries = resp.json().get("feed", {}).get("entry", [])
        return {"status": "PASS", "detail": f"CMR accepted token, {len(entries)} collection(s) returned"}
    return {"status": "FAIL", "detail": f"CMR returned HTTP {resp.status_code}: {resp.text[:100]}"}


# ── 4. Copernicus CDSE OAuth2 ─────────────────────────────────────────────────
async def test_cdse_auth(client: httpx.AsyncClient) -> Dict[str, Any]:
    cid = _env("CDSE_CLIENT_ID")
    csec = _env("CDSE_CLIENT_SECRET")
    if not cid or not csec:
        return {"status": "SKIP", "reason": "CDSE_CLIENT_ID or CDSE_CLIENT_SECRET not set"}

    resp = await client.post(
        "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
        data={"grant_type": "client_credentials", "client_id": cid, "client_secret": csec},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30.0,
    )
    if resp.status_code == 200 and "access_token" in resp.json():
        expires = resp.json().get("expires_in", "?")
        return {"status": "PASS", "detail": f"Token obtained (expires_in={expires}s)"}
    return {"status": "FAIL", "detail": f"HTTP {resp.status_code}: {resp.text[:100]}"}


# ── 5. CDSE OData — Sentinel-5P NO2 product search ────────────────────────────
async def test_cdse_odata_no2(client: httpx.AsyncClient) -> Dict[str, Any]:
    # No auth required for OData search
    now = datetime.now(timezone.utc)
    date_from = (now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    date_to = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    odata_filter = (
        f"Collection/Name eq 'SENTINEL-5P' "
        f"and contains(Name,'L2__NO2___') "
        f"and ContentDate/Start gt {date_from} "
        f"and ContentDate/Start lt {date_to}"
    )

    resp = await client.get(
        "https://catalogue.dataspace.copernicus.eu/odata/v1/Products",
        params={"$filter": odata_filter, "$top": 2, "$orderby": "ContentDate/Start desc"},
        timeout=30.0,
    )
    if resp.status_code == 200:
        products = resp.json().get("value", [])
        if products:
            return {"status": "PASS", "detail": f"{len(products)} NO2 product(s) found today"}
        return {"status": "PASS", "detail": "0 products in window (query worked, no data today)"}
    return {"status": "FAIL", "detail": f"HTTP {resp.status_code}: {resp.text[:100]}"}


# ── 6. data.gov.in API ────────────────────────────────────────────────────────
async def test_ogd_india(client: httpx.AsyncClient) -> Dict[str, Any]:
    """
    Validate data.gov.in API key using the catalog search endpoint.
    The specific CPCB resource (3b01bcb8...) appears to be inactive/slow.
    The catalog search endpoint is lighter and responds faster.
    """
    key = _env("OGD_INDIA_API_KEY")
    if not key:
        return {"status": "SKIP", "reason": "OGD_INDIA_API_KEY not set"}

    try:
        # Use catalog listing — lighter than resource data fetch
        resp = await client.get(
            "https://api.data.gov.in/catalog",
            params={"api-key": key, "format": "json", "offset": 0, "limit": 1},
            timeout=45.0,
        )
    except httpx.ReadTimeout:
        # data.gov.in infrastructure is known to be slow; treat as warning
        return {
            "status": "WARN",
            "detail": "ReadTimeout — data.gov.in API slow (key may be valid, server unresponsive)",
        }

    if resp.status_code == 200:
        body = resp.json()
        total = body.get("total", "?")
        return {"status": "PASS", "detail": f"API key valid. Catalog total: {total} datasets"}
    if resp.status_code == 401:
        return {"status": "FAIL", "detail": "Unauthorized — check OGD_INDIA_API_KEY"}
    return {"status": "FAIL", "detail": f"HTTP {resp.status_code}: {resp.text[:100]}"}


# ── Runner ────────────────────────────────────────────────────────────────────

async def run_all() -> None:
    tests = [
        ("OpenAQ v3", test_openaq),
        ("NASA FIRMS MAP_KEY", test_firms),
        ("NASA Earthdata Token", test_earthdata),
        ("Copernicus CDSE OAuth2", test_cdse_auth),
        ("CDSE OData NO2 search", test_cdse_odata_no2),
        ("data.gov.in API", test_ogd_india),
    ]

    results: Dict[str, Dict] = {}
    async with httpx.AsyncClient(follow_redirects=True) as client:
        for name, fn in tests:
            print(f"  Testing {name}...", end="", flush=True)
            try:
                result = await fn(client)
                results[name] = result
                print(f" {result['status']}")
            except Exception as e:
                results[name] = {"status": "ERROR", "detail": _safe_str(e)[:120]}
                print(f" ERROR")

    print("\n" + "=" * 62)
    print("  INTEGRATION TEST RESULTS")
    print("=" * 62)
    all_pass = True
    for name, r in results.items():
        status = r.get("status", "?")
        detail = _safe_str(r.get("detail", r.get("reason", "")))
        label = f"[{status}]"
        print(f"  {label:<7} {name}")
        if detail:
            print(f"           {detail}")
        if status not in ("PASS", "SKIP"):
            all_pass = False
    print("=" * 62)
    print(f"  Overall: {'ALL PASS' if all_pass else 'FAILURES DETECTED'}")
    print("=" * 62)


if __name__ == "__main__":
    asyncio.run(run_all())
