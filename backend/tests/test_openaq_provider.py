"""
Comprehensive Unit & Integration Test Suite for OpenAQ v3 Provider.

Tests all Milestone 1 requirements:
1. BaseProvider inheritance and contract signatures.
2. OpenAQ v3 request formatting, headers, parameters (countries_id: 9, bbox).
3. Rate limiting throttle and chunking behavior.
4. Data Quality routing via backend.core.quality.calculate_dqs() and boundary validation.
5. Idempotent persistence and deduplication on (station_id, parameter, timestamp).
6. Strict Zero-Fake-Data invariant (no random fallback, clean error exits).
7. Full pipeline ingestion orchestration.
8. Live OpenAQ API connectivity when API key is present.
"""

import asyncio
from datetime import datetime, timezone
import inspect
import math
import os
import time
from typing import Any, Dict, List
import unittest.mock as mock

import httpx
import pytest
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from pathlib import Path
import sys

# Ensure backend directory is in sys.path regardless of how pytest is invoked
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from config.settings import settings
from db.database import Base
from models.domain import OpenAQStation, OpenAQMeasurement
from data_sources.base import BaseProvider
from data_sources.openaq_loader import OpenAQProvider, OpenAQLoader, RateLimiter, openaq_loader
from core.quality import calculate_dqs, validate_value


import pytest_asyncio

# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def provider_with_key():
    """Provider instance configured with a mock API key and high-speed limiter."""
    limiter = RateLimiter(max_calls=1000, period_seconds=1.0)
    return OpenAQProvider(api_key="mock_openaq_key_12345", rate_limiter=limiter)


@pytest_asyncio.fixture
async def async_db_session():
    """In-memory SQLite asynchronous session for testing database persistence."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


# =============================================================================
# 1. BaseProvider Contract & Signatures
# =============================================================================

class TestBaseProviderContract:
    def test_inheritance_and_instance(self, provider_with_key):
        """Verify OpenAQProvider correctly subclasses BaseProvider."""
        assert issubclass(OpenAQProvider, BaseProvider)
        assert isinstance(provider_with_key, BaseProvider)

    def test_provider_name_property(self, provider_with_key):
        """Verify provider_name is exactly 'openaq'."""
        assert provider_with_key.provider_name == "openaq"

    def test_required_methods_are_async(self, provider_with_key):
        """Verify all lifecycle methods exist and are coroutines."""
        for method_name in ("fetch_data", "process_data", "save_data", "ingest"):
            method = getattr(provider_with_key, method_name, None)
            assert method is not None, f"Method {method_name} missing"
            assert inspect.iscoroutinefunction(method), f"{method_name} must be async coroutine"

    def test_backward_compatibility_aliases(self):
        """Verify backwards-compatibility aliases for legacy services."""
        assert OpenAQLoader is OpenAQProvider
        assert isinstance(openaq_loader, OpenAQProvider)


# =============================================================================
# 2. Request Formatting & Parameters
# =============================================================================

class TestOpenAQRequestFormatting:
    @pytest.mark.asyncio
    async def test_request_headers_include_api_key(self, provider_with_key):
        """Verify X-API-Key is passed in request headers."""
        captured_request = None

        def handler(request: httpx.Request) -> httpx.Response:
            nonlocal captured_request
            captured_request = request
            return httpx.Response(200, json={"results": []})

        transport = httpx.MockTransport(handler)
        client = httpx.AsyncClient(transport=transport, headers={"X-API-Key": provider_with_key.api_key})
        provider_with_key._client = client

        await provider_with_key.fetch_data()
        assert captured_request is not None
        assert captured_request.headers.get("X-API-Key") == "mock_openaq_key_12345"

    @pytest.mark.asyncio
    async def test_query_uses_countries_id_9_for_india(self, provider_with_key):
        """Verify locations endpoint queries countries_id: 9 (NOT 102)."""
        captured_url = None

        def handler(request: httpx.Request) -> httpx.Response:
            nonlocal captured_url
            captured_url = str(request.url)
            return httpx.Response(200, json={"results": []})

        transport = httpx.MockTransport(handler)
        provider_with_key._client = httpx.AsyncClient(transport=transport)

        await provider_with_key.fetch_data()
        assert captured_url is not None
        assert "countries_id=9" in captured_url
        assert "countries_id=102" not in captured_url

    @pytest.mark.asyncio
    async def test_bbox_query_string_formatting(self, provider_with_key):
        """Verify bbox string parameter is correctly forwarded."""
        captured_url = None

        def handler(request: httpx.Request) -> httpx.Response:
            nonlocal captured_url
            captured_url = str(request.url)
            return httpx.Response(200, json={"results": []})

        transport = httpx.MockTransport(handler)
        provider_with_key._client = httpx.AsyncClient(transport=transport)

        await provider_with_key.fetch_data(bbox="68.0,6.0,98.0,37.0")
        assert "bbox=68.0%2C6.0%2C98.0%2C37.0" in captured_url or "bbox=68.0,6.0,98.0,37.0" in captured_url

    @pytest.mark.asyncio
    async def test_bbox_tuple_formatting(self, provider_with_key):
        """Verify bbox tuple (min_lon, min_lat, max_lon, max_lat) is properly parsed."""
        captured_url = None

        def handler(request: httpx.Request) -> httpx.Response:
            nonlocal captured_url
            captured_url = str(request.url)
            return httpx.Response(200, json={"results": []})

        transport = httpx.MockTransport(handler)
        provider_with_key._client = httpx.AsyncClient(transport=transport)

        await provider_with_key.fetch_data(bbox=(77.0, 28.0, 78.0, 29.0))
        assert "bbox=77.0%2C28.0%2C78.0%2C29.0" in captured_url or "bbox=77.0,28.0,78.0,29.0" in captured_url

    @pytest.mark.asyncio
    async def test_country_name_maps_to_id_9(self, provider_with_key):
        """Verify passing country='IN' sets countries_id: 9."""
        captured_url = None

        def handler(request: httpx.Request) -> httpx.Response:
            nonlocal captured_url
            captured_url = str(request.url)
            return httpx.Response(200, json={"results": []})

        transport = httpx.MockTransport(handler)
        provider_with_key._client = httpx.AsyncClient(transport=transport)

        await provider_with_key.fetch_data(country="IN")
        assert "countries_id=9" in captured_url


# =============================================================================
# 3. Rate Limiting & Pagination Chunking
# =============================================================================

class TestRateLimitingAndChunking:
    @pytest.mark.asyncio
    async def test_token_bucket_rate_limiter_throttles(self):
        """Verify token bucket enforces throttling when token capacity is exceeded."""
        # 2 tokens per 0.1 seconds = 20 req/sec limit
        limiter = RateLimiter(max_calls=2, period_seconds=0.1)

        start = time.monotonic()
        await limiter.acquire()  # Token 1 (immediate)
        await limiter.acquire()  # Token 2 (immediate)
        await limiter.acquire()  # Token 3 (must throttle)
        duration = time.monotonic() - start

        # Third acquire must have caused a non-trivial pause
        assert duration >= 0.04, f"Rate limiter did not throttle: duration={duration}s"

    @pytest.mark.asyncio
    async def test_pagination_chunking(self):
        """Verify fetch_data chunks across multiple pages when limit exceeds page size."""
        calls = []

        def handler(request: httpx.Request) -> httpx.Response:
            url_str = str(request.url)
            calls.append(url_str)
            page = 1
            if "page=2" in url_str:
                page = 2
            elif "page=3" in url_str:
                page = 3

            # Return 100 items for p1 and p2, 50 items for p3
            count = 50 if page == 3 else 100
            results = [{"id": (page - 1) * 100 + i, "name": f"Station_{(page-1)*100+i}"} for i in range(count)]
            return httpx.Response(200, json={"results": results})

        transport = httpx.MockTransport(handler)
        limiter = RateLimiter(max_calls=1000, period_seconds=1.0)
        provider = OpenAQProvider(api_key="test_key", rate_limiter=limiter)
        provider._client = httpx.AsyncClient(transport=transport)

        data = await provider.fetch_data(limit=250)

        assert len(calls) == 3
        assert len(data) == 250
        assert data[0]["id"] == 0
        assert data[-1]["id"] == 249


# =============================================================================
# 4. Process Data & Data Quality Routing
# =============================================================================

class TestProcessDataQualityRouting:
    @pytest.mark.asyncio
    async def test_valid_pm25_tagged_with_real_dqs(self, provider_with_key):
        """Verify a physically valid PM2.5 observation is routed through calculate_dqs and tagged."""
        now_iso = datetime.now(timezone.utc).isoformat()
        raw_data = {
            "results": [
                {
                    "locationId": 1054,
                    "parameter": {"name": "pm25", "units": "µg/m³"},
                    "value": 45.5,
                    "datetime": {"utc": now_iso},
                    "coordinates": {"latitude": 28.6139, "longitude": 77.2090},
                }
            ]
        }

        processed = await provider_with_key.process_data(raw_data)
        measurements = processed.get("measurements", [])

        assert len(measurements) == 1
        m = measurements[0]
        assert m["station_id"] == "1054"
        assert m["parameter"] == "pm25"
        assert m["value"] == 45.5
        assert "dqs" in m
        # Fresh (< 1h), distance 0km, reference grade => DQS = 1.0 * 1.0 * 1.0 * 1.0 = 1.0
        assert m["dqs"] == 1.0

    @pytest.mark.asyncio
    async def test_discard_negative_value_q_valid_zero(self, provider_with_key):
        """Verify physically impossible negative values (Q_valid == 0.0) are discarded."""
        raw_data = [
            {"station_id": "1", "parameter": "pm25", "value": -12.0, "timestamp": datetime.now(timezone.utc).isoformat()},
            {"station_id": "2", "parameter": "pm10", "value": 55.0, "timestamp": datetime.now(timezone.utc).isoformat()},
        ]

        processed = await provider_with_key.process_data(raw_data)
        measurements = processed.get("measurements", [])

        # Negative PM2.5 must be discarded; valid PM10 must be retained
        assert len(measurements) == 1
        assert measurements[0]["station_id"] == "2"
        assert measurements[0]["parameter"] == "pm10"
        assert measurements[0]["value"] == 55.0

    @pytest.mark.asyncio
    async def test_discard_out_of_bounds_value(self, provider_with_key):
        """Verify values exceeding physical upper bounds (e.g. PM2.5 > 1000 ug/m3) are discarded."""
        raw_data = [
            {"station_id": "1", "parameter": "pm25", "value": 2500.0, "timestamp": datetime.now(timezone.utc).isoformat()},
        ]

        processed = await provider_with_key.process_data(raw_data)
        measurements = processed.get("measurements", [])
        assert len(measurements) == 0

    @pytest.mark.asyncio
    async def test_discard_nan_and_inf_values(self, provider_with_key):
        """Verify non-finite float values are safely discarded."""
        raw_data = [
            {"station_id": "1", "parameter": "pm25", "value": float("nan")},
            {"station_id": "2", "parameter": "pm25", "value": float("inf")},
            {"station_id": "3", "parameter": "pm25", "value": None},
        ]

        processed = await provider_with_key.process_data(raw_data)
        assert len(processed.get("measurements", [])) == 0

    @pytest.mark.asyncio
    async def test_stale_measurement_gets_zero_dqs(self, provider_with_key):
        """Verify stale data (> 24h old) receives DQS == 0.0 but is not discarded if value is valid."""
        # 48 hours ago
        stale_ts = "2024-01-01T00:00:00Z"
        raw_data = [
            {"station_id": "1", "parameter": "pm25", "value": 35.0, "timestamp": stale_ts},
        ]

        processed = await provider_with_key.process_data(raw_data)
        measurements = processed.get("measurements", [])
        assert len(measurements) == 1
        assert measurements[0]["dqs"] == 0.0

    @pytest.mark.asyncio
    async def test_station_record_extraction(self, provider_with_key):
        """Verify monitoring station locations are parsed into OpenAQStation schema."""
        raw_data = {
            "locations": [
                {
                    "id": 999,
                    "name": "Delhi RK Puram",
                    "locality": "Delhi",
                    "country": {"id": 9, "code": "IN", "name": "India"},
                    "coordinates": {"latitude": 28.56, "longitude": 77.18},
                    "datetimeLast": {"utc": "2026-09-05T01:00:00Z"},
                    "sensors": [
                        {"id": 1, "name": "pm25", "parameter": {"name": "pm25"}},
                        {"id": 2, "name": "no2", "parameter": {"name": "no2"}},
                    ],
                }
            ]
        }

        processed = await provider_with_key.process_data(raw_data)
        stations = processed.get("stations", [])
        assert len(stations) == 1
        st = stations[0]
        assert st["station_id"] == "999"
        assert st["name"] == "Delhi RK Puram"
        assert st["city"] == "Delhi"
        assert st["country"] == "IN"
        assert st["latitude"] == 28.56
        assert st["longitude"] == 77.18
        assert "no2" in st["parameters"]
        assert "pm25" in st["parameters"]


# =============================================================================
# 5. Idempotent Persistence & Deduplication
# =============================================================================

class TestIdempotentPersistence:
    @pytest.mark.asyncio
    async def test_save_data_creates_initial_records(self, provider_with_key, async_db_session):
        """Verify save_data writes station and measurement records to database."""
        processed = {
            "stations": [
                {
                    "station_id": "st_001",
                    "name": "Connaught Place",
                    "latitude": 28.63,
                    "longitude": 77.21,
                    "city": "Delhi",
                    "country": "IN",
                    "last_updated": "2026-09-05T00:00:00Z",
                }
            ],
            "measurements": [
                {
                    "station_id": "st_001",
                    "parameter": "pm25",
                    "value": 40.0,
                    "unit": "µg/m³",
                    "timestamp": "2026-09-05T00:00:00Z",
                    "dqs": 1.0,
                },
                {
                    "station_id": "st_001",
                    "parameter": "pm10",
                    "value": 85.0,
                    "unit": "µg/m³",
                    "timestamp": "2026-09-05T00:00:00Z",
                    "dqs": 1.0,
                },
            ],
        }

        await provider_with_key.save_data(processed, async_db_session)

        st_count = await async_db_session.scalar(select(func.count(OpenAQStation.station_id)))
        m_count = await async_db_session.scalar(select(func.count(OpenAQMeasurement.id)))

        assert st_count == 1
        assert m_count == 2

    @pytest.mark.asyncio
    async def test_successive_save_data_produces_no_duplicate_rows(
        self, provider_with_key, async_db_session
    ):
        """
        Verify idempotency invariant: repeated save_data calls with the same records
        never create duplicate rows in OpenAQStation or OpenAQMeasurement.
        """
        processed = {
            "stations": [
                {
                    "station_id": "st_002",
                    "name": "Bandra",
                    "latitude": 19.05,
                    "longitude": 72.83,
                    "city": "Mumbai",
                    "country": "IN",
                    "last_updated": "2026-09-05T01:00:00Z",
                }
            ],
            "measurements": [
                {
                    "station_id": "st_002",
                    "parameter": "pm25",
                    "value": 25.0,
                    "unit": "µg/m³",
                    "timestamp": "2026-09-05T01:00:00Z",
                    "dqs": 0.95,
                }
            ],
        }

        # Run 1
        await provider_with_key.save_data(processed, async_db_session)
        st_count_1 = await async_db_session.scalar(select(func.count(OpenAQStation.station_id)))
        m_count_1 = await async_db_session.scalar(select(func.count(OpenAQMeasurement.id)))
        assert st_count_1 == 1
        assert m_count_1 == 1

        # Run 2: Exact same data
        await provider_with_key.save_data(processed, async_db_session)
        st_count_2 = await async_db_session.scalar(select(func.count(OpenAQStation.station_id)))
        m_count_2 = await async_db_session.scalar(select(func.count(OpenAQMeasurement.id)))
        assert st_count_2 == 1, "Duplicate station row created!"
        assert m_count_2 == 1, "Duplicate measurement row created!"

        # Run 3: Exact same data again
        await provider_with_key.save_data(processed, async_db_session)
        st_count_3 = await async_db_session.scalar(select(func.count(OpenAQStation.station_id)))
        m_count_3 = await async_db_session.scalar(select(func.count(OpenAQMeasurement.id)))
        assert st_count_3 == 1
        assert m_count_3 == 1

    @pytest.mark.asyncio
    async def test_in_batch_duplicates_collapsed_to_single_row(
        self, provider_with_key, async_db_session
    ):
        """Verify that multiple duplicate records within the SAME batch insert only 1 database row."""
        processed = {
            "stations": [{"station_id": "st_003", "name": "Whitefield"}],
            "measurements": [
                {
                    "station_id": "st_003",
                    "parameter": "pm25",
                    "value": 30.0,
                    "unit": "µg/m³",
                    "timestamp": "2026-09-05T02:00:00Z",
                },
                {
                    "station_id": "st_003",
                    "parameter": "pm25",
                    "value": 30.0,
                    "unit": "µg/m³",
                    "timestamp": "2026-09-05T02:00:00Z",
                },
                {
                    "station_id": "st_003",
                    "parameter": "pm25",
                    "value": 30.0,
                    "unit": "µg/m³",
                    "timestamp": "2026-09-05T02:00:00Z",
                },
            ],
        }

        await provider_with_key.save_data(processed, async_db_session)
        m_count = await async_db_session.scalar(select(func.count(OpenAQMeasurement.id)))
        assert m_count == 1

    @pytest.mark.asyncio
    async def test_upsert_updates_existing_measurement_value(
        self, provider_with_key, async_db_session
    ):
        """Verify that updating a measurement's value for the same natural key updates in place."""
        initial = {
            "measurements": [
                {
                    "station_id": "st_004",
                    "parameter": "no2",
                    "value": 40.0,
                    "unit": "µg/m³",
                    "timestamp": "2026-09-05T03:00:00Z",
                }
            ]
        }
        await provider_with_key.save_data(initial, async_db_session)

        # Updated observation with value=45.0
        updated = {
            "measurements": [
                {
                    "station_id": "st_004",
                    "parameter": "no2",
                    "value": 45.0,
                    "unit": "µg/m³",
                    "timestamp": "2026-09-05T03:00:00Z",
                }
            ]
        }
        await provider_with_key.save_data(updated, async_db_session)

        stmt = select(OpenAQMeasurement).where(
            OpenAQMeasurement.station_id == "st_004",
            OpenAQMeasurement.parameter == "no2",
            OpenAQMeasurement.timestamp == "2026-09-05T03:00:00Z",
        )
        res = await async_db_session.execute(stmt)
        record = res.scalars().one()
        assert record.value == 45.0


# =============================================================================
# 6. Zero-Fake-Data Invariant
# =============================================================================

class TestZeroFakeDataInvariant:
    @pytest.mark.asyncio
    async def test_missing_api_key_returns_empty_list(self):
        """Verify empty return when API key is missing (no fake fallback)."""
        provider = OpenAQProvider(api_key="")
        result = await provider.fetch_data()
        assert result == []

    @pytest.mark.asyncio
    async def test_http_401_unauthorized_returns_empty_list(self, provider_with_key):
        """Verify HTTP 401 returns empty list cleanly without throwing or generating mock data."""
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(401, json={"message": "Unauthorized. Invalid API key."})

        transport = httpx.MockTransport(handler)
        provider_with_key._client = httpx.AsyncClient(transport=transport)

        result = await provider_with_key.fetch_data()
        assert result == []

    @pytest.mark.asyncio
    async def test_http_429_rate_limited_returns_empty_list(self, provider_with_key):
        """Verify HTTP 429 returns empty list cleanly."""
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(429, json={"message": "Rate limit exceeded."})

        transport = httpx.MockTransport(handler)
        provider_with_key._client = httpx.AsyncClient(transport=transport)

        result = await provider_with_key.fetch_data()
        assert result == []

    @pytest.mark.asyncio
    async def test_network_connection_error_returns_empty_list(self, provider_with_key):
        """Verify network error returns empty list cleanly without unhandled exception."""
        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("Connection refused by peer", request=request)

        transport = httpx.MockTransport(handler)
        provider_with_key._client = httpx.AsyncClient(transport=transport)

        result = await provider_with_key.fetch_data()
        assert result == []

    def test_mock_data_generators_completely_removed(self):
        """Source inspection test: verify _get_sample_measurements and random.uniform are removed."""
        assert not hasattr(OpenAQProvider, "_get_sample_measurements")
        assert not hasattr(OpenAQLoader, "_get_sample_measurements")

        import data_sources.openaq_loader as openaq_module
        source_code = inspect.getsource(openaq_module)

        assert "_get_sample_measurements" not in source_code
        assert "random.uniform" not in source_code
        assert "random.seed" not in source_code
        assert "s_delhi_1" not in source_code


# =============================================================================
# 7. Pipeline Ingestion Orchestration
# =============================================================================

class TestPipelineIngest:
    @pytest.mark.asyncio
    async def test_ingest_orchestration(self, provider_with_key, async_db_session):
        """Verify BaseProvider.ingest coordinates fetch -> process -> save end-to-end."""
        now_iso = datetime.now(timezone.utc).isoformat()
        mock_payload = [
            {
                "id": 888,
                "name": "Hyderabad US Consulate",
                "locality": "Hyderabad",
                "country": {"code": "IN"},
                "coordinates": {"latitude": 17.44, "longitude": 78.46},
            }
        ]

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={"results": mock_payload})

        transport = httpx.MockTransport(handler)
        provider_with_key._client = httpx.AsyncClient(transport=transport)

        summary = await provider_with_key.ingest(async_db_session)
        assert summary["status"] == "success"
        assert summary["provider"] == "openaq"

        # Check that station was saved to DB
        st = await async_db_session.scalar(
            select(OpenAQStation).where(OpenAQStation.station_id == "888")
        )
        assert st is not None
        assert st.name == "Hyderabad US Consulate"

    @pytest.mark.asyncio
    async def test_ingest_handles_no_data_cleanly(self, provider_with_key, async_db_session):
        """Verify ingest exits cleanly when fetch_data returns empty."""
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={"results": []})

        transport = httpx.MockTransport(handler)
        provider_with_key._client = httpx.AsyncClient(transport=transport)

        summary = await provider_with_key.ingest(async_db_session)
        assert summary["status"] == "success"
        assert "No data" in summary["message"]


# =============================================================================
# 8. Live API Test (Executed if OPENAQ_API_KEY is configured)
# =============================================================================

class TestLiveOpenAQAPI:
    @pytest.mark.asyncio
    async def test_live_openaq_v3_fetch_if_key_available(self):
        """
        Live integration test querying real OpenAQ v3 API.
        Skips cleanly if OPENAQ_API_KEY is not configured.
        """
        api_key = getattr(settings, "OPENAQ_API_KEY", "") or os.environ.get("OPENAQ_API_KEY", "")
        if not api_key:
            pytest.skip("OPENAQ_API_KEY not configured in environment/.env; skipping live API test.")

        provider = OpenAQProvider(api_key=api_key)
        try:
            results = await provider.fetch_data(limit=2)
            assert isinstance(results, list)
            if results:
                first = results[0]
                assert "id" in first
                assert "name" in first
                # Verify country is India (id: 9)
                country = first.get("country", {})
                if isinstance(country, dict):
                    assert country.get("id") == 9
        finally:
            await provider.close()
