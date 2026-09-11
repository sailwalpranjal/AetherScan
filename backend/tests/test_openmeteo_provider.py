"""
Unit & Integration Test Suite for OpenMeteoAirQualityProvider.
Verifies real-time Copernicus ECMWF/CAMS data ingestion, UTC timestamp normalization,
DQS quality calculations, idempotent database persistence, and Zero-Fake-Data invariants.
"""

import asyncio
from datetime import datetime, timezone
import math
from pathlib import Path
import sys
from typing import Any, Dict, List
import unittest.mock as mock

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
import pytest_asyncio

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from db.database import Base
from models.domain import OpenAQStation, OpenAQMeasurement
from data_sources.base import BaseProvider
from data_sources.openmeteo_provider import OpenMeteoAirQualityProvider, openmeteo_provider, INDIAN_LOCATIONS


@pytest_asyncio.fixture
async def async_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


class TestOpenMeteoProviderContract:
    def test_provider_hierarchy_and_properties(self):
        """Verify OpenMeteoAirQualityProvider inherits from BaseProvider."""
        provider = OpenMeteoAirQualityProvider()
        assert isinstance(provider, BaseProvider)
        assert provider.provider_name == "openmeteo"
        assert len(INDIAN_LOCATIONS) >= 20

    @pytest.mark.asyncio
    async def test_fetch_data_network_handling(self):
        """Verify fetch_data handles timeouts and HTTP failures gracefully without crashing."""
        mock_client = mock.AsyncMock(spec=httpx.AsyncClient)
        mock_client.is_closed = False
        provider = OpenMeteoAirQualityProvider(client=mock_client)

        # 1. Timeout returns []
        mock_client.get = mock.AsyncMock(side_effect=httpx.ConnectTimeout("Timeout"))
        assert await provider.fetch_data() == []

        # 2. HTTP 500 returns []
        mock_response = mock.MagicMock(status_code=500)
        mock_client.get = mock.AsyncMock(return_value=mock_response)
        assert await provider.fetch_data() == []

        # 3. HTTP 200 returns parsed data
        mock_response = mock.MagicMock(
            status_code=200,
            json=lambda: [{"latitude": 28.7, "longitude": 77.1, "current": {"pm2_5": 45.2}}]
        )
        mock_client.get = mock.AsyncMock(return_value=mock_response)
        res = await provider.fetch_data(latitudes=[28.7], longitudes=[77.1])
        assert len(res) == 1
        assert res[0]["latitude"] == 28.7


class TestOpenMeteoProcessingAndDQS:
    @pytest.mark.asyncio
    async def test_empty_and_corrupt_raw_data(self):
        """Verify process_data returns empty structures on invalid inputs."""
        provider = OpenMeteoAirQualityProvider()
        assert await provider.process_data(None) == {"stations": [], "measurements": []}
        assert await provider.process_data([]) == {"stations": [], "measurements": []}
        assert await provider.process_data("invalid_string") == {"stations": [], "measurements": []}
        assert await provider.process_data([{"latitude": None, "longitude": None}]) == {"stations": [], "measurements": []}

    @pytest.mark.asyncio
    async def test_process_data_dqs_freshness_and_timezone(self):
        """
        Critical test: Verify timestamps produce positive, valid DQS scores (> 0.0).
        Guarantees that UTC timestamps are not penalized by clock skew.
        """
        provider = OpenMeteoAirQualityProvider()

        # Current UTC timestamp representation from Open-Meteo
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M")

        sample_raw = [
            {
                "latitude": 28.7041,
                "longitude": 77.1025,
                "current": {
                    "time": now_utc,
                    "interval": 3600,
                    "pm10": 98.4,
                    "pm2_5": 54.1,
                    "carbon_monoxide": 850.0,
                    "nitrogen_dioxide": 42.1,
                    "sulphur_dioxide": 18.3,
                    "ozone": 25.0,
                    "aerosol_optical_depth": 0.65
                }
            }
        ]

        result = await provider.process_data(sample_raw)
        stations = result["stations"]
        measurements = result["measurements"]

        assert len(stations) == 1
        assert stations[0]["city"] == "Delhi"
        assert stations[0]["country"] == "IN"
        assert "Copernicus" in stations[0]["name"]

        assert len(measurements) > 0
        for m in measurements:
            assert m["value"] > 0.0
            assert m["city"] == "Delhi"
            # Crucial verification: DQS must be calculated and > 0.0 for fresh data
            assert m["dqs"] is not None
            assert m["dqs"] > 0.0, f"DQS for {m['parameter']} was 0.0, freshness calculation failed"

    @pytest.mark.asyncio
    async def test_process_data_filters_physically_impossible_values(self):
        """Verify invalid values (NaN, inf, negative) are rejected by validate_value."""
        provider = OpenMeteoAirQualityProvider()
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M")

        sample_raw = [
            {
                "latitude": 19.0760,
                "longitude": 72.8777,
                "current": {
                    "time": now_utc,
                    "pm2_5": -10.0,           # Negative concentration -> invalid
                    "pm10": float("nan"),     # NaN -> invalid
                    "nitrogen_dioxide": 25.0, # Valid
                }
            }
        ]

        result = await provider.process_data(sample_raw)
        measurements = result["measurements"]
        params = [m["parameter"] for m in measurements]

        assert "no2" in params
        assert "pm25" not in params
        assert "pm10" not in params


class TestOpenMeteoDatabasePersistence:
    @pytest.mark.asyncio
    async def test_save_data_and_idempotency(self, async_session):
        """Verify processed observations are safely persisted and updated without duplicates."""
        provider = OpenMeteoAirQualityProvider()
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M")

        sample_raw = [
            {
                "latitude": 12.9716,
                "longitude": 77.5946,
                "current": {
                    "time": now_utc,
                    "pm2_5": 32.5,
                    "pm10": 65.0,
                }
            }
        ]

        processed = await provider.process_data(sample_raw)
        await provider.save_data(processed, async_session)

        # Verify station in DB
        stmt_st = select(OpenAQStation)
        res_st = await async_session.execute(stmt_st)
        stations_in_db = res_st.scalars().all()
        assert len(stations_in_db) == 1
        assert stations_in_db[0].city == "Bangalore"

        # Verify measurements in DB
        stmt_m = select(OpenAQMeasurement)
        res_m = await async_session.execute(stmt_m)
        measurements_in_db = res_m.scalars().all()
        assert len(measurements_in_db) == 2

        # Second save (idempotency check)
        await provider.save_data(processed, async_session)
        res_st2 = await async_session.execute(stmt_st)
        assert len(res_st2.scalars().all()) == 1

        res_m2 = await async_session.execute(stmt_m)
        assert len(res_m2.scalars().all()) == 2
