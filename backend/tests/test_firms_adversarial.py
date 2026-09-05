"""
Adversarial Stress-Testing Test Suite for NASA FIRMS Provider (Milestone 2).

Empirically challenges all boundary conditions and failure modes:
1. Malformed / Corrupted CSV inputs (missing columns, non-numeric, NaN, inf, empty, jagged).
2. Physically impossible values (brightness < 200 K, > 600 K, negative, NaN/inf).
3. Coordinate formatting, legacy inversion, and geodesic boundary enforcement.
4. Day range clamping, multi-chunk accumulation, and chunking boundaries.
5. Rate limiter concurrent stress test (Token Bucket under 40 concurrent requests).
6. Idempotent database deduplication and upsert under repetitive batches.
7. Zero-Fake-Data invariant under simulated network, auth, rate limit, and server errors.
"""

import asyncio
from datetime import datetime, timezone
import io
import math
import os
from pathlib import Path
import sys
import time
from typing import Any, Dict, List
import unittest.mock as mock

import httpx
import pytest
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
import pytest_asyncio

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from db.database import Base
from models.domain import NASAFirmsFire
from data_sources.nasa_firms_loader import NASAFIRMSProvider, RateLimiter
from core.quality import calculate_dqs, validate_value
from layers.crop_burning import get_crop_burning_fires, get_fire_density
from layers.aqi_validation import get_aqi_validation


# =============================================================================
# Helper Fixtures
# =============================================================================

@pytest.fixture
def provider():
    limiter = RateLimiter(max_calls=1000, period_seconds=1.0)
    return NASAFIRMSProvider(api_key="valid_test_firms_key", rate_limiter=limiter)


@pytest_asyncio.fixture
async def async_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


# =============================================================================
# 1. Malformed & Corrupted CSV Inputs
# =============================================================================

class TestAdversarialMalformedCSV:
    @pytest.mark.asyncio
    async def test_empty_and_whitespace_csv(self, provider):
        """Empty and whitespace strings must return [] without throwing."""
        assert await provider.process_data("") == []
        assert await provider.process_data("   \n\t  \r\n") == []
        assert await provider.process_data(None) == []

    @pytest.mark.asyncio
    async def test_header_only_csv(self, provider):
        """CSV containing only headers must yield 0 processed records."""
        header_only = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time\n"
        assert await provider.process_data(header_only) == []

    @pytest.mark.asyncio
    async def test_missing_brightness_column(self, provider):
        """CSV lacking brightness / bright_ti4 / bright_ti5 must be discarded."""
        missing_col_csv = (
            "latitude,longitude,scan,track,acq_date,acq_time\n"
            "28.5,77.2,1.0,1.0,2024-03-01,0600\n"
        )
        assert await provider.process_data(missing_col_csv) == []

    @pytest.mark.asyncio
    async def test_non_numeric_and_empty_brightness(self, provider):
        """Non-numeric string brightness values must be discarded safely."""
        bad_brightness_csv = (
            "latitude,longitude,bright_ti4,acq_date,acq_time\n"
            "28.5,77.2,not_a_number,2024-03-01,0600\n"
            "28.6,77.3,,2024-03-01,0600\n"
            "28.7,77.4,N/A,2024-03-01,0600\n"
            "28.8,77.5,null,2024-03-01,0600\n"
        )
        assert await provider.process_data(bad_brightness_csv) == []

    @pytest.mark.asyncio
    async def test_nan_and_inf_brightness(self, provider):
        """NaN, inf, and -inf in brightness must be caught and discarded."""
        nan_inf_csv = (
            "latitude,longitude,bright_ti4,acq_date,acq_time\n"
            "28.5,77.2,nan,2024-03-01,0600\n"
            "28.6,77.3,inf,2024-03-01,0600\n"
            "28.7,77.4,-inf,2024-03-01,0600\n"
            "28.8,77.5,NaN,2024-03-01,0600\n"
            "28.9,77.6,Infinity,2024-03-01,0600\n"
        )
        assert await provider.process_data(nan_inf_csv) == []

    @pytest.mark.asyncio
    async def test_nan_and_inf_coordinates(self, provider):
        """NaN or inf coordinates must be discarded."""
        bad_coords_csv = (
            "latitude,longitude,bright_ti4,acq_date,acq_time\n"
            "nan,77.2,340.0,2024-03-01,0600\n"
            "28.5,nan,340.0,2024-03-01,0600\n"
            "inf,77.2,340.0,2024-03-01,0600\n"
            "28.5,-inf,340.0,2024-03-01,0600\n"
        )
        assert await provider.process_data(bad_coords_csv) == []

    @pytest.mark.asyncio
    async def test_corrupted_jagged_rows(self, provider):
        """Rows with mismatched column counts must not crash the parser."""
        jagged_csv = (
            "latitude,longitude,bright_ti4,acq_date,acq_time\n"
            "28.5,77.2\n"  # too few
            "28.6,77.3,340.0,2024-03-01,0600,extra,unexpected,columns\n"  # too many
            "28.7,77.4,350.0,2024-03-01,0600\n"  # valid row
        )
        processed = await provider.process_data(jagged_csv)
        assert len(processed) >= 1
        assert any(r["latitude"] == 28.7 for r in processed)

    @pytest.mark.asyncio
    async def test_non_dict_non_string_raw_data(self, provider):
        """Invalid types passed to process_data must return [] cleanly."""
        assert await provider.process_data(12345) == []
        assert await provider.process_data([1, 2, ""]) == []
        assert await provider.process_data([{"foo": "bar"}]) == []


# =============================================================================
# 2. Physically Impossible Values & DQS
# =============================================================================

class TestAdversarialPhysicalBoundaries:
    @pytest.mark.asyncio
    async def test_brightness_boundary_conditions(self, provider):
        """
        Physical boundary for active fire brightness temperature is [200.0, 600.0] Kelvin.
        199.9 K -> discarded
        200.0 K -> valid
        600.0 K -> valid
        600.1 K -> discarded
        """
        boundary_csv = (
            "latitude,longitude,bright_ti4,acq_date,acq_time\n"
            "28.1,77.1,199.9,2024-03-01,0600\n"   # Below 200
            "28.2,77.2,200.0,2024-03-01,0600\n"   # Exact lower boundary
            "28.3,77.3,350.0,2024-03-01,0600\n"   # Normal
            "28.4,77.4,600.0,2024-03-01,0600\n"   # Exact upper boundary
            "28.5,77.5,600.1,2024-03-01,0600\n"   # Above 600
            "28.6,77.6,-50.0,2024-03-01,0600\n"   # Negative temperature
            "28.7,77.7,1500.0,2024-03-01,0600\n"  # Extreme high
        )
        processed = await provider.process_data(boundary_csv)
        assert len(processed) == 3
        brights = [r["brightness"] for r in processed]
        assert 200.0 in brights
        assert 350.0 in brights
        assert 600.0 in brights
        assert 199.9 not in brights
        assert 600.1 not in brights

    @pytest.mark.asyncio
    async def test_modis_brightness_boundary(self, provider):
        """MODIS 'brightness' column must be validated against [200, 600] K."""
        modis_csv = (
            "latitude,longitude,brightness,acq_date,acq_time,satellite\n"
            "28.1,77.1,150.0,2024-03-01,0600,Terra\n"
            "28.2,77.2,320.0,2024-03-01,0600,Terra\n"
            "28.3,77.3,750.0,2024-03-01,0600,Terra\n"
        )
        processed = await provider.process_data(modis_csv)
        assert len(processed) == 1
        assert processed[0]["brightness"] == 320.0

    @pytest.mark.asyncio
    async def test_dqs_decay_and_freshness_boundaries(self, provider):
        """
        Verify DQS freshness model:
        < 1 hr: Q_fresh = 1.0 -> DQS = 0.765
        1 hr <= dt <= 24 hr: exponential decay exp(-0.1 * dt)
        > 24 hr: Q_fresh = 0.0 -> DQS = 0.0
        future skew > 5 mins -> DQS = 0.0
        """
        now = datetime(2024, 3, 1, 12, 0, 0, tzinfo=timezone.utc)

        # 1. Fresh (< 1 hr, dt = 30m)
        fresh_rec = [{"latitude": 28.0, "longitude": 77.0, "bright_ti4": 330.0, "acq_date": "2024-03-01", "acq_time": "1130"}]
        res_fresh = await provider.process_data(fresh_rec, ref_time=now)
        assert math.isclose(res_fresh[0]["dqs"], 0.765, rel_tol=1e-3)

        # 2. Intermediate (dt = 5 hr) -> exp(-0.1 * 5) = exp(-0.5) = 0.60653
        # DQS = 0.60653 * 0.9 * 0.85 = 0.4640
        mid_rec = [{"latitude": 28.0, "longitude": 77.0, "bright_ti4": 330.0, "acq_date": "2024-03-01", "acq_time": "0700"}]
        res_mid = await provider.process_data(mid_rec, ref_time=now)
        expected_dqs = math.exp(-0.5) * 0.9 * 0.85
        assert math.isclose(res_mid[0]["dqs"], expected_dqs, rel_tol=1e-3)

        # 3. Stale (> 24 hr, dt = 25 hr) -> DQS = 0.0
        stale_rec = [{"latitude": 28.0, "longitude": 77.0, "bright_ti4": 330.0, "acq_date": "2024-02-29", "acq_time": "1100"}]
        res_stale = await provider.process_data(stale_rec, ref_time=now)
        assert res_stale[0]["dqs"] == 0.0

        # 4. Far future (clock skew > 5 min, dt = -1 hr) -> DQS = 0.0
        future_rec = [{"latitude": 28.0, "longitude": 77.0, "bright_ti4": 330.0, "acq_date": "2024-03-01", "acq_time": "1300"}]
        res_future = await provider.process_data(future_rec, ref_time=now)
        assert res_future[0]["dqs"] == 0.0


# =============================================================================
# 3. Coordinate Formatting & Geodesic Boundary Enforcement
# =============================================================================

class TestAdversarialCoordinates:
    def test_format_area_various_representations(self, provider):
        """Test formatting robustness across tuples, dicts, lists, and strings."""
        # Standard W, S, E, N
        assert provider._format_area((68.0, 6.0, 97.5, 37.5)) == "68.0,6.0,97.5,37.5"
        assert provider._format_area([68.0, 6.0, 97.5, 37.5]) == "68.0,6.0,97.5,37.5"

        # Legacy Indian coordinates (min_lat, min_lon, max_lat, max_lon)
        # a=6.0, b=68.0, c=37.5, d=97.5 -> detected and inverted to W, S, E, N
        assert provider._format_area((6.0, 68.0, 37.5, 97.5)) == "68.0,6.0,97.5,37.5"

        # Dict variations
        d_cardinal = {"west": 70.0, "south": 10.0, "east": 90.0, "north": 30.0}
        assert provider._format_area(d_cardinal) == "70.0,10.0,90.0,30.0"

        d_minmax = {"min_lon": 70.0, "min_lat": 10.0, "max_lon": 90.0, "max_lat": 30.0}
        assert provider._format_area(d_minmax) == "70.0,10.0,90.0,30.0"

        # None or invalid structure falls back to default
        assert provider._format_area(None) == "68.0,6.0,97.5,37.5"
        assert provider._format_area([]) == "68.0,6.0,97.5,37.5"
        assert provider._format_area("72,18,74,20") == "72,18,74,20"

    @pytest.mark.asyncio
    async def test_geodesic_coordinate_bounds_enforcement(self, provider):
        """Coordinates outside latitude [-90, 90] or longitude [-180, 180] must be discarded."""
        invalid_coords_csv = (
            "latitude,longitude,bright_ti4,acq_date,acq_time\n"
            "-90.1,77.0,330.0,2024-03-01,0600\n"   # Lat below -90
            "90.1,77.0,330.0,2024-03-01,0600\n"    # Lat above 90
            "28.0,-180.1,330.0,2024-03-01,0600\n"  # Lon below -180
            "28.0,180.1,330.0,2024-03-01,0600\n"   # Lon above 180
            "-90.0,77.0,330.0,2024-03-01,0600\n"   # Valid boundary -90
            "90.0,77.0,330.0,2024-03-01,0600\n"    # Valid boundary +90
            "28.0,-180.0,330.0,2024-03-01,0600\n"  # Valid boundary -180
            "28.0,180.0,330.0,2024-03-01,0600\n"   # Valid boundary +180
        )
        processed = await provider.process_data(invalid_coords_csv)
        assert len(processed) == 4
        lats = [r["latitude"] for r in processed]
        lons = [r["longitude"] for r in processed]
        assert -90.0 in lats
        assert 90.0 in lats
        assert -180.0 in lons
        assert 180.0 in lons


# =============================================================================
# 4. Day Range Edge Cases & Chunking Accumulation
# =============================================================================

class TestAdversarialDayRangeAndChunking:
    @pytest.mark.asyncio
    async def test_days_zero_and_negative_clamped_to_one(self, provider):
        """Days <= 0 must be clamped to 1 per API requirement."""
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.is_closed = False
        mock_client.get = mock.AsyncMock(return_value=httpx.Response(200, text=""))
        provider._client = mock_client

        await provider.fetch_data(days=0)
        url_0 = mock_client.get.call_args[0][0]
        assert url_0.endswith("/1")

        mock_client.get.reset_mock()
        await provider.fetch_data(days=-10)
        url_neg = mock_client.get.call_args[0][0]
        assert url_neg.endswith("/1")

    @pytest.mark.asyncio
    async def test_exact_10_days_single_chunk(self, provider):
        """Days == 10 must create exactly 1 request."""
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.is_closed = False
        mock_client.get = mock.AsyncMock(return_value=httpx.Response(200, text=""))
        provider._client = mock_client

        await provider.fetch_data(days=10)
        assert mock_client.get.call_count == 1
        assert mock_client.get.call_args[0][0].endswith("/10")

    @pytest.mark.asyncio
    async def test_multi_chunk_accumulation(self, provider):
        """
        A 22-day query produces 3 chunks (10, 10, 2).
        Verify that observations from all 3 chunks are accumulated into one list.
        """
        csv_chunk_1 = "latitude,longitude,bright_ti4\n28.1,77.1,330.0\n"
        csv_chunk_2 = "latitude,longitude,bright_ti4\n28.2,77.2,340.0\n28.3,77.3,345.0\n"
        csv_chunk_3 = "latitude,longitude,bright_ti4\n28.4,77.4,350.0\n"

        responses = [
            httpx.Response(200, text=csv_chunk_1),
            httpx.Response(200, text=csv_chunk_2),
            httpx.Response(200, text=csv_chunk_3),
        ]

        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.is_closed = False
        mock_client.get = mock.AsyncMock(side_effect=responses)
        provider._client = mock_client

        results = await provider.fetch_data(days=22, date="2024-01-01")
        assert mock_client.get.call_count == 3
        assert len(results) == 4
        lats = [float(r["latitude"]) for r in results]
        assert lats == [28.1, 28.2, 28.3, 28.4]

    @pytest.mark.asyncio
    async def test_mid_chunk_failure_returns_empty_cleanly(self, provider):
        """
        If chunk 1 succeeds but chunk 2 encounters an HTTP 500 error,
        fetch_data must return [] without emitting partial corrupted data.
        """
        csv_chunk_1 = "latitude,longitude,bright_ti4\n28.1,77.1,330.0\n"
        responses = [
            httpx.Response(200, text=csv_chunk_1),
            httpx.Response(500, text="Internal Server Error"),
        ]

        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.is_closed = False
        mock_client.get = mock.AsyncMock(side_effect=responses)
        provider._client = mock_client

        results = await provider.fetch_data(days=20, date="2024-01-01")
        assert results == []


# =============================================================================
# 5. Rate Limiter Concurrent Stress Test
# =============================================================================

class TestAdversarialRateLimiter:
    @pytest.mark.asyncio
    async def test_concurrent_burst_stress(self):
        """
        Stress-test RateLimiter under 40 concurrent acquire requests.
        Verify no deadlock, no exceptions, and strict serialized token replenishment.
        """
        limiter = RateLimiter(max_calls=10, period_seconds=0.1)

        completed = 0

        async def worker():
            nonlocal completed
            await limiter.acquire()
            completed += 1

        # Run 40 concurrent tasks
        t0 = time.monotonic()
        await asyncio.gather(*[worker() for _ in range(40)])
        elapsed = time.monotonic() - t0

        assert completed == 40
        # Since max_calls=10 per 0.1s, 40 tasks require at least ~0.20s
        assert elapsed >= 0.18


# =============================================================================
# 6. Idempotent Database Deduplication & Repetitive Batches
# =============================================================================

class TestAdversarialDatabaseIdempotence:
    @pytest.mark.asyncio
    async def test_repetitive_batch_persistence_zero_duplicates(self, provider, async_session):
        """
        Persist the exact same 10 records 5 times in a row.
        Verify that exactly 10 rows exist in the DB (0 duplicates created).
        """
        raw_data = [
            {
                "latitude": round(28.0 + i * 0.1, 5),
                "longitude": round(77.0 + i * 0.1, 5),
                "brightness": 320.0 + i,
                "acq_date": "2024-03-01",
                "acq_time": "0600",
                "satellite": "VIIRS",
            }
            for i in range(10)
        ]
        processed = await provider.process_data(raw_data)
        assert len(processed) == 10

        # Persist 5 times consecutively
        for _ in range(5):
            await provider.save_data(processed, async_session)

        count = await async_session.scalar(select(func.count(NASAFirmsFire.id)))
        assert count == 10

    @pytest.mark.asyncio
    async def test_in_batch_deduplication_of_500_records_with_50_keys(
        self, provider, async_session
    ):
        """
        Feed 500 records consisting of 50 unique keys (10 duplicates each).
        Verify database stores exactly 50 rows.
        """
        batch = []
        for dup in range(10):
            for key in range(50):
                batch.append({
                    "latitude": 28.0 + key * 0.01,
                    "longitude": 77.0 + key * 0.01,
                    "brightness": 330.0 + dup,  # Later duplicate has updated brightness
                    "scan": 1.0,
                    "track": 1.0,
                    "acq_date": "2024-03-01",
                    "acq_time": "0600",
                    "satellite": "VIIRS",
                    "confidence": "high",
                    "frp": 10.0 + dup,
                    "timestamp": "2024-03-01T06:00:00Z",
                    "dqs": 0.765,
                })

        await provider.save_data(batch, async_session)
        count = await async_session.scalar(select(func.count(NASAFirmsFire.id)))
        assert count == 50

        # Verify the saved brightness reflects the latest updated item (dup=9 -> 339.0)
        sample = await async_session.scalar(
            select(NASAFirmsFire).where(NASAFirmsFire.latitude == 28.0)
        )
        assert sample is not None
        assert sample.brightness == 339.0
        assert sample.frp == 19.0


# =============================================================================
# 7. Zero-Fake-Data Invariant Under All Failure Modes
# =============================================================================

class TestAdversarialZeroFakeData:
    @pytest.mark.asyncio
    async def test_http_500_and_503_returns_empty_without_synthetic_data(self, provider):
        """HTTP 500 and 503 must cleanly return [] without fallback data."""
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.is_closed = False
        provider._client = mock_client

        for status_code in (500, 502, 503, 504):
            mock_client.get = mock.AsyncMock(return_value=httpx.Response(status_code, text="Server Error"))
            res = await provider.fetch_data()
            assert res == [], f"Status {status_code} did not return []"

    @pytest.mark.asyncio
    async def test_connection_and_read_timeouts_return_empty(self, provider):
        """Network timeouts must return [] cleanly."""
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.is_closed = False
        provider._client = mock_client

        for exc in (httpx.ConnectTimeout("Timeout"), httpx.ReadTimeout("Read Timeout"), httpx.ConnectError("Err")):
            mock_client.get = mock.AsyncMock(side_effect=exc)
            res = await provider.fetch_data()
            assert res == [], f"Exception {exc} did not return []"

    @pytest.mark.asyncio
    async def test_downstream_consumer_layers_zero_synthetic_data_under_failure(self):
        """
        When NASA FIRMS returns no data (e.g. API key invalid or offline),
        consumer layers crop_burning and aqi_validation must return empty collections,
        NEVER generating fake coordinates, jitter, or synthetic hotspots.
        """
        # Test crop_burning
        with mock.patch("layers.crop_burning.nasa_firms_loader.fetch_active_fires", new=mock.AsyncMock(return_value=[])):
            result = await get_crop_burning_fires(days=7)
            assert result["type"] == "FeatureCollection"
            assert result["features"] == []
            assert result["count"] == 0
            assert result["source"] == "None"

        # Test fire_density
        with mock.patch("layers.crop_burning.nasa_firms_loader.get_fire_density_grid", new=mock.AsyncMock(return_value={"lats": [], "lons": [], "counts": []})):
            result = await get_fire_density()
            assert result["type"] == "FeatureCollection"
            assert result["features"] == []
            assert result["count"] == 0
            assert result["source"] == "None"

        # Test aqi_validation
        with mock.patch("layers.aqi_validation.nasa_firms_loader.fetch_active_fires", new=mock.AsyncMock(return_value=[])):
            with mock.patch("layers.aqi_validation.openaq_loader.fetch_latest_measurements", new=mock.AsyncMock(return_value=[])):
                result = await get_aqi_validation()
                assert result["type"] == "FeatureCollection"
                assert result["features"] == []
                assert result["count"] == 0
                assert result["source"] == "None"
