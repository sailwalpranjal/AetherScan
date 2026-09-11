"""
Comprehensive Integration Tests for AetherScan Milestone 4.

Verifies end-to-end integration across:
1. Async SQLite Table Creation & Schema Verification (including 'dqs' column).
2. OpenAQProvider.ingest(session) with genuine DQS calculation & persistence.
3. NASAFIRMSProvider.ingest(session) with genuine DQS calculation & persistence.
4. Idempotent Ingestion: 0 duplicate rows on repeated ingestion runs.
5. Data Quality Engine Fusion Confidence Score (FCS) multi-sensor integration.
6. DatabaseManager (db_manager) backwards compatibility shim.
7. Zero-Fake-Data pipeline invariant audit.
"""

import asyncio
from datetime import datetime, timedelta, timezone
import math
from typing import Any, Dict, List, Optional
from unittest.mock import patch, AsyncMock

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from models.domain import (
    Base,
    OpenAQStation,
    OpenAQMeasurement,
    NASAFirmsFire,
    Industry,
    PopulationData,
    CacheMetadata,
)
from db.database import init_db, db_manager, DatabaseManager
from data_sources.openaq_loader import OpenAQProvider, RateLimiter as OpenAQRateLimiter
from data_sources.nasa_firms_loader import NASAFIRMSProvider, RateLimiter as FIRMSRateLimiter
from core.quality import calculate_dqs, calculate_fcs, get_dqs_breakdown, validate_value
from services.facility_intelligence import FacilityIntelligenceService


# =============================================================================
# Fixtures
# =============================================================================

@pytest_asyncio.fixture
async def async_test_session():
    """Create a fresh in-memory SQLite database and yield an AsyncSession."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    await init_db(engine_override=engine)

    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.fixture
def openaq_provider():
    """Fast-rate OpenAQ provider instance with mock key."""
    limiter = OpenAQRateLimiter(max_calls=1000, period_seconds=1.0)
    return OpenAQProvider(api_key="test_openaq_api_key_valid", rate_limiter=limiter)


@pytest.fixture
def firms_provider():
    """Fast-rate NASA FIRMS provider instance with mock map key."""
    limiter = FIRMSRateLimiter(max_calls=1000, period_seconds=1.0)
    return NASAFIRMSProvider(map_key="test_firms_map_key_valid", rate_limiter=limiter)


# Sample OpenAQ v3 API response data (Anand Vihar, Delhi)
MOCK_OPENAQ_V3_LOCATIONS = {
    "results": [
        {
            "id": 8118,
            "name": "Anand Vihar, Delhi - DPCC",
            "locality": "Delhi",
            "country": {"code": "IN", "name": "India"},
            "coordinates": {"latitude": 28.6508, "longitude": 77.3152},
            "datetimeLast": {"utc": datetime.now(timezone.utc).isoformat()},
            "sensors": [
                {"id": 101, "parameter": {"name": "pm25", "units": "µg/m³"}},
                {"id": 102, "parameter": {"name": "pm10", "units": "µg/m³"}},
                {"id": 103, "parameter": {"name": "no2", "units": "µg/m³"}},
            ],
        }
    ]
}

def get_mock_openaq_measurements(now_utc: datetime) -> Dict[str, Any]:
    return {
        "results": [
            {
                "locationsId": 8118,
                "parameter": {"name": "pm25", "units": "µg/m³"},
                "value": 72.5,
                "datetime": {"utc": (now_utc - timedelta(minutes=15)).isoformat()},
                "coordinates": {"latitude": 28.6508, "longitude": 77.3152},
                "location": "Anand Vihar, Delhi - DPCC",
            },
            {
                "locationsId": 8118,
                "parameter": {"name": "pm10", "units": "µg/m³"},
                "value": 145.0,
                "datetime": {"utc": (now_utc - timedelta(minutes=15)).isoformat()},
                "coordinates": {"latitude": 28.6508, "longitude": 77.3152},
                "location": "Anand Vihar, Delhi - DPCC",
            },
            {
                "locationsId": 8118,
                "parameter": {"name": "no2", "units": "µg/m³"},
                "value": 42.1,
                "datetime": {"utc": (now_utc - timedelta(minutes=15)).isoformat()},
                "coordinates": {"latitude": 28.6508, "longitude": 77.3152},
                "location": "Anand Vihar, Delhi - DPCC",
            },
        ]
    }


def get_mock_firms_csv(today_str: Optional[str] = None) -> str:
    """Realistic NASA FIRMS Area API CSV output with fresh, non-future timestamp."""
    recent_dt = datetime.now(timezone.utc) - timedelta(minutes=15)
    if today_str:
        acq_date = today_str
        if today_str != recent_dt.strftime("%Y-%m-%d"):
            acq_time = datetime.now(timezone.utc).strftime("%H%M")
        else:
            acq_time = recent_dt.strftime("%H%M")
    else:
        acq_date = recent_dt.strftime("%Y-%m-%d")
        acq_time = recent_dt.strftime("%H%M")
    return (
        "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight\n"
        f"29.12345,76.54321,342.5,0.4,0.4,{acq_date},{acq_time},VIIRS_SNPP,nominal,2.0NRT,295.2,14.8,D\n"
        f"29.54321,76.98765,365.1,0.5,0.4,{acq_date},{acq_time},VIIRS_SNPP,high,2.0NRT,301.0,22.4,D\n"
        f"30.11111,75.22222,328.0,0.4,0.4,{acq_date},{acq_time},MODIS_Terra,low,6.1NRT,290.5,8.2,D\n"
    )



# =============================================================================
# 1. Database Initialization & Schema Verification Tests
# =============================================================================

class TestDatabaseInitializationAndSchema:
    @pytest.mark.asyncio
    async def test_init_db_creates_all_six_tables(self):
        """Verify init_db() creates all registered tables on Base.metadata."""
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        await init_db(engine_override=engine)

        expected_tables = {
            "openaq_stations",
            "openaq_measurements",
            "nasa_firms_fires",
            "industries",
            "population_data",
            "cache_metadata",
        }
        actual_registered = set(Base.metadata.tables.keys())
        assert expected_tables.issubset(actual_registered), (
            f"Missing tables from Base.metadata: {expected_tables - actual_registered}"
        )

        async with engine.connect() as conn:
            def _get_sqlite_tables(sync_conn):
                res = sync_conn.execute(
                    text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
                )
                return {row[0] for row in res.fetchall()}

            created_tables = await conn.run_sync(_get_sqlite_tables)

        assert expected_tables.issubset(created_tables), (
            f"Missing physical SQLite tables: {expected_tables - created_tables}"
        )
        await engine.dispose()

    @pytest.mark.asyncio
    async def test_schema_has_dqs_column_in_measurement_and_fire_tables(self):
        """Verify 'dqs' column exists as REAL/FLOAT in openaq_measurements and nasa_firms_fires."""
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        await init_db(engine_override=engine)

        async with engine.connect() as conn:
            def _get_columns(sync_conn, table_name: str) -> Dict[str, str]:
                res = sync_conn.execute(text(f"PRAGMA table_info({table_name});"))
                return {row[1]: row[2] for row in res.fetchall()}

            openaq_cols = await conn.run_sync(_get_columns, "openaq_measurements")
            firms_cols = await conn.run_sync(_get_columns, "nasa_firms_fires")

        assert "dqs" in openaq_cols, "dqs column missing from openaq_measurements"
        assert "dqs" in firms_cols, "dqs column missing from nasa_firms_fires"
        assert openaq_cols["dqs"].upper() in ("FLOAT", "REAL")
        assert firms_cols["dqs"].upper() in ("FLOAT", "REAL")

        await engine.dispose()

    def test_database_and_domain_module_reexport(self):
        """Verify models.database and models.domain re-export all domain models cleanly."""
        from models.database import (
            Base as DBBase,
            engine as DBEngine,
            AsyncSessionLocal as DBSession,
            init_db as DBInit,
            db_manager as DBMgr,
            OpenAQStation as DBStation,
            OpenAQMeasurement as DBMeasurement,
            NASAFirmsFire as DBFire,
            Industry as DBIndustry,
            PopulationData as DBPop,
            CacheMetadata as DBCache,
        )
        assert DBBase is not None
        assert DBEngine is not None
        assert DBSession is not None
        assert callable(DBInit)
        assert isinstance(DBMgr, DatabaseManager)
        assert hasattr(DBMeasurement, "dqs")
        assert hasattr(DBFire, "dqs")


# =============================================================================
# 2. OpenAQ Pipeline Ingestion & DQS Persistence Tests
# =============================================================================

class TestOpenAQPipelineIntegration:
    @pytest.mark.asyncio
    async def test_openaq_ingest_calculates_and_persists_dqs(self, openaq_provider, async_test_session):
        """
        Verify OpenAQProvider.ingest(session) calculates real DQS and persists
        the dqs value into the openaq_measurements table.
        """
        now_utc = datetime.now(timezone.utc)
        mock_locs = MOCK_OPENAQ_V3_LOCATIONS
        mock_meas = get_mock_openaq_measurements(now_utc)

        # Mock the external HTTP fetch calls
        async def mock_fetch(**kwargs):
            return {
                "locations": mock_locs["results"],
                "measurements": mock_meas["results"],
            }

        with patch.object(openaq_provider, "fetch_data", side_effect=mock_fetch):
            result = await openaq_provider.ingest(async_test_session)

        assert result.get("status") == "success"

        # Verify station in DB
        st_res = await async_test_session.execute(
            select(OpenAQStation).where(OpenAQStation.station_id == "8118")
        )
        station = st_res.scalar_one_or_none()
        assert station is not None
        assert station.name == "Anand Vihar, Delhi - DPCC"
        assert station.latitude == pytest.approx(28.6508, abs=1e-4)

        # Verify measurements in DB
        meas_res = await async_test_session.execute(
            select(OpenAQMeasurement).where(OpenAQMeasurement.station_id == "8118")
        )
        measurements = meas_res.scalars().all()
        assert len(measurements) == 3

        for m in measurements:
            assert m.dqs is not None, f"dqs is None for measurement {m.parameter}"
            assert 0.0 < m.dqs <= 1.0, f"dqs out of valid range: {m.dqs}"

            # Verify DQS formula consistency:
            # Recent (< 1h old), reference sensor (1.0), coincident (1.0), valid (1.0) -> DQS == 1.0
            expected_dqs = calculate_dqs(
                value=m.value,
                parameter=m.parameter,
                timestamp=m.timestamp,
                distance_km=0.0,
                sensor_type="reference",
                ref_time=now_utc,
            )
            assert m.dqs == pytest.approx(expected_dqs, abs=1e-5)

    @pytest.mark.asyncio
    async def test_openaq_ingest_discards_physically_invalid_observations(self, openaq_provider, async_test_session):
        """
        Verify physically impossible observations (e.g. negative PM2.5, PM2.5 > 1000)
        are discarded and never saved to the database.
        """
        now_utc = datetime.now(timezone.utc)
        raw_measurements = [
            # Valid measurement
            {
                "locationsId": 9999,
                "parameter": {"name": "pm25", "units": "µg/m³"},
                "value": 55.4,
                "datetime": {"utc": now_utc.isoformat()},
                "location": "Valid Station",
            },
            # Negative concentration -> invalid (Q_valid = 0.0)
            {
                "locationsId": 9999,
                "parameter": {"name": "pm25", "units": "µg/m³"},
                "value": -12.0,
                "datetime": {"utc": now_utc.isoformat()},
                "location": "Valid Station",
            },
            # Beyond atmospheric upper bound (1000 ug/m3) -> invalid (Q_valid = 0.0)
            {
                "locationsId": 9999,
                "parameter": {"name": "pm25", "units": "µg/m³"},
                "value": 1500.0,
                "datetime": {"utc": now_utc.isoformat()},
                "location": "Valid Station",
            },
        ]

        async def mock_fetch(**kwargs):
            return {"locations": [], "measurements": raw_measurements}

        with patch.object(openaq_provider, "fetch_data", side_effect=mock_fetch):
            await openaq_provider.ingest(async_test_session)

        meas_res = await async_test_session.execute(
            select(OpenAQMeasurement).where(OpenAQMeasurement.station_id == "9999")
        )
        saved = meas_res.scalars().all()
        assert len(saved) == 1, "Expected only the physically valid measurement to be saved"
        assert saved[0].value == 55.4
        assert saved[0].dqs is not None and saved[0].dqs > 0.0

    @pytest.mark.asyncio
    async def test_openaq_repeated_ingest_is_strictly_idempotent(self, openaq_provider, async_test_session):
        """
        Verify successive ingest calls with identical data produce 0 duplicate records,
        and value changes update in-place.
        """
        now_utc = datetime.now(timezone.utc)
        mock_data = {
            "locations": MOCK_OPENAQ_V3_LOCATIONS["results"],
            "measurements": get_mock_openaq_measurements(now_utc)["results"],
        }

        with patch.object(openaq_provider, "fetch_data", AsyncMock(return_value=mock_data)):
            # First ingestion run
            res1 = await openaq_provider.ingest(async_test_session)
            assert res1.get("status") == "success"

        count1 = await async_test_session.scalar(select(func.count(OpenAQMeasurement.id)))
        assert count1 == 3

        with patch.object(openaq_provider, "fetch_data", AsyncMock(return_value=mock_data)):
            # Second ingestion run with identical data
            res2 = await openaq_provider.ingest(async_test_session)
            assert res2.get("status") == "success"

        count2 = await async_test_session.scalar(select(func.count(OpenAQMeasurement.id)))
        assert count2 == 3, "Duplicate records were inserted on repeated ingestion!"

        # Third run: same timestamp and parameter, but updated value
        updated_meas = get_mock_openaq_measurements(now_utc)["results"]
        updated_meas[0]["value"] = 89.2
        mock_updated = {"locations": mock_data["locations"], "measurements": updated_meas}

        with patch.object(openaq_provider, "fetch_data", AsyncMock(return_value=mock_updated)):
            res3 = await openaq_provider.ingest(async_test_session)
            assert res3.get("status") == "success"

        count3 = await async_test_session.scalar(select(func.count(OpenAQMeasurement.id)))
        assert count3 == 3, "Upsert should not increase row count"

        pm25_row = await async_test_session.scalar(
            select(OpenAQMeasurement).where(
                OpenAQMeasurement.station_id == "8118",
                OpenAQMeasurement.parameter == "pm25",
            )
        )
        assert pm25_row.value == 89.2, "Existing measurement value should be updated in-place"


# =============================================================================
# 3. NASA FIRMS Pipeline Ingestion & DQS Persistence Tests
# =============================================================================

class TestNASAFIRMSPipelineIntegration:
    @pytest.mark.asyncio
    async def test_firms_ingest_calculates_and_persists_dqs(self, firms_provider, async_test_session):
        """
        Verify NASAFIRMSProvider.ingest(session) calculates real satellite DQS
        and persists the dqs value into the nasa_firms_fires table.
        """
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        csv_data = get_mock_firms_csv(today_str)

        with patch.object(firms_provider, "fetch_data", AsyncMock(return_value=csv_data)):
            result = await firms_provider.ingest(async_test_session)

        assert result.get("status") == "success"

        res = await async_test_session.execute(select(NASAFirmsFire))
        fires = res.scalars().all()
        assert len(fires) == 3

        for fire in fires:
            assert fire.dqs is not None, f"dqs is None for fire detection at ({fire.latitude}, {fire.longitude})"
            assert 0.0 < fire.dqs <= 1.0, f"dqs out of valid range: {fire.dqs}"

            # Satellite sensor reliability = 0.85 (cloud-free), spatial representativeness = 0.90
            # For fresh observation (< 1h), Q_fresh = 1.0 -> DQS = 0.9 * 0.85 = 0.765
            assert fire.dqs <= 0.765 + 1e-5
            assert fire.confidence in ("nominal", "high", "low")

    @pytest.mark.asyncio
    async def test_firms_ingest_discards_physically_invalid_brightness(self, firms_provider, async_test_session):
        """
        Verify physically impossible brightness temperatures (< 200 K or > 600 K)
        are discarded and never saved to the database.
        """
        recent_dt = datetime.now(timezone.utc) - timedelta(minutes=15)
        today_str = recent_dt.strftime("%Y-%m-%d")
        time_str = recent_dt.strftime("%H%M")
        csv_data = (
            "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight\n"
            f"28.1,77.1,340.0,0.4,0.4,{today_str},{time_str},VIIRS_SNPP,nominal,2.0NRT,290.0,10.0,D\n"
            f"28.2,77.2,150.0,0.4,0.4,{today_str},{time_str},VIIRS_SNPP,nominal,2.0NRT,290.0,10.0,D\n"
            f"28.3,77.3,750.0,0.4,0.4,{today_str},{time_str},VIIRS_SNPP,nominal,2.0NRT,290.0,10.0,D\n"
        )

        with patch.object(firms_provider, "fetch_data", AsyncMock(return_value=csv_data)):
            await firms_provider.ingest(async_test_session)

        res = await async_test_session.execute(select(NASAFirmsFire))
        fires = res.scalars().all()
        assert len(fires) == 1, "Only the physically valid fire point should be saved"
        assert fires[0].brightness == 340.0
        assert fires[0].dqs is not None and fires[0].dqs > 0.0

    @pytest.mark.asyncio
    async def test_firms_repeated_ingest_is_strictly_idempotent(self, firms_provider, async_test_session):
        """
        Verify repeated ingestion with identical NASA FIRMS CSV data produces
        0 duplicate records, and in-place updates succeed.
        """
        csv_data = get_mock_firms_csv()

        with patch.object(firms_provider, "fetch_data", AsyncMock(return_value=csv_data)):
            res1 = await firms_provider.ingest(async_test_session)
            assert res1.get("status") == "success"

        count1 = await async_test_session.scalar(select(func.count(NASAFirmsFire.id)))
        assert count1 == 3

        with patch.object(firms_provider, "fetch_data", AsyncMock(return_value=csv_data)):
            res2 = await firms_provider.ingest(async_test_session)
            assert res2.get("status") == "success"

        count2 = await async_test_session.scalar(select(func.count(NASAFirmsFire.id)))
        assert count2 == 3, "Duplicate fire rows were inserted on repeated ingestion!"

        # Third run: same fire detection coordinate/time, updated brightness
        recent_dt = datetime.now(timezone.utc) - timedelta(minutes=15)
        today_str = recent_dt.strftime("%Y-%m-%d")
        time_str = recent_dt.strftime("%H%M")
        updated_csv = (
            "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight\n"
            f"29.12345,76.54321,385.0,0.4,0.4,{today_str},{time_str},VIIRS_SNPP,high,2.0NRT,295.2,35.0,D\n"
        )
        with patch.object(firms_provider, "fetch_data", AsyncMock(return_value=updated_csv)):
            await firms_provider.ingest(async_test_session)

        count3 = await async_test_session.scalar(select(func.count(NASAFirmsFire.id)))
        assert count3 == 3, "Upsert should not increase row count"

        fire_row = await async_test_session.scalar(
            select(NASAFirmsFire).where(
                NASAFirmsFire.latitude == round(29.12345, 5),
                NASAFirmsFire.longitude == round(76.54321, 5),
            )
        )
        assert fire_row.brightness == 385.0, "Existing fire record should update in-place"
        assert fire_row.confidence == "high"


# =============================================================================
# 4. Data Quality Engine Fusion Confidence Score (FCS) Integration Tests
# =============================================================================

class TestDataQualityEngineFCSIntegration:
    def test_multi_sensor_high_agreement_produces_high_fcs(self):
        """
        Verify multiple sensors agreeing closely produce a high FCS score.
        Formula: FCS = [sum(DQS_i * w_i) / sum(w_i)] * max(0.0, 1.0 - sigma / mu)
        """
        now = datetime.now(timezone.utc)
        # 3 co-located sensors measuring PM2.5 (reference grade)
        raw_readings = [52.0, 54.0, 53.0]
        dqs_list = [
            calculate_dqs(val, "pm25", now, distance_km=0.0, sensor_type="reference")
            for val in raw_readings
        ]
        # High DQS for all (1.0)
        assert all(d == 1.0 for d in dqs_list)

        fcs = calculate_fcs(dqs_values=dqs_list, values=raw_readings)
        # With mean=53.0 and std~1.0, sigma/mu is ~0.0189 -> FCS should be ~0.98
        assert fcs > 0.95
        assert fcs <= 1.0

    def test_multi_sensor_divergent_measurements_penalized(self):
        """
        Verify that when sensors diverge significantly (e.g., sensor malfunction),
        the variance penalty reduces FCS.
        """
        now = datetime.now(timezone.utc)
        # Normal reading vs an outlier anomalous reading
        raw_readings = [50.0, 52.0, 250.0]
        dqs_list = [
            calculate_dqs(val, "pm25", now, distance_km=0.0, sensor_type="reference")
            for val in raw_readings
        ]
        fcs = calculate_fcs(dqs_values=dqs_list, values=raw_readings)
        assert fcs < 0.50, f"Expected divergent readings to incur substantial penalty, got FCS={fcs}"

    def test_single_source_fcs_equals_dqs(self):
        """Verify for a single observation N=1, FCS equals DQS (sigma=0)."""
        now = datetime.now(timezone.utc)
        dqs = calculate_dqs(65.0, "pm25", now, distance_km=5.0, sensor_type="low_cost")
        fcs = calculate_fcs(dqs_values=[dqs], values=[65.0])
        assert fcs == pytest.approx(dqs, abs=1e-6)

    @pytest.mark.asyncio
    async def test_fcs_calculated_from_persisted_database_records(
        self, openaq_provider, async_test_session
    ):
        """
        Verify end-to-end FCS computation using real DQS values retrieved
        directly from the database.
        """
        now_utc = datetime.now(timezone.utc)
        locs = [
            {"id": 1, "name": "Station A", "coordinates": {"latitude": 28.5, "longitude": 77.2}},
            {"id": 2, "name": "Station B", "coordinates": {"latitude": 28.52, "longitude": 77.22}},
        ]
        meas = [
            {
                "locationsId": 1,
                "parameter": {"name": "pm25"},
                "value": 60.0,
                "datetime": {"utc": now_utc.isoformat()},
                "location": "Station A",
            },
            {
                "locationsId": 2,
                "parameter": {"name": "pm25"},
                "value": 63.0,
                "datetime": {"utc": now_utc.isoformat()},
                "location": "Station B",
            },
        ]

        with patch.object(openaq_provider, "fetch_data", AsyncMock(return_value={"locations": locs, "measurements": meas})):
            await openaq_provider.ingest(async_test_session)

        rows = (await async_test_session.execute(
            select(OpenAQMeasurement).where(OpenAQMeasurement.parameter == "pm25")
        )).scalars().all()

        assert len(rows) == 2
        dqs_vals = [r.dqs for r in rows]
        observed_vals = [r.value for r in rows]

        fcs = calculate_fcs(dqs_values=dqs_vals, values=observed_vals)
        assert 0.90 <= fcs <= 1.0


# =============================================================================
# 5. DatabaseManager Backwards Compatibility Tests
# =============================================================================

class TestDatabaseManagerBackwardCompatibility:
    @pytest.mark.asyncio
    async def test_db_manager_lifecycle_and_crud(self):
        """Verify db_manager legacy singleton executes queries and returns Row objects."""
        # Use a fresh test database path
        test_db = DatabaseManager()
        await test_db.initialize(":memory:")

        # Insert into industries
        await test_db.execute(
            "INSERT INTO industries (id, name, type, latitude, longitude, state) VALUES (?, ?, ?, ?, ?, ?)",
            (101, "NTPC Dadri Thermal Power", "Thermal Power", 28.59, 77.55, "Uttar Pradesh"),
        )

        # Query via fetch_one with named parameter
        row = await test_db.fetch_one("SELECT * FROM industries WHERE id = :id", {"id": 101})
        assert row is not None
        assert row["name"] == "NTPC Dadri Thermal Power"
        assert row["latitude"] == pytest.approx(28.59)

        # Query via fetch_all
        all_rows = await test_db.fetch_all("SELECT * FROM industries")
        assert len(all_rows) >= 1

        # Test population_data table
        await test_db.execute(
            "INSERT INTO population_data (location, latitude, longitude, population, density) VALUES (?, ?, ?, ?, ?)",
            ("Sector 62 Noida", 28.62, 77.36, 120000, 4500.0),
        )
        pop_row = await test_db.fetch_one("SELECT * FROM population_data WHERE location = ?", ("Sector 62 Noida",))
        assert pop_row is not None
        assert pop_row["population"] == 120000

        await test_db.close()

    @pytest.mark.asyncio
    async def test_facility_intelligence_service_runs_cleanly_with_db_manager(self):
        """Verify FacilityIntelligenceService works with db_manager as its database provider."""
        test_db = DatabaseManager()
        await test_db.initialize(":memory:")

        await test_db.execute(
            "INSERT INTO industries (id, name, type, latitude, longitude, state) VALUES (?, ?, ?, ?, ?, ?)",
            (505, "Indraprastha Gas Plant", "Refinery", 28.61, 77.25, "Delhi"),
        )

        service = FacilityIntelligenceService(test_db)
        context = await service.get_environmental_context("505")

        assert context is not None
        assert context["facility"]["name"] == "Indraprastha Gas Plant"
        assert "bbox" in context["spatial_context"]
        bbox = context["spatial_context"]["bbox"]
        assert bbox["min_lat"] < 28.61 < bbox["max_lat"]
        assert bbox["min_lon"] < 77.25 < bbox["max_lon"]

        await test_db.close()


# =============================================================================
# 6. Zero-Fake-Data Invariant Pipeline Tests
# =============================================================================

class TestZeroFakeDataPipelineInvariant:
    @pytest.mark.asyncio
    async def test_openaq_missing_or_invalid_key_produces_zero_rows(self, async_test_session):
        """
        Verify OpenAQProvider without API key or on 401 returns empty results
        and inserts exactly 0 fake/synthetic rows.
        """
        provider_no_key = OpenAQProvider(api_key="")
        result = await provider_no_key.ingest(async_test_session)

        count = await async_test_session.scalar(select(func.count(OpenAQMeasurement.id)))
        assert count == 0, "Fake data was inserted into database when API key was missing!"

    @pytest.mark.asyncio
    async def test_firms_missing_map_key_produces_zero_rows(self, async_test_session):
        """
        Verify NASAFIRMSProvider without MAP_KEY returns empty results
        and inserts exactly 0 fake/synthetic fire detections.
        """
        provider_no_key = NASAFIRMSProvider(map_key="")
        result = await provider_no_key.ingest(async_test_session)

        count = await async_test_session.scalar(select(func.count(NASAFirmsFire.id)))
        assert count == 0, "Fake data was inserted into database when MAP_KEY was missing!"

    @pytest.mark.asyncio
    async def test_pipeline_never_invokes_random_generators(
        self, openaq_provider, firms_provider, async_test_session
    ):
        """
        Verify random.uniform, random.random, and synthetic generators are NEVER called
        during ingestion of valid data.
        """
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        now_utc = datetime.now(timezone.utc)

        with patch("random.uniform", side_effect=AssertionError("random.uniform called in pipeline!")):
            with patch("random.random", side_effect=AssertionError("random.random called in pipeline!")):
                # Test OpenAQ ingestion
                with patch.object(
                    openaq_provider,
                    "fetch_data",
                    AsyncMock(return_value={
                        "locations": MOCK_OPENAQ_V3_LOCATIONS["results"],
                        "measurements": get_mock_openaq_measurements(now_utc)["results"],
                    }),
                ):
                    res_openaq = await openaq_provider.ingest(async_test_session)
                    assert res_openaq.get("status") == "success"

                # Test FIRMS ingestion
                with patch.object(
                    firms_provider,
                    "fetch_data",
                    AsyncMock(return_value=get_mock_firms_csv(today_str)),
                ):
                    res_firms = await firms_provider.ingest(async_test_session)
                    assert res_firms.get("status") == "success"
