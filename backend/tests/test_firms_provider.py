"""
Comprehensive Unit & Integration Test Suite for NASA FIRMS Data Provider.

Tests all Milestone 2 requirements:
1. BaseProvider inheritance and contract signatures.
2. NASA FIRMS Area API request formatting, coordinates (W, S, E, N), day-range clamping.
3. VIIRS vs MODIS attribute normalization (bright_ti4/brightness, confidence, acq_time).
4. Data Quality routing via backend.core.quality.calculate_dqs() and boundary validation.
5. Rate limiting with Token Bucket and chunking for queries > 10 days.
6. Idempotent persistence and deduplication on (latitude, longitude, acq_date, acq_time, satellite).
7. Strict Zero-Fake-Data invariant (no random fallbacks, clean error exits, layer cleanup).
8. Full pipeline ingestion orchestration.
9. Live NASA FIRMS API connectivity when API key is present.
"""

import asyncio
from datetime import datetime, date, timedelta, timezone
import inspect
import math
import os
from pathlib import Path
import re
import sys
import time
from typing import Any, Dict, List
import unittest.mock as mock

import httpx
import pytest
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
import pytest_asyncio

# Ensure backend directory is in sys.path regardless of how pytest is invoked
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from config.settings import settings
from db.database import Base
from models.domain import NASAFirmsFire
from data_sources.base import BaseProvider
from data_sources.nasa_firms_loader import (
    NASAFIRMSProvider,
    NASAFIRMSLoader,
    RateLimiter,
    nasa_firms_provider,
    nasa_firms_loader,
    FireEvent,
    FIRMSFireEvent,
)
from core.quality import calculate_dqs, validate_value


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def provider_with_key():
    """Provider instance configured with a mock API key and high-speed limiter."""
    limiter = RateLimiter(max_calls=1000, period_seconds=1.0)
    return NASAFIRMSProvider(api_key="mock_firms_map_key_12345", rate_limiter=limiter)


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


# Sample CSV payloads
SAMPLE_VIIRS_CSV = (
    "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight\n"
    "30.7333,76.7794,345.6,0.4,0.4,2024-03-01,430,N,VIIRS,l,2.0NRT,295.2,18.5,D\n"
    "31.3260,75.5762,362.1,0.5,0.4,2024-03-01,0430,N,VIIRS,n,2.0NRT,301.0,32.4,D\n"
    "29.0588,76.0856,388.4,0.4,0.4,2024-03-01,1345,N,VIIRS,h,2.0NRT,310.8,65.2,N\n"
)

SAMPLE_MODIS_CSV = (
    "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight\n"
    "28.6139,77.2090,325.4,1.1,1.0,2024-03-01,0615,Terra,MODIS,85,6.1NRT,298.0,42.1,D\n"
    "26.8467,80.9462,318.0,1.2,1.1,2024-03-01,0615,Terra,MODIS,55,6.1NRT,292.0,21.0,D\n"
    "25.5941,85.1376,305.2,1.0,1.0,2024-03-01,1830,Aqua,MODIS,20,6.1NRT,285.5,8.5,N\n"
)


# =============================================================================
# 1. BaseProvider Contract & Signatures
# =============================================================================

class TestBaseProviderContract:
    def test_inheritance_and_instance(self, provider_with_key):
        """Verify NASAFIRMSProvider correctly subclasses BaseProvider."""
        assert issubclass(NASAFIRMSProvider, BaseProvider)
        assert isinstance(provider_with_key, BaseProvider)

    def test_provider_name_property(self, provider_with_key):
        """Verify provider_name is exactly 'nasa_firms'."""
        assert provider_with_key.provider_name == "nasa_firms"

    def test_required_methods_are_async(self, provider_with_key):
        """Verify all lifecycle methods exist and are coroutines."""
        for method_name in ("fetch_data", "process_data", "save_data", "ingest"):
            method = getattr(provider_with_key, method_name, None)
            assert method is not None, f"Method {method_name} missing"
            assert inspect.iscoroutinefunction(method), f"{method_name} must be async coroutine"

    def test_backward_compatibility_aliases(self):
        """Verify backwards-compatibility aliases for legacy services."""
        assert NASAFIRMSLoader is NASAFIRMSProvider
        assert isinstance(nasa_firms_provider, NASAFIRMSProvider)
        assert nasa_firms_loader is nasa_firms_provider
        assert FireEvent is NASAFirmsFire
        assert FIRMSFireEvent is NASAFirmsFire


# =============================================================================
# 2. Area API Request Formatting & Coordinates
# =============================================================================

class TestFIRMSAreaRequestFormatting:
    def test_default_bounding_box_formatting(self, provider_with_key):
        """Verify default India bbox is formatted as W, S, E, N."""
        area_str = provider_with_key._format_area(None)
        assert area_str == "68.0,6.0,97.5,37.5"

    def test_bbox_tuple_and_list_formatting(self, provider_with_key):
        """Verify tuple and list bboxes format to min_lon,min_lat,max_lon,max_lat."""
        bbox_tuple = (68.0, 6.0, 97.5, 37.5)
        assert provider_with_key._format_area(bbox_tuple) == "68.0,6.0,97.5,37.5"

        bbox_list = [70.0, 10.0, 90.0, 30.0]
        assert provider_with_key._format_area(bbox_list) == "70.0,10.0,90.0,30.0"

    def test_bbox_dict_formatting(self, provider_with_key):
        """Verify dict bboxes format correctly."""
        d1 = {"west": 68.0, "south": 6.0, "east": 97.5, "north": 37.5}
        assert provider_with_key._format_area(d1) == "68.0,6.0,97.5,37.5"

        d2 = {"min_lon": 68.0, "min_lat": 6.0, "max_lon": 97.5, "max_lat": 37.5}
        assert provider_with_key._format_area(d2) == "68.0,6.0,97.5,37.5"

    def test_legacy_india_bbox_coordinate_detection(self, provider_with_key):
        """Verify legacy (min_lat, min_lon, max_lat, max_lon) is converted to W, S, E, N."""
        legacy_bbox = (6.0, 68.0, 37.0, 98.0)
        assert provider_with_key._format_area(legacy_bbox) == "68.0,6.0,98.0,37.0"

    @pytest.mark.asyncio
    async def test_fetch_data_url_construction(self, provider_with_key):
        """Verify fetch_data queries the exact NASA FIRMS Area API CSV endpoint."""
        mock_response = httpx.Response(200, text=SAMPLE_VIIRS_CSV)
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.get = mock.AsyncMock(return_value=mock_response)
        mock_client.is_closed = False

        provider_with_key._client = mock_client

        results = await provider_with_key.fetch_data(
            source="VIIRS_NOAA20_NRT",
            area=(68.0, 6.0, 97.5, 37.5),
            days=3,
        )

        assert len(results) == 3
        mock_client.get.assert_called_once()
        called_url = mock_client.get.call_args[0][0]

        expected_prefix = (
            f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
            f"mock_firms_map_key_12345/VIIRS_NOAA20_NRT/68.0,6.0,97.5,37.5/3"
        )
        assert called_url == expected_prefix

    @pytest.mark.asyncio
    async def test_fetch_data_with_date_parameter(self, provider_with_key):
        """Verify fetch_data includes optional DATE parameter when provided."""
        mock_response = httpx.Response(200, text=SAMPLE_VIIRS_CSV)
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.get = mock.AsyncMock(return_value=mock_response)
        mock_client.is_closed = False
        provider_with_key._client = mock_client

        await provider_with_key.fetch_data(
            source="VIIRS_NOAA20_NRT",
            area=(68.0, 6.0, 97.5, 37.5),
            days=5,
            date="2024-03-01",
        )

        called_url = mock_client.get.call_args[0][0]
        assert called_url.endswith("/5/2024-03-01")


# =============================================================================
# 3. VIIRS and MODIS Attribute Normalization
# =============================================================================

class TestVIIRSMODISAttributeNormalization:
    @pytest.mark.asyncio
    async def test_viirs_csv_normalization(self, provider_with_key):
        """
        Verify VIIRS CSV parsing:
        - bright_ti4 is mapped to brightness
        - confidence 'l', 'n', 'h' mapped to 'low', 'nominal', 'high'
        - acq_time padded to 4 digits ("0430")
        - ISO 8601 UTC timestamp built
        """
        processed = await provider_with_key.process_data(SAMPLE_VIIRS_CSV)
        assert len(processed) == 3

        # First record: bright_ti4=345.6, conf='l', acq_time=430 -> '0430'
        r1 = processed[0]
        assert r1["latitude"] == 30.7333
        assert r1["longitude"] == 76.7794
        assert r1["brightness"] == 345.6
        assert r1["confidence"] == "low"
        assert r1["confidence_numeric"] == 25.0
        assert r1["acq_time"] == "0430"
        assert r1["timestamp"] == "2024-03-01T04:30:00Z"
        assert r1["satellite"] == "N"
        assert r1["frp"] == 18.5

        # Second record: conf='n'
        r2 = processed[1]
        assert r2["confidence"] == "nominal"
        assert r2["confidence_numeric"] == 50.0

        # Third record: conf='h'
        r3 = processed[2]
        assert r3["confidence"] == "high"
        assert r3["confidence_numeric"] == 90.0

    @pytest.mark.asyncio
    async def test_modis_csv_normalization(self, provider_with_key):
        """
        Verify MODIS CSV parsing:
        - brightness is mapped to brightness
        - integer confidence mapped to categories (>=80 high, 30-79 nominal, <30 low)
        """
        processed = await provider_with_key.process_data(SAMPLE_MODIS_CSV)
        assert len(processed) == 3

        # 85 -> high
        assert processed[0]["brightness"] == 325.4
        assert processed[0]["confidence"] == "high"
        assert processed[0]["confidence_numeric"] == 85.0
        assert processed[0]["satellite"] == "Terra"

        # 55 -> nominal
        assert processed[1]["brightness"] == 318.0
        assert processed[1]["confidence"] == "nominal"
        assert processed[1]["confidence_numeric"] == 55.0

        # 20 -> low
        assert processed[2]["brightness"] == 305.2
        assert processed[2]["confidence"] == "low"
        assert processed[2]["confidence_numeric"] == 20.0

    @pytest.mark.asyncio
    async def test_discard_physically_invalid_coordinates(self, provider_with_key):
        """Rows with invalid coordinates outside [-90, 90] and [-180, 180] are discarded."""
        bad_csv = (
            "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight\n"
            "95.0,76.7,345.6,0.4,0.4,2024-03-01,0430,N,VIIRS,n,2.0NRT,295.2,18.5,D\n"
            "30.0,205.0,345.6,0.4,0.4,2024-03-01,0430,N,VIIRS,n,2.0NRT,295.2,18.5,D\n"
            "invalid,76.7,345.6,0.4,0.4,2024-03-01,0430,N,VIIRS,n,2.0NRT,295.2,18.5,D\n"
        )
        processed = await provider_with_key.process_data(bad_csv)
        assert len(processed) == 0


# =============================================================================
# 4. Data Quality Engine Routing
# =============================================================================

class TestFIRMSDataQualityRouting:
    @pytest.mark.asyncio
    async def test_fresh_fire_observation_dqs_score(self, provider_with_key):
        """
        Verify fresh satellite observation (< 1h) achieves expected DQS:
        DQS = Q_fresh(1.0) * Q_spatial(0.9) * Q_sensor(0.85) * Q_valid(1.0) = 0.765.
        """
        test_time = "2024-03-01T04:30:00Z"
        ref_time = "2024-03-01T04:45:00Z"  # 15 minutes after acquisition (fresh)

        raw_records = [
            {
                "latitude": "30.5",
                "longitude": "76.0",
                "bright_ti4": "350.0",
                "acq_date": "2024-03-01",
                "acq_time": "0430",
                "satellite": "N",
                "confidence": "n",
            }
        ]

        processed = await provider_with_key.process_data(raw_records, ref_time=ref_time)
        assert len(processed) == 1
        dqs = processed[0]["dqs"]

        # Expected: 1.0 * 0.9 * 0.85 * 1.0 = 0.765
        assert math.isclose(dqs, 0.765, rel_tol=1e-3)

    @pytest.mark.asyncio
    async def test_discard_out_of_bounds_brightness(self, provider_with_key):
        """
        Verify physically impossible brightness values outside [200K, 600K]
        are rejected with Q_valid == 0.0 and discarded from output.
        """
        raw_records = [
            # Too cold for active fire / terrestrial (< 200 K)
            {
                "latitude": "30.5",
                "longitude": "76.0",
                "bright_ti4": "150.0",
                "acq_date": "2024-03-01",
                "acq_time": "0430",
                "satellite": "N",
            },
            # Impossibly hot (> 600 K)
            {
                "latitude": "30.5",
                "longitude": "76.0",
                "bright_ti4": "750.0",
                "acq_date": "2024-03-01",
                "acq_time": "0430",
                "satellite": "N",
            },
            # Valid point
            {
                "latitude": "30.5",
                "longitude": "76.0",
                "bright_ti4": "330.0",
                "acq_date": "2024-03-01",
                "acq_time": "0430",
                "satellite": "N",
            },
        ]

        processed = await provider_with_key.process_data(raw_records)
        assert len(processed) == 1
        assert processed[0]["brightness"] == 330.0

    @pytest.mark.asyncio
    async def test_stale_data_gets_zero_dqs(self, provider_with_key):
        """Verify observations older than 24 hours receive DQS = 0.0."""
        ref_time = "2024-03-05T00:00:00Z"
        raw_records = [
            {
                "latitude": "30.5",
                "longitude": "76.0",
                "bright_ti4": "340.0",
                "acq_date": "2024-03-01",  # 4 days earlier (> 24h stale)
                "acq_time": "0430",
                "satellite": "N",
            }
        ]

        processed = await provider_with_key.process_data(raw_records, ref_time=ref_time)
        assert len(processed) == 1
        assert processed[0]["dqs"] == 0.0


# =============================================================================
# 5. Rate Limiting and Chunking
# =============================================================================

class TestRateLimitingAndChunking:
    @pytest.mark.asyncio
    async def test_rate_limiter_throttles_when_tokens_depleted(self):
        """Verify RateLimiter enforces minimum delay when tokens are exhausted."""
        # Limiter with 2 calls per 0.2 seconds
        limiter = RateLimiter(max_calls=2, period_seconds=0.2)

        start = time.monotonic()
        await limiter.acquire()  # token 1
        await limiter.acquire()  # token 2
        await limiter.acquire()  # should sleep until refilled
        elapsed = time.monotonic() - start

        # Must have slept for at least ~0.08 seconds
        assert elapsed >= 0.05

    @pytest.mark.asyncio
    async def test_multi_day_range_chunking(self, provider_with_key):
        """
        Verify queries wider than 10 days (e.g. 25 days) are chunked into
        sequential requests of <= 10 days each per NASA FIRMS constraints.
        """
        mock_response = httpx.Response(200, text=SAMPLE_VIIRS_CSV)
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.get = mock.AsyncMock(return_value=mock_response)
        mock_client.is_closed = False
        provider_with_key._client = mock_client

        # Query 25 days with start date
        await provider_with_key.fetch_data(
            source="VIIRS_NOAA20_NRT",
            area=(68.0, 6.0, 97.5, 37.5),
            days=25,
            date="2024-03-01",
        )

        # 25 days should result in 3 chunks: 10, 10, 5
        assert mock_client.get.call_count == 3

        call_urls = [call[0][0] for call in mock_client.get.call_args_list]

        # Chunk 1: 10 days starting 2024-03-01
        assert "/10/2024-03-01" in call_urls[0]
        # Chunk 2: 10 days starting 2024-03-11
        assert "/10/2024-03-11" in call_urls[1]
        # Chunk 3: 5 days starting 2024-03-21
        assert "/5/2024-03-21" in call_urls[2]


# =============================================================================
# 6. Idempotent Persistence & Deduplication
# =============================================================================

class TestIdempotentPersistence:
    @pytest.mark.asyncio
    async def test_save_data_creates_initial_records(self, provider_with_key, async_db_session):
        """Verify processed fire records are successfully persisted."""
        processed = await provider_with_key.process_data(SAMPLE_VIIRS_CSV)
        await provider_with_key.save_data(processed, async_db_session)

        count = await async_db_session.scalar(select(func.count(NASAFirmsFire.id)))
        assert count == 3

    @pytest.mark.asyncio
    async def test_successive_save_data_produces_no_duplicate_rows(
        self, provider_with_key, async_db_session
    ):
        """
        Verify calling save_data repeatedly with the same records
        results in zero duplicate rows (idempotence).
        """
        processed = await provider_with_key.process_data(SAMPLE_VIIRS_CSV)

        # First save
        await provider_with_key.save_data(processed, async_db_session)
        count_first = await async_db_session.scalar(select(func.count(NASAFirmsFire.id)))
        assert count_first == 3

        # Second save with identical records
        await provider_with_key.save_data(processed, async_db_session)
        count_second = await async_db_session.scalar(select(func.count(NASAFirmsFire.id)))
        assert count_second == 3

    @pytest.mark.asyncio
    async def test_in_batch_duplicates_collapsed_to_single_row(
        self, provider_with_key, async_db_session
    ):
        """
        Verify duplicate records within the same batch sharing
        (lat, lon, acq_date, acq_time, satellite) are collapsed to 1 row.
        """
        duplicate_batch = [
            {
                "latitude": 30.12345,
                "longitude": 75.12345,
                "brightness": 340.0,
                "scan": 0.4,
                "track": 0.4,
                "acq_date": "2024-03-01",
                "acq_time": "0430",
                "satellite": "N",
                "confidence": "nominal",
                "frp": 15.0,
                "timestamp": "2024-03-01T04:30:00Z",
                "dqs": 0.765,
            },
            {
                "latitude": 30.12345,
                "longitude": 75.12345,
                "brightness": 345.0,  # updated brightness
                "scan": 0.4,
                "track": 0.4,
                "acq_date": "2024-03-01",
                "acq_time": "0430",
                "satellite": "N",
                "confidence": "high",
                "frp": 20.0,
                "timestamp": "2024-03-01T04:30:00Z",
                "dqs": 0.765,
            },
        ]

        await provider_with_key.save_data(duplicate_batch, async_db_session)
        count = await async_db_session.scalar(select(func.count(NASAFirmsFire.id)))
        assert count == 1

        saved = await async_db_session.scalar(select(NASAFirmsFire).limit(1))
        assert saved.brightness == 345.0
        assert saved.frp == 20.0

    @pytest.mark.asyncio
    async def test_upsert_updates_existing_record(self, provider_with_key, async_db_session):
        """Verify subsequent save with updated values updates the existing DB record."""
        batch_v1 = [
            {
                "latitude": 29.5,
                "longitude": 76.5,
                "brightness": 320.0,
                "scan": 0.5,
                "track": 0.5,
                "acq_date": "2024-03-01",
                "acq_time": "0600",
                "satellite": "Terra",
                "confidence": "nominal",
                "frp": 10.0,
            }
        ]
        await provider_with_key.save_data(batch_v1, async_db_session)

        # Update values
        batch_v2 = [
            {
                "latitude": 29.5,
                "longitude": 76.5,
                "brightness": 350.0,  # changed
                "scan": 0.5,
                "track": 0.5,
                "acq_date": "2024-03-01",
                "acq_time": "0600",
                "satellite": "Terra",
                "confidence": "high",  # changed
                "frp": 45.0,          # changed
            }
        ]
        await provider_with_key.save_data(batch_v2, async_db_session)

        count = await async_db_session.scalar(select(func.count(NASAFirmsFire.id)))
        assert count == 1

        row = await async_db_session.scalar(select(NASAFirmsFire).limit(1))
        assert row.brightness == 350.0
        assert row.confidence == "high"
        assert row.frp == 45.0


# =============================================================================
# 7. Strict Zero-Fake-Data Invariant
# =============================================================================

class TestZeroFakeDataInvariant:
    @pytest.mark.asyncio
    async def test_missing_api_key_returns_empty_list(self):
        """Missing API key immediately returns [] without making any HTTP request."""
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.is_closed = False
        provider = NASAFIRMSProvider(api_key="", client=mock_client)

        results = await provider.fetch_data()
        assert results == []
        mock_client.get.assert_not_called()

    @pytest.mark.asyncio
    async def test_placeholder_api_key_returns_empty_list(self):
        """Placeholder key returns [] without making any HTTP request."""
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.is_closed = False
        provider = NASAFIRMSProvider(api_key="your_nasa_firms_api_key_here", client=mock_client)

        results = await provider.fetch_data()
        assert results == []
        mock_client.get.assert_not_called()

    @pytest.mark.asyncio
    async def test_http_401_unauthorized_returns_empty_list(self, provider_with_key):
        """HTTP 401 returns [] cleanly without exception or fake data."""
        mock_response = httpx.Response(401, text="Unauthorized")
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.get = mock.AsyncMock(return_value=mock_response)
        mock_client.is_closed = False
        provider_with_key._client = mock_client

        results = await provider_with_key.fetch_data()
        assert results == []

    @pytest.mark.asyncio
    async def test_http_429_rate_limited_returns_empty_list(self, provider_with_key):
        """HTTP 429 returns [] cleanly without exception or fake data."""
        mock_response = httpx.Response(429, text="Too Many Requests")
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.get = mock.AsyncMock(return_value=mock_response)
        mock_client.is_closed = False
        provider_with_key._client = mock_client

        results = await provider_with_key.fetch_data()
        assert results == []

    @pytest.mark.asyncio
    async def test_inline_error_body_returns_empty_list(self, provider_with_key):
        """NASA FIRMS 'Invalid MAP_KEY' or 'Error:' body text returns []."""
        mock_response = httpx.Response(200, text="Invalid MAP_KEY")
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.get = mock.AsyncMock(return_value=mock_response)
        mock_client.is_closed = False
        provider_with_key._client = mock_client

        results = await provider_with_key.fetch_data()
        assert results == []

    @pytest.mark.asyncio
    async def test_network_connection_error_returns_empty_list(self, provider_with_key):
        """Network connection exception returns [] cleanly."""
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.get = mock.AsyncMock(side_effect=httpx.ConnectError("Connection refused"))
        mock_client.is_closed = False
        provider_with_key._client = mock_client

        results = await provider_with_key.fetch_data()
        assert results == []

    def test_zero_synthetic_data_generators_in_provider_source(self):
        """Verify NASAFIRMSProvider contains zero random/mock data generators."""
        src = inspect.getsource(NASAFIRMSProvider)
        assert not re.search(r"random\.(uniform|choice|randint|sample)", src), (
            "Forbidden random synthetic data generator detected in NASAFIRMSProvider!"
        )

    @pytest.mark.asyncio
    async def test_downstream_layer_fallbacks_return_empty_cleanly(self):
        """Verify crop_burning and aqi_validation fallback stubs return empty lists."""
        from layers.crop_burning import _get_fallback_fire_data, _get_fallback_density_data
        from layers.aqi_validation import _get_fallback_validation_data

        assert _get_fallback_fire_data() == []
        assert _get_fallback_density_data() == []
        assert _get_fallback_validation_data() == []


# =============================================================================
# 8. Pipeline Ingestion Orchestration
# =============================================================================

class TestPipelineIngest:
    @pytest.mark.asyncio
    async def test_ingest_orchestration(self, provider_with_key, async_db_session):
        """Verify full fetch -> process -> save workflow via ingest()."""
        mock_response = httpx.Response(200, text=SAMPLE_VIIRS_CSV)
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.get = mock.AsyncMock(return_value=mock_response)
        mock_client.is_closed = False
        provider_with_key._client = mock_client

        result = await provider_with_key.ingest(async_db_session, days=1)
        assert result["status"] == "success"
        assert result["provider"] == "nasa_firms"
        assert result.get("count") == 3

        count = await async_db_session.scalar(select(func.count(NASAFirmsFire.id)))
        assert count == 3

    @pytest.mark.asyncio
    async def test_ingest_handles_no_data_cleanly(self, provider_with_key, async_db_session):
        """Verify ingest handles empty response cleanly without error."""
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.get = mock.AsyncMock(return_value=httpx.Response(200, text=""))
        mock_client.is_closed = False
        provider_with_key._client = mock_client

        result = await provider_with_key.ingest(async_db_session)
        assert result["status"] == "success"
        assert "No data fetched" in result.get("message", "")


# =============================================================================
# 9. Live NASA FIRMS API (Conditional)
# =============================================================================

class TestLiveFIRMSAPI:
    @pytest.mark.asyncio
    async def test_live_firms_fetch_if_key_available(self):
        """
        Live integration test against the real NASA FIRMS Area API.
        Skipped if NASA_FIRMS_API_KEY is not configured or placeholder.
        """
        api_key = (
            getattr(settings, "NASA_FIRMS_API_KEY", "")
            or os.environ.get("NASA_FIRMS_API_KEY", "")
        ).strip()

        if not api_key or api_key in ("your_nasa_firms_api_key_here", "None", ""):
            pytest.skip("No real NASA_FIRMS_API_KEY configured. Skipping live network test.")

        provider = NASAFIRMSProvider(api_key=api_key)
        try:
            # Fetch 1 day of VIIRS detections for India
            raw = await provider.fetch_data(source="VIIRS_NOAA20_NRT", days=1)
            assert isinstance(raw, list)

            if raw:
                processed = await provider.process_data(raw)
                assert isinstance(processed, list)
                for fire in processed:
                    assert "latitude" in fire
                    assert "longitude" in fire
                    assert "brightness" in fire
                    assert "dqs" in fire
                    assert 200.0 <= fire["brightness"] <= 600.0
        finally:
            await provider.close()
