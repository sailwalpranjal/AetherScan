"""
Unit and integration tests for FacilityIntelligenceService.
Verifies:
1. Spherical Haversine geodesic distance accuracy, benchmarks, dateline, poles, and antipodal clamping.
2. Bounding box generation with polar guard and antimeridian crossing detection.
3. Two-phase spatial discovery (SQL bbox + Haversine radial filter) for OpenAQ and FIRMS.
4. Corner-trap exclusion: coordinates inside bounding box but outside circular radius.
5. Parameter-grouped latest measurement deduplication and distance-decay DQS calculation.
6. FIRMS thermal anomaly DQS (freshness, satellite sensor reliability, physical validity).
7. Multi-sensor Fusion Confidence Score (FCS) mathematical aggregation.
8. Strict Zero-Fake-Data compliance: empty collections, explicit boolean availability flags.
9. Missing facility 404 / ValueError handling.
10. Backward compatibility with legacy MockDB and get_environmental_context().
"""

from datetime import datetime, timedelta, timezone
import math
import pytest
import pytest_asyncio

from db.database import DatabaseManager
from services.facility_intelligence import (
    EARTH_RADIUS_KM,
    FacilityIntelligenceService,
    haversine_distance,
)


# =============================================================================
# Legacy MockDB Fixture (Preserves Backward Compatibility)
# =============================================================================

class MockDB:
    async def fetch_one(self, query, params):
        if params.get("id") in ("123", 123):
            return {
                "id": "123",
                "name": "Test Factory",
                "latitude": 45.0,
                "longitude": 10.0,
                "type": "manufacturing",
                "state": "Test State",
                "capacity": "High",
            }
        return None


# =============================================================================
# 1. Haversine Formula Mathematical Benchmarks
# =============================================================================

def test_haversine_identical_coordinates():
    """Identical points on Earth must evaluate to exactly 0.0 km."""
    assert haversine_distance(0.0, 0.0, 0.0, 0.0) == 0.0
    assert haversine_distance(28.6139, 77.2090, 28.6139, 77.2090) == 0.0
    assert haversine_distance(-33.8688, 151.2093, -33.8688, 151.2093) == 0.0


def test_haversine_known_benchmarks():
    """Verified against theoretical WGS-84 spherical distance benchmarks."""
    # Delhi to Agra (Taj Mahal)
    d_agra = haversine_distance(28.6139, 77.2090, 27.1751, 78.0421)
    assert d_agra == pytest.approx(179.717958, abs=1e-3)

    # London to Paris
    d_paris = haversine_distance(51.5074, -0.1278, 48.8566, 2.3522)
    assert d_paris == pytest.approx(343.556535, abs=1e-3)

    # New York to Los Angeles
    d_la = haversine_distance(40.7128, -74.0060, 34.0522, -118.2437)
    assert d_la == pytest.approx(3935.751691, abs=1e-2)

    # Tokyo to Sydney
    d_tokyo_sydney = haversine_distance(35.6762, 139.6503, -33.8688, 151.2093)
    assert d_tokyo_sydney == pytest.approx(7825.829426, abs=1e-2)


def test_haversine_equator_and_meridian():
    """Great-circle distance along primary axes."""
    # 1 degree along equator
    d_eq_lon = haversine_distance(0.0, 0.0, 0.0, 1.0)
    assert d_eq_lon == pytest.approx(111.195080, abs=1e-4)

    # 1 degree along prime meridian
    d_eq_lat = haversine_distance(0.0, 0.0, 1.0, 0.0)
    assert d_eq_lat == pytest.approx(111.195080, abs=1e-4)

    # 90 degrees along equator (one quarter circumference = pi / 2 * R)
    d_quarter = haversine_distance(0.0, 0.0, 0.0, 90.0)
    assert d_quarter == pytest.approx(math.pi / 2.0 * EARTH_RADIUS_KM, abs=1e-4)


def test_haversine_poles():
    """Singularities at geographic poles."""
    # North Pole to South Pole (half circumference = pi * R)
    d_poles = haversine_distance(90.0, 0.0, -90.0, 0.0)
    assert d_poles == pytest.approx(math.pi * EARTH_RADIUS_KM, abs=1e-4)

    # North Pole with differing longitudes (same physical singularity)
    assert haversine_distance(90.0, 0.0, 90.0, 120.0) == 0.0
    # South Pole with differing longitudes
    assert haversine_distance(-90.0, -50.0, -90.0, 80.0) == 0.0


def test_haversine_dateline_crossing():
    """Automatic minor arc traversal across the international date line (180th meridian)."""
    # 1 degree displacement across antimeridian
    d_dl = haversine_distance(0.0, 179.5, 0.0, -179.5)
    assert d_dl == pytest.approx(111.195080, abs=1e-4)

    # Fiji (Suva) to Samoa (Apia)
    d_fiji_samoa = haversine_distance(-18.1248, 178.4501, -13.8333, -171.7667)
    assert d_fiji_samoa == pytest.approx(1149.172380, abs=1e-3)


def test_haversine_antipodal_precision_clamping():
    """
    IEEE-754 precision check: unclamped antipodal pairs evaluate to a = 1.0000000000000002,
    which must NOT raise ValueError (math domain error).
    """
    d_antipodal = haversine_distance(45.0, 10.0, -45.0, -170.0)
    assert d_antipodal == pytest.approx(math.pi * EARTH_RADIUS_KM, abs=1e-4)

    # Sweep antipodal coordinate pairs across globe
    for lat in (-80.0, -45.0, 0.0, 45.0, 80.0):
        for lon in (-170.0, -90.0, 0.0, 90.0, 170.0):
            opp_lon = lon + 180.0 if lon <= 0.0 else lon - 180.0
            d = haversine_distance(lat, lon, -lat, opp_lon)
            assert d == pytest.approx(math.pi * EARTH_RADIUS_KM, abs=1e-3)


def test_haversine_input_validation():
    """Rejection of physical out-of-bound coordinates and NaN."""
    with pytest.raises(ValueError, match="Latitude out of valid range"):
        haversine_distance(95.0, 0.0, 0.0, 0.0)
    with pytest.raises(ValueError, match="Latitude out of valid range"):
        haversine_distance(0.0, 0.0, -91.0, 0.0)
    with pytest.raises(ValueError, match="Longitude out of valid range"):
        haversine_distance(0.0, 185.0, 0.0, 0.0)
    with pytest.raises(ValueError, match="Coordinates cannot be NaN"):
        haversine_distance(float("nan"), 0.0, 0.0, 0.0)


# =============================================================================
# 2. Bounding Box Generation Tests
# =============================================================================

@pytest.mark.asyncio
async def test_generate_bounding_box():
    """Legacy bounding box test preserved for backward compatibility."""
    service = FacilityIntelligenceService(MockDB())
    bbox = service.generate_bounding_box(45.0, 10.0, 11.1)

    assert bbox["min_lat"] == pytest.approx(44.9, 0.1)
    assert bbox["max_lat"] == pytest.approx(45.1, 0.1)


def test_generate_bounding_box_polar_and_dateline():
    """Guarantees bounding box avoids pole division-by-zero and flags dateline crossing."""
    service = FacilityIntelligenceService(MockDB())

    # Polar region: lat = 89.95, radius = 10 km (89.95 + 10/111 = 90.04 -> clamped to 90.0)
    bbox_polar = service.generate_bounding_box(89.95, 0.0, 10.0)
    assert bbox_polar["max_lat"] == 90.0
    assert bbox_polar["min_lat"] < 89.95

    # Date line crossing: lon = 179.8, radius = 50.0 km
    bbox_dl = service.generate_bounding_box(0.0, 179.8, 50.0)
    assert bbox_dl["crosses_dateline"] is True


# =============================================================================
# 3. Legacy MockDB and Missing Facility Error Handling
# =============================================================================

@pytest.mark.asyncio
async def test_get_environmental_context():
    """Legacy backward compatibility test with MockDB."""
    service = FacilityIntelligenceService(MockDB())
    context = await service.get_environmental_context("123")

    assert context["facility"]["name"] == "Test Factory"
    assert "bbox" in context["spatial_context"]
    assert "evidence_chain" in context
    assert "ground_sensors" in context["evidence_chain"]


@pytest.mark.asyncio
async def test_missing_facility_raises_value_error():
    """Querying an unknown facility ID raises ValueError."""
    service = FacilityIntelligenceService(MockDB())
    with pytest.raises(ValueError, match="Facility unknown_999 not found."):
        await service.get_evidence_chain("unknown_999")


# =============================================================================
# 4. Database Fixtures for Two-Phase Spatial & Evidence Chain Tests
# =============================================================================

@pytest_asyncio.fixture
async def populated_db():
    """
    Isolated in-memory SQLite database initialized with schema and seed data:
    - Facility 101 ("NTPC Badarpur"): lat = 28.505, lon = 77.305 (Industrial cluster)
    - Facility 102 ("Thar Desert Solar"): lat = 27.0, lon = 71.0 (Zero-data empty zone)
    - Ground Stations:
      - st_badarpur_near: 1.47 km away (PM2.5=65.0 fresh, PM2.5=999.0 stale/older, PM10=120.0, NO2=45.0)
      - st_badarpur_corner_trap: inside 10km bbox, but Haversine dist = 11.83 km > 10 km
      - st_badarpur_medium: 10.56 km away (inside 25km radius)
    - Active Fires:
      - fire_near: 1.9 km away, fresh VIIRS observation, 345 K
      - fire_corner_trap: inside 10km bbox, but Haversine dist = 11.09 km > 10 km
      - fire_medium: 12.78 km away (inside 25km radius)
      - fire_stale: > 24 hours old (tests Q_fresh = 0)
      - fire_invalid: 750 K brightness (tests Q_valid = 0)
    """
    db = DatabaseManager()
    await db.initialize(":memory:")

    now = datetime.now(timezone.utc)
    ts_now = now.isoformat()
    ts_older = (now - timedelta(hours=3)).isoformat()
    recent_dt = now - timedelta(minutes=15)
    today_date = recent_dt.strftime("%Y-%m-%d")
    recent_acq_time = recent_dt.strftime("%H%M")

    # 1. Seed Facilities
    await db.execute(
        """INSERT INTO industries (id, name, type, latitude, longitude, state, capacity)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (101, "NTPC Badarpur Thermal Power Station", "Coal Power Plant", 28.505, 77.305, "Delhi", "705 MW"),
    )
    await db.execute(
        """INSERT INTO industries (id, name, type, latitude, longitude, state, capacity)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (102, "Thar Desert Solar Park", "Solar", 27.0, 71.0, "Rajasthan", "50 MW"),
    )

    # 2. Seed OpenAQ Ground Stations
    await db.execute(
        """INSERT INTO openaq_stations (station_id, name, latitude, longitude, city, country, last_updated, parameters)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        ("st_badarpur_near", "Badarpur Ambient Monitor", 28.515, 77.315, "Delhi", "IN", ts_now, "pm25,pm10,no2"),
    )
    await db.execute(
        """INSERT INTO openaq_stations (station_id, name, latitude, longitude, city, country, last_updated, parameters)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        ("st_badarpur_corner_trap", "Far Corner Station", 28.585, 77.385, "Delhi", "IN", ts_now, "pm25"),
    )
    await db.execute(
        """INSERT INTO openaq_stations (station_id, name, latitude, longitude, city, country, last_updated, parameters)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        ("st_badarpur_medium", "Okhla Monitor", 28.600, 77.300, "Delhi", "IN", ts_now, "pm25"),
    )

    # 3. Seed OpenAQ Measurements
    # For st_badarpur_near: insert older PM2.5 first, then newer PM2.5 to verify deduplication
    await db.execute(
        """INSERT INTO openaq_measurements (station_id, parameter, value, unit, timestamp, dqs)
           VALUES (?, ?, ?, ?, ?, ?)""",
        ("st_badarpur_near", "pm25", 999.0, "ug/m3", ts_older, 0.5),
    )
    await db.execute(
        """INSERT INTO openaq_measurements (station_id, parameter, value, unit, timestamp, dqs)
           VALUES (?, ?, ?, ?, ?, ?)""",
        ("st_badarpur_near", "pm25", 65.0, "ug/m3", ts_now, 0.9),
    )
    await db.execute(
        """INSERT INTO openaq_measurements (station_id, parameter, value, unit, timestamp, dqs)
           VALUES (?, ?, ?, ?, ?, ?)""",
        ("st_badarpur_near", "pm10", 120.0, "ug/m3", ts_now, 0.9),
    )
    await db.execute(
        """INSERT INTO openaq_measurements (station_id, parameter, value, unit, timestamp, dqs)
           VALUES (?, ?, ?, ?, ?, ?)""",
        ("st_badarpur_near", "no2", 45.0, "ug/m3", ts_now, 0.85),
    )

    # For corner trap and medium stations
    await db.execute(
        """INSERT INTO openaq_measurements (station_id, parameter, value, unit, timestamp, dqs)
           VALUES (?, ?, ?, ?, ?, ?)""",
        ("st_badarpur_corner_trap", "pm25", 40.0, "ug/m3", ts_now, 0.8),
    )
    await db.execute(
        """INSERT INTO openaq_measurements (station_id, parameter, value, unit, timestamp, dqs)
           VALUES (?, ?, ?, ?, ?, ?)""",
        ("st_badarpur_medium", "pm25", 50.0, "ug/m3", ts_now, 0.8),
    )

    # 4. Seed NASA FIRMS Fires
    # Near fire (~1.9 km)
    await db.execute(
        """INSERT INTO nasa_firms_fires (id, latitude, longitude, brightness, scan, track, acq_date, acq_time, satellite, confidence, frp, dqs)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (1, 28.518, 77.318, 345.0, 1.0, 1.0, today_date, recent_acq_time, "VIIRS", "nominal", 15.2, 0.76),
    )
    # Corner trap fire (inside 10km bbox, Haversine dist = 11.09 km)
    await db.execute(
        """INSERT INTO nasa_firms_fires (id, latitude, longitude, brightness, scan, track, acq_date, acq_time, satellite, confidence, frp, dqs)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (2, 28.580, 77.380, 330.0, 1.0, 1.0, today_date, recent_acq_time, "VIIRS", "nominal", 10.0, 0.76),
    )
    # Medium fire (12.78 km, inside 25km)
    await db.execute(
        """INSERT INTO nasa_firms_fires (id, latitude, longitude, brightness, scan, track, acq_date, acq_time, satellite, confidence, frp, dqs)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (3, 28.620, 77.310, 350.0, 1.0, 1.0, today_date, recent_acq_time, "VIIRS", "nominal", 22.0, 0.76),
    )
    # Stale fire (2020)
    await db.execute(
        """INSERT INTO nasa_firms_fires (id, latitude, longitude, brightness, scan, track, acq_date, acq_time, satellite, confidence, frp, dqs)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (4, 28.510, 77.310, 335.0, 1.0, 1.0, "2020-01-01", "0000", "MODIS", "nominal", 8.0, 0.0),
    )
    # Invalid brightness fire (750 K > 600 K max physical bound)
    await db.execute(
        """INSERT INTO nasa_firms_fires (id, latitude, longitude, brightness, scan, track, acq_date, acq_time, satellite, confidence, frp, dqs)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (5, 28.508, 77.308, 750.0, 1.0, 1.0, today_date, "1200", "VIIRS", "nominal", 50.0, 0.0),
    )

    yield db
    await db.close()


# =============================================================================
# 5. Two-Phase Spatial Discovery & Corner Trap Exclusion Tests
# =============================================================================

@pytest.mark.asyncio
async def test_openaq_two_phase_query_and_corner_trap_exclusion(populated_db):
    """
    At 10km radius: SQL bbox catches corner station (11.83 km away),
    but spherical Haversine post-filter strictly excludes it.
    At 25km radius: all 3 stations are included, sorted by distance ascending.
    """
    service = FacilityIntelligenceService(populated_db)

    # 10 km query around Badarpur (28.505, 77.305)
    stations_10k = await service.get_openaq_stations_within_radius(28.505, 77.305, radius_km=10.0)
    station_ids_10k = [s["station_id"] for s in stations_10k]

    assert "st_badarpur_near" in station_ids_10k
    assert "st_badarpur_corner_trap" not in station_ids_10k
    assert "st_badarpur_medium" not in station_ids_10k
    assert len(stations_10k) == 1
    assert stations_10k[0]["distance_km"] == pytest.approx(1.47, abs=0.1)

    # 25 km query around Badarpur
    stations_25k = await service.get_openaq_stations_within_radius(28.505, 77.305, radius_km=25.0)
    station_ids_25k = [s["station_id"] for s in stations_25k]

    assert len(stations_25k) == 3
    assert "st_badarpur_near" in station_ids_25k
    assert "st_badarpur_medium" in station_ids_25k
    assert "st_badarpur_corner_trap" in station_ids_25k

    # Must be sorted in ascending order of distance
    distances = [s["distance_km"] for s in stations_25k]
    assert distances == sorted(distances)


@pytest.mark.asyncio
async def test_firms_two_phase_query_and_corner_trap_exclusion(populated_db):
    """
    At 10km radius: SQL bbox catches corner fire (11.09 km away),
    but spherical Haversine post-filter strictly excludes it.
    At 25km radius: all eligible fires are included and sorted.
    """
    service = FacilityIntelligenceService(populated_db)

    # 10 km query around Badarpur
    fires_10k = await service.get_firms_fires_within_radius(28.505, 77.305, radius_km=10.0)
    fire_ids_10k = [f["id"] for f in fires_10k]

    # Fire 1 is at 1.9km, Fire 4 (stale) is at ~0.7km, Fire 5 (invalid) is at ~0.4km
    assert 1 in fire_ids_10k
    assert 2 not in fire_ids_10k  # Corner trap at 11.09 km excluded
    assert 3 not in fire_ids_10k  # Medium fire at 12.78 km excluded

    # 25 km query around Badarpur
    fires_25k = await service.get_firms_fires_within_radius(28.505, 77.305, radius_km=25.0)
    fire_ids_25k = [f["id"] for f in fires_25k]

    assert 1 in fire_ids_25k
    assert 2 in fire_ids_25k
    assert 3 in fire_ids_25k

    distances = [f["distance_km"] for f in fires_25k]
    assert distances == sorted(distances)


# =============================================================================
# 6. Parameter Deduplication & Dynamic DQS Calculation Tests
# =============================================================================

@pytest.mark.asyncio
async def test_latest_measurements_deduplication_and_dqs_decay(populated_db):
    """
    Verifies:
    1. Latest observation selection: PM2.5 = 65.0 is chosen, older PM2.5 = 999.0 is discarded.
    2. Dynamic distance-decay DQS: Q_spatial < 1.0 because station distance > 0.
    3. DQS breakdown contains freshness, spatial, sensor, validity keys.
    """
    service = FacilityIntelligenceService(populated_db)
    stations = await service.get_openaq_stations_within_radius(28.505, 77.305, radius_km=10.0)
    detailed_stations = await service.get_latest_measurements_for_stations(stations)

    assert len(detailed_stations) == 1
    st = detailed_stations[0]
    params = st["parameters"]

    # Parameter keys present
    assert "pm25" in params
    assert "pm10" in params
    assert "no2" in params

    # Deduplication check: PM2.5 must be the latest value (65.0, not 999.0)
    assert params["pm25"]["value"] == 65.0
    assert params["pm10"]["value"] == 120.0
    assert params["no2"]["value"] == 45.0

    # Distance decay check
    # Distance is ~1.47 km, so Q_spatial = 1.0 - 0.9 * (1.47 / 50) < 1.0
    dqs_breakdown = params["pm25"]["dqs_breakdown"]
    assert "freshness" in dqs_breakdown
    assert "spatial" in dqs_breakdown
    assert "sensor" in dqs_breakdown
    assert "validity" in dqs_breakdown

    assert dqs_breakdown["spatial"] < 1.0
    assert dqs_breakdown["sensor"] == 1.0  # Reference grade
    assert dqs_breakdown["validity"] == 1.0  # Physical value 65.0 is valid
    assert params["pm25"]["dqs"] > 0.0


@pytest.mark.asyncio
async def test_firms_fire_dqs_components(populated_db):
    """
    Observation-level DQS for NASA FIRMS thermal hotspots:
    - Fresh observation: DQS ~ 0.765 (1.0 * 0.90 * 0.85 * 1.0)
    - Stale observation (> 24h old): Q_fresh = 0.0 -> DQS = 0.0
    - Invalid brightness (750 K > 600 K): Q_valid = 0.0 -> DQS = 0.0
    """
    service = FacilityIntelligenceService(populated_db)
    fires = await service.get_firms_fires_within_radius(28.505, 77.305, radius_km=10.0)

    fire_by_id = {f["id"]: f for f in fires}

    # Fresh fire (id=1): 345 K, today
    fresh_fire = fire_by_id[1]
    assert fresh_fire["dqs"] == pytest.approx(0.765, abs=0.05)
    assert fresh_fire["brightness"] == 345.0
    assert fresh_fire["satellite"] == "VIIRS"

    # Stale fire (id=4): year 2020
    stale_fire = fire_by_id[4]
    assert stale_fire["dqs"] == 0.0

    # Invalid brightness fire (id=5): 750 K
    invalid_fire = fire_by_id[5]
    assert invalid_fire["dqs"] == 0.0


# =============================================================================
# 7. Multi-Sensor FCS Fusion Calculation Tests
# =============================================================================

@pytest.mark.asyncio
async def test_multi_sensor_fcs_calculation(populated_db):
    """
    Multi-sensor FCS calculation integrates ground stations and fire hotspots.
    FCS must be in (0.0, 1.0], confidence is HIGH or MEDIUM, dominant pollutant is PM2.5.
    """
    service = FacilityIntelligenceService(populated_db)
    evidence = await service.get_evidence_chain(101, radius_km=10.0)

    ambient = evidence["ambient_quality"]
    assert ambient["fcs"] > 0.0
    assert ambient["fcs"] <= 1.0
    assert ambient["fcs_confidence"] in ("HIGH", "MEDIUM")
    assert ambient["dominant_pollutant"] == "pm25"
    assert ambient["observations_count"] > 0


# =============================================================================
# 8. Strict Zero-Fake-Data Empty State Tests
# =============================================================================

@pytest.mark.asyncio
async def test_zero_fake_data_empty_state(populated_db):
    """
    For Facility 102 (Thar Desert Solar Park), zero ground stations and zero fires exist.
    Adhering strictly to no_placeholders_in_production.md:
    - ground_sensors is an empty list []
    - fire_events is an empty list []
    - explicit boolean flags: has_ground_stations=False, has_fire_hotspots=False
    - stations_count = 0, fires_count = 0
    - fcs = 0.0, fcs_confidence = 'INSUFFICIENT_DATA', dominant_pollutant = None
    - regulatory_summary overall_status = 'no_data'
    - thermal_correlation state = 'DATA_UNAVAILABLE'
    """
    service = FacilityIntelligenceService(populated_db)
    evidence = await service.get_evidence_chain(102, radius_km=10.0)

    # No synthetic data
    assert evidence["ground_sensors"] == []
    assert evidence["fire_events"] == []

    # Explicit availability flags
    avail = evidence["data_availability"]
    assert avail["has_ground_stations"] is False
    assert avail["has_fire_hotspots"] is False
    assert avail["stations_count"] == 0
    assert avail["fires_count"] == 0

    # Ambient quality zero-data state
    amb = evidence["ambient_quality"]
    assert amb["fcs"] == 0.0
    assert amb["fcs_confidence"] == "INSUFFICIENT_DATA"
    assert amb["dominant_pollutant"] is None
    assert amb["observations_count"] == 0

    # Regulatory and thermal correlation zero-data states
    assert evidence["regulatory_summary"]["overall_status"] == "no_data"
    assert evidence["thermal_correlation"]["state"] == "DATA_UNAVAILABLE"


# =============================================================================
# 9. Interface Contract Compliance Tests
# =============================================================================

@pytest.mark.asyncio
async def test_full_evidence_chain_structure(populated_db):
    """
    Verifies every key in PROJECT.md Interface Contract for get_evidence_chain:
    - facility: {id, name, type, latitude, longitude, state, capacity}
    - radius_km: float
    - ground_sensors: List[Dict]
    - fire_events: List[Dict]
    - ambient_quality: Dict
    - regulatory_summary: Dict
    - thermal_correlation: Dict
    - data_availability: Dict
    """
    service = FacilityIntelligenceService(populated_db)
    chain = await service.get_evidence_chain(101, radius_km=10.0)

    required_root_keys = [
        "facility",
        "radius_km",
        "ground_sensors",
        "fire_events",
        "ambient_quality",
        "regulatory_summary",
        "thermal_correlation",
        "data_availability",
    ]
    for key in required_root_keys:
        assert key in chain, f"Missing root key: {key}"

    fac = chain["facility"]
    for fac_key in ("id", "name", "type", "latitude", "longitude", "state", "capacity"):
        assert fac_key in fac, f"Missing facility key: {fac_key}"

    assert chain["radius_km"] == 10.0
    assert isinstance(chain["ground_sensors"], list)
    assert isinstance(chain["fire_events"], list)
    assert isinstance(chain["ambient_quality"], dict)
    assert isinstance(chain["regulatory_summary"], dict)
    assert isinstance(chain["thermal_correlation"], dict)
    assert isinstance(chain["data_availability"], dict)

    # Non-causality disclaimer presence
    assert "disclaimer" in chain["thermal_correlation"]
    assert "dispersion" in chain["thermal_correlation"]["disclaimer"]


@pytest.mark.asyncio
async def test_get_environmental_context_with_real_db(populated_db):
    """Verifies get_environmental_context works seamlessly with real DatabaseManager."""
    service = FacilityIntelligenceService(populated_db)
    context = await service.get_environmental_context("101")

    assert context["facility"]["name"] == "NTPC Badarpur Thermal Power Station"
    assert "bbox" in context["spatial_context"]
    assert context["spatial_context"]["radius_km"] == 10.0
    assert len(context["evidence_chain"]["ground_sensors"]) == 1
    assert context["data_availability"]["has_ground_stations"] is True
