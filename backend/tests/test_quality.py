"""
Comprehensive unit tests for the AetherScan Data Quality Engine.

Tests:
1. Freshness Score (Q_fresh)
2. Spatial Representativeness Score (Q_spatial)
3. Sensor Reliability Score (Q_sensor)
4. Value Validity Score (Q_valid)
5. Data Quality Score (DQS) combined model
6. Fusion Confidence Score (FCS) multi-source fusion model
"""

from datetime import datetime, timedelta, timezone
import math
from pathlib import Path
import sys
import pytest

# Ensure backend directory is in sys.path regardless of how pytest is invoked
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    from core.quality import (
        calculate_freshness,
        calculate_spatial_representativeness,
        calculate_sensor_reliability,
        validate_value,
        calculate_dqs,
        get_dqs_breakdown,
        calculate_fcs,
        get_fcs_confidence_level,
        PHYSICAL_BOUNDS,
    )
except ImportError:
    from backend.core.quality import (
        calculate_freshness,
        calculate_spatial_representativeness,
        calculate_sensor_reliability,
        validate_value,
        calculate_dqs,
        get_dqs_breakdown,
        calculate_fcs,
        get_fcs_confidence_level,
        PHYSICAL_BOUNDS,
    )


# ============================================================================
# 1. Freshness Tests (Q_fresh)
# ============================================================================

class TestFreshness:
    def test_fresh_under_one_hour(self):
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        # Exactly current
        assert calculate_freshness(ref_time, ref_time=ref_time) == 1.0
        # 30 minutes old
        t_30m = ref_time - timedelta(minutes=30)
        assert calculate_freshness(t_30m, ref_time=ref_time) == 1.0
        # 59 minutes old
        t_59m = ref_time - timedelta(minutes=59)
        assert calculate_freshness(t_59m, ref_time=ref_time) == 1.0

    def test_decay_between_one_and_twenty_four_hours(self):
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        # 1 hour exactly: exp(-0.1 * 1.0) = exp(-0.1) ~ 0.904837
        t_1h = ref_time - timedelta(hours=1)
        expected_1h = round(math.exp(-0.1 * 1.0), 6)
        assert calculate_freshness(t_1h, ref_time=ref_time) == pytest.approx(expected_1h, abs=1e-5)

        # 6 hours: exp(-0.1 * 6) = exp(-0.6) ~ 0.548812
        t_6h = ref_time - timedelta(hours=6)
        expected_6h = round(math.exp(-0.1 * 6.0), 6)
        assert calculate_freshness(t_6h, ref_time=ref_time) == pytest.approx(expected_6h, abs=1e-5)

        # 12 hours: exp(-0.1 * 12) = exp(-1.2) ~ 0.301194
        t_12h = ref_time - timedelta(hours=12)
        expected_12h = round(math.exp(-0.1 * 12.0), 6)
        assert calculate_freshness(t_12h, ref_time=ref_time) == pytest.approx(expected_12h, abs=1e-5)

        # 24 hours exactly: exp(-0.1 * 24) = exp(-2.4) ~ 0.090718
        t_24h = ref_time - timedelta(hours=24)
        expected_24h = round(math.exp(-0.1 * 24.0), 6)
        assert calculate_freshness(t_24h, ref_time=ref_time) == pytest.approx(expected_24h, abs=1e-5)

    def test_stale_over_twenty_four_hours(self):
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        # 24 hours and 1 minute
        t_stale = ref_time - timedelta(hours=24, minutes=1)
        assert calculate_freshness(t_stale, ref_time=ref_time) == 0.0

        # 48 hours
        t_48h = ref_time - timedelta(hours=48)
        assert calculate_freshness(t_48h, ref_time=ref_time) == 0.0

    def test_custom_decay_lambda(self):
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        t_5h = ref_time - timedelta(hours=5)
        # lambda = 0.2: exp(-0.2 * 5) = exp(-1.0) ~ 0.367879
        expected = round(math.exp(-0.2 * 5.0), 6)
        assert calculate_freshness(t_5h, ref_time=ref_time, decay_lambda=0.2) == pytest.approx(expected, abs=1e-5)

    def test_future_timestamp_handling(self):
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        # Minor clock skew (2 minutes in future) -> treated as dt = 0 -> 1.0
        t_future_skew = ref_time + timedelta(minutes=2)
        assert calculate_freshness(t_future_skew, ref_time=ref_time) == 1.0

        # Boundary clock skew (5 minutes in future) -> 1.0
        t_future_boundary = ref_time + timedelta(minutes=5)
        assert calculate_freshness(t_future_boundary, ref_time=ref_time) == 1.0

        # Far future timestamp (> 5 mins skew, e.g. 6 mins or 1 hour) -> 0.0
        t_future_invalid = ref_time + timedelta(minutes=6)
        assert calculate_freshness(t_future_invalid, ref_time=ref_time) == 0.0

        t_future_1h = ref_time + timedelta(hours=1)
        assert calculate_freshness(t_future_1h, ref_time=ref_time) == 0.0

    def test_string_and_epoch_timestamp_formats(self):
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        # ISO format with Z
        iso_str = "2026-09-05T11:30:00Z"
        assert calculate_freshness(iso_str, ref_time=ref_time) == 1.0

        # ISO format with offset
        iso_offset = "2026-09-05T11:30:00+00:00"
        assert calculate_freshness(iso_offset, ref_time=ref_time) == 1.0

        # Date-time space separated
        dt_str = "2026-09-05 11:30:00"
        assert calculate_freshness(dt_str, ref_time=ref_time) == 1.0

        # Unix epoch
        epoch_ts = (ref_time - timedelta(minutes=30)).timestamp()
        assert calculate_freshness(epoch_ts, ref_time=ref_time) == 1.0

        # Invalid string
        assert calculate_freshness("not-a-date", ref_time=ref_time) == 0.0

    def test_negative_decay_lambda_fallback_and_overflow_prevention(self):
        """Negative decay_lambda must not cause OverflowError and should fallback to default 0.1."""
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        t_12h = ref_time - timedelta(hours=12)
        expected_default = round(math.exp(-0.1 * 12.0), 6)  # ~0.301194

        # Extreme negative lambda that would otherwise cause math.exp() OverflowError
        res_overflow = calculate_freshness(t_12h, ref_time=ref_time, decay_lambda=-1000.0)
        assert res_overflow == pytest.approx(expected_default, abs=1e-5)

        # Moderate negative lambda that would otherwise falsely inflate freshness to 1.0
        res_negative = calculate_freshness(t_12h, ref_time=ref_time, decay_lambda=-0.5)
        assert res_negative == pytest.approx(expected_default, abs=1e-5)

    def test_nan_and_inf_decay_lambda_handling(self):
        """NaN and Inf decay_lambda must not corrupt calculation or produce NaN/1.0."""
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        t_12h = ref_time - timedelta(hours=12)
        expected_default = round(math.exp(-0.1 * 12.0), 6)

        # NaN lambda must fallback to default 0.1 instead of returning 1.0
        res_nan = calculate_freshness(t_12h, ref_time=ref_time, decay_lambda=float("nan"))
        assert res_nan == pytest.approx(expected_default, abs=1e-5)

        # Infinite lambda (+inf and -inf)
        res_pos_inf = calculate_freshness(t_12h, ref_time=ref_time, decay_lambda=float("inf"))
        assert res_pos_inf == pytest.approx(expected_default, abs=1e-5)

        res_neg_inf = calculate_freshness(t_12h, ref_time=ref_time, decay_lambda=-float("inf"))
        assert res_neg_inf == pytest.approx(expected_default, abs=1e-5)

    def test_zero_and_invalid_type_decay_lambda(self):
        """Zero or non-numeric decay_lambda must fallback to default 0.1."""
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        t_12h = ref_time - timedelta(hours=12)
        expected_default = round(math.exp(-0.1 * 12.0), 6)

        # Zero decay lambda
        res_zero = calculate_freshness(t_12h, ref_time=ref_time, decay_lambda=0.0)
        assert res_zero == pytest.approx(expected_default, abs=1e-5)

        # Non-numeric string and None
        res_none = calculate_freshness(t_12h, ref_time=ref_time, decay_lambda=None)
        assert res_none == pytest.approx(expected_default, abs=1e-5)

        res_str = calculate_freshness(t_12h, ref_time=ref_time, decay_lambda="invalid_lambda")
        assert res_str == pytest.approx(expected_default, abs=1e-5)


# ============================================================================
# 2. Spatial Representativeness Tests (Q_spatial)
# ============================================================================

class TestSpatialRepresentativeness:
    def test_ground_sensor_exact_coincident(self):
        # 0 km -> 1.0
        assert calculate_spatial_representativeness(0.0) == 1.0

    def test_ground_sensor_linear_decay(self):
        # 10 km: 1.0 - 0.9 * (10 / 50) = 1.0 - 0.18 = 0.82
        assert calculate_spatial_representativeness(10.0) == pytest.approx(0.82, abs=1e-5)

        # 25 km: 1.0 - 0.9 * (25 / 50) = 1.0 - 0.45 = 0.55
        assert calculate_spatial_representativeness(25.0) == pytest.approx(0.55, abs=1e-5)

        # 50 km boundary: 1.0 - 0.9 * (50 / 50) = 0.10
        assert calculate_spatial_representativeness(50.0) == pytest.approx(0.10, abs=1e-5)

    def test_ground_sensor_beyond_fifty_km(self):
        # > 50 km clamped to 0.10
        assert calculate_spatial_representativeness(51.0) == 0.10
        assert calculate_spatial_representativeness(100.0) == 0.10
        assert calculate_spatial_representativeness(500.0) == 0.10

    def test_negative_distance_handled_as_zero(self):
        assert calculate_spatial_representativeness(-5.0) == 1.0

    def test_satellite_pixel(self):
        # Satellite pixel covering target coordinates is fixed at 0.90
        assert calculate_spatial_representativeness(0.0, is_satellite=True) == 0.90
        assert calculate_spatial_representativeness(50.0, is_satellite=True) == 0.90
        assert calculate_spatial_representativeness(200.0, is_satellite=True) == 0.90

    def test_nan_distance_returns_minimum_spatial(self):
        """NaN distance must not be treated as 0 km (1.0); must return safe minimum 0.1."""
        assert calculate_spatial_representativeness(float("nan")) == 0.1
        assert calculate_spatial_representativeness("nan") == 0.1

    def test_inf_distance_returns_minimum_spatial(self):
        """Infinite distances (+inf and -inf) must return safe minimum 0.1."""
        assert calculate_spatial_representativeness(float("inf")) == 0.1
        assert calculate_spatial_representativeness(-float("inf")) == 0.1
        assert calculate_spatial_representativeness("inf") == 0.1
        assert calculate_spatial_representativeness("-inf") == 0.1

    def test_none_and_non_numeric_distance(self):
        """None and invalid non-numeric strings must return minimum 0.1."""
        assert calculate_spatial_representativeness(None) == 0.1
        assert calculate_spatial_representativeness("invalid_distance") == 0.1

    def test_satellite_distance_invariance_with_non_finite(self):
        """Satellite representativeness remains 0.90 regardless of NaN or Inf distance."""
        assert calculate_spatial_representativeness(float("nan"), is_satellite=True) == 0.90
        assert calculate_spatial_representativeness(float("inf"), is_satellite=True) == 0.90


# ============================================================================
# 3. Sensor Reliability Tests (Q_sensor)
# ============================================================================

class TestSensorReliability:
    def test_reference_grade_sensors(self):
        assert calculate_sensor_reliability("reference") == 1.0
        assert calculate_sensor_reliability("CPCB") == 1.0
        assert calculate_sensor_reliability("EPA") == 1.0
        assert calculate_sensor_reliability("government") == 1.0
        assert calculate_sensor_reliability("CAAQMS") == 1.0

    def test_low_cost_sensors(self):
        assert calculate_sensor_reliability("low_cost") == 0.6
        assert calculate_sensor_reliability("low-cost") == 0.6
        assert calculate_sensor_reliability("uncalibrated") == 0.6
        assert calculate_sensor_reliability("PurpleAir") == 0.6
        assert calculate_sensor_reliability("citizen") == 0.6

    def test_satellite_sensors(self):
        # Cloud-free
        assert calculate_sensor_reliability("satellite", is_cloud_free=True) == 0.85
        assert calculate_sensor_reliability("viirs", is_cloud_free=True) == 0.85
        assert calculate_sensor_reliability("modis", is_cloud_free=True) == 0.85

        # Cloud-contaminated
        assert calculate_sensor_reliability("satellite", is_cloud_free=False) == 0.30
        assert calculate_sensor_reliability("viirs", is_cloud_free=False) == 0.30
        assert calculate_sensor_reliability("modis", is_cloud_free=False) == 0.30

    def test_unknown_sensor_fallback(self):
        # Default fallback is 0.6 (conservative low-cost baseline)
        assert calculate_sensor_reliability("generic_hardware") == 0.6
        assert calculate_sensor_reliability("") == 0.6


# ============================================================================
# 4. Value Validity Tests (Q_valid)
# ============================================================================

class TestValueValidity:
    def test_pm25_bounds(self):
        # PM2.5 in [0, 1000]
        assert validate_value("pm25", 0.0) == 1.0
        assert validate_value("pm2.5", 45.5) == 1.0
        assert validate_value("pm_25", 1000.0) == 1.0

        # Invalid
        assert validate_value("pm25", -0.1) == 0.0
        assert validate_value("pm2.5", -10.0) == 0.0
        assert validate_value("pm25", 1000.1) == 0.0
        assert validate_value("pm2.5", 1500.0) == 0.0

    def test_pm10_bounds(self):
        # PM10 in [0, 1500]
        assert validate_value("pm10", 0.0) == 1.0
        assert validate_value("pm10", 250.0) == 1.0
        assert validate_value("pm10", 1500.0) == 1.0

        assert validate_value("pm10", -1.0) == 0.0
        assert validate_value("pm10", 1500.1) == 0.0

    def test_aqi_bounds(self):
        # AQI in [0, 500]
        assert validate_value("aqi", 0.0) == 1.0
        assert validate_value("aqi", 250.0) == 1.0
        assert validate_value("aqi", 500.0) == 1.0

        assert validate_value("aqi", -1.0) == 0.0
        assert validate_value("aqi", 501.0) == 0.0

    def test_gaseous_pollutant_bounds(self):
        # NO2, SO2, O3 in [0, 1000]
        for gas in ("no2", "so2", "o3", "ozone"):
            assert validate_value(gas, 50.0) == 1.0
            assert validate_value(gas, 1000.0) == 1.0
            assert validate_value(gas, -5.0) == 0.0
            assert validate_value(gas, 1001.0) == 0.0

        # CO in [0, 100] mg/m3
        assert validate_value("co", 1.5) == 1.0
        assert validate_value("co", 100.0) == 1.0
        assert validate_value("co", -0.5) == 0.0
        assert validate_value("co", 101.0) == 0.0

    def test_firms_and_satellite_bounds(self):
        # Brightness [200, 600] K
        assert validate_value("brightness", 320.0) == 1.0
        assert validate_value("brightness", 150.0) == 0.0
        assert validate_value("bright_ti4", 340.0) == 1.0

        # FRP [0, 15000] MW
        assert validate_value("frp", 25.4) == 1.0
        assert validate_value("frp", -2.0) == 0.0

        # Confidence [0, 100]
        assert validate_value("confidence", 85.0) == 1.0
        assert validate_value("confidence", 105.0) == 0.0

    def test_unregistered_pollutant_positive_rule(self):
        # Unknown parameter must be non-negative
        assert validate_value("unregistered_compound", 12.0) == 1.0
        assert validate_value("unregistered_compound", -2.0) == 0.0

    def test_invalid_data_types(self):
        assert validate_value("pm25", None) == 0.0
        assert validate_value("pm25", float("nan")) == 0.0
        assert validate_value("pm25", float("inf")) == 0.0
        assert validate_value("pm25", "invalid_string") == 0.0


# ============================================================================
# 5. DQS Combined Model Tests (calculate_dqs)
# ============================================================================

class TestDataQualityScore:
    def test_perfect_reference_observation(self):
        # 0 km, reference sensor (1.0), fresh (< 1h, 1.0), valid PM2.5 (35 ug/m3)
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        ts = ref_time - timedelta(minutes=15)
        dqs = calculate_dqs(
            value=35.0,
            parameter="pm25",
            timestamp=ts,
            distance_km=0.0,
            sensor_type="reference",
            ref_time=ref_time,
        )
        assert dqs == 1.0

    def test_partial_quality_ground_sensor(self):
        # 25 km -> Q_spatial = 0.55
        # Low-cost -> Q_sensor = 0.6
        # 6 hours old -> Q_fresh = exp(-0.6) ~ 0.548812
        # Valid PM2.5 -> Q_valid = 1.0
        # Expected DQS = 0.548812 * 0.55 * 0.6 * 1.0 = 0.181108
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        ts = ref_time - timedelta(hours=6)
        expected = round(math.exp(-0.6) * 0.55 * 0.6 * 1.0, 6)

        dqs = calculate_dqs(
            value=45.0,
            parameter="pm25",
            timestamp=ts,
            distance_km=25.0,
            sensor_type="low_cost",
            ref_time=ref_time,
        )
        assert dqs == pytest.approx(expected, abs=1e-5)

    def test_satellite_cloud_free(self):
        # is_satellite=True -> Q_spatial = 0.90
        # satellite cloud-free -> Q_sensor = 0.85
        # 0 hr -> Q_fresh = 1.0
        # valid brightness -> Q_valid = 1.0
        # DQS = 1.0 * 0.90 * 0.85 * 1.0 = 0.765
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        dqs = calculate_dqs(
            value=330.0,
            parameter="brightness",
            timestamp=ref_time,
            distance_km=10.0,
            sensor_type="satellite",
            is_satellite=True,
            is_cloud_free=True,
            ref_time=ref_time,
        )
        assert dqs == 0.765

    def test_satellite_cloud_contaminated(self):
        # Q_spatial = 0.90
        # satellite contaminated -> Q_sensor = 0.30
        # DQS = 1.0 * 0.90 * 0.30 * 1.0 = 0.27
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        dqs = calculate_dqs(
            value=330.0,
            parameter="brightness",
            timestamp=ref_time,
            distance_km=10.0,
            sensor_type="satellite",
            is_satellite=True,
            is_cloud_free=False,
            ref_time=ref_time,
        )
        assert dqs == 0.27

    def test_stale_data_yields_zero_dqs(self):
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        stale_ts = ref_time - timedelta(hours=26)
        dqs = calculate_dqs(
            value=35.0,
            parameter="pm25",
            timestamp=stale_ts,
            distance_km=0.0,
            sensor_type="reference",
            ref_time=ref_time,
        )
        assert dqs == 0.0

    def test_invalid_value_yields_zero_dqs(self):
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        dqs = calculate_dqs(
            value=-15.0,  # Physically impossible PM2.5
            parameter="pm25",
            timestamp=ref_time,
            distance_km=0.0,
            sensor_type="reference",
            ref_time=ref_time,
        )
        assert dqs == 0.0

    def test_get_dqs_breakdown(self):
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        breakdown = get_dqs_breakdown(
            value=50.0,
            parameter="pm25",
            timestamp=ref_time - timedelta(hours=2),
            distance_km=10.0,
            sensor_type="reference",
            ref_time=ref_time,
        )
        assert "dqs" in breakdown
        assert "q_fresh" in breakdown
        assert "q_spatial" in breakdown
        assert "q_sensor" in breakdown
        assert "q_valid" in breakdown
        assert breakdown["q_valid"] == 1.0
        assert breakdown["q_sensor"] == 1.0
        assert breakdown["q_spatial"] == pytest.approx(0.82, abs=1e-5)
        assert breakdown["dqs"] == pytest.approx(breakdown["q_fresh"] * 0.82 * 1.0 * 1.0, abs=1e-5)

    def test_dqs_with_nan_and_inf_distance(self):
        """DQS must not be inflated to 1.0 when distance_km is NaN or Inf."""
        ref_time = datetime(2026, 9, 5, 12, 0, 0, tzinfo=timezone.utc)
        # With distance_km=float('nan'), Q_spatial should be 0.1, not 1.0.
        # DQS = Q_fresh(1.0) * Q_spatial(0.1) * Q_sensor(1.0) * Q_valid(1.0) = 0.1.
        dqs_nan = calculate_dqs(
            value=25.0,
            parameter="pm25",
            timestamp=ref_time,
            distance_km=float("nan"),
            sensor_type="reference",
            ref_time=ref_time,
        )
        assert dqs_nan == 0.1

        dqs_none = calculate_dqs(
            value=25.0,
            parameter="pm25",
            timestamp=ref_time,
            distance_km=None,
            sensor_type="reference",
            ref_time=ref_time,
        )
        assert dqs_nan == dqs_none == 0.1

        dqs_pos_inf = calculate_dqs(
            value=25.0,
            parameter="pm25",
            timestamp=ref_time,
            distance_km=float("inf"),
            sensor_type="reference",
            ref_time=ref_time,
        )
        assert dqs_pos_inf == 0.1

        dqs_neg_inf = calculate_dqs(
            value=25.0,
            parameter="pm25",
            timestamp=ref_time,
            distance_km=-float("inf"),
            sensor_type="reference",
            ref_time=ref_time,
        )
        assert dqs_neg_inf == 0.1


# ============================================================================
# 6. Fusion Confidence Score Tests (calculate_fcs)
# ============================================================================

class TestFusionConfidenceScore:
    def test_empty_inputs(self):
        assert calculate_fcs([], []) == 0.0
        assert calculate_fcs([0.8], []) == 0.0
        assert calculate_fcs([], [45.0]) == 0.0

    def test_length_mismatch_raises_value_error(self):
        with pytest.raises(ValueError):
            calculate_fcs([0.8, 0.9], [45.0])

        with pytest.raises(ValueError):
            calculate_fcs([0.8, 0.9], [45.0, 50.0], weights=[1.0])

    def test_single_source(self):
        # Single source: N=1 -> sigma = 0 -> FCS = DQS_1
        assert calculate_fcs([0.85], [42.0]) == 0.85
        assert calculate_fcs([0.60], [100.0]) == 0.60
        assert calculate_fcs([1.0], [15.0]) == 1.0

    def test_high_agreement_multi_source(self):
        # Identical readings across 3 sensors: sigma = 0, penalty = 1.0
        dqs_list = [0.9, 0.8, 0.7]
        vals = [50.0, 50.0, 50.0]
        # Average DQS = (0.9 + 0.8 + 0.7) / 3 = 0.8
        assert calculate_fcs(dqs_list, vals) == 0.8

        # Very close readings: mu = 50.0, vals = [49.0, 50.0, 51.0]
        # variance = (1 + 0 + 1) / 3 = 2/3 ~ 0.666667
        # sigma = sqrt(2/3) ~ 0.816497
        # sigma / mu = 0.816497 / 50.0 = 0.016330
        # penalty = 1.0 - 0.016330 = 0.983670
        # FCS = 0.8 * 0.983670 = 0.786936
        vals_close = [49.0, 50.0, 51.0]
        expected_fcs = round(0.8 * (1.0 - math.sqrt(2.0 / 3.0) / 50.0), 6)
        assert calculate_fcs(dqs_list, vals_close) == pytest.approx(expected_fcs, abs=1e-5)

    def test_low_agreement_multi_source(self):
        # Extreme disagreement where sigma > mu
        # e.g., vals = [1.0, 1.0, 100.0]
        # mu = 34.0, var = ((33)^2 + (33)^2 + (66)^2) / 3 = (1089 + 1089 + 4356)/3 = 2178
        # sigma = sqrt(2178) ~ 46.669 > 34.0
        # penalty = max(0.0, 1.0 - 46.669/34) = 0.0
        # FCS = 0.0
        dqs_list = [0.9, 0.9, 0.9]
        vals_disagree = [1.0, 1.0, 100.0]
        assert calculate_fcs(dqs_list, vals_disagree) == 0.0

        # Disagreement where sigma == mu
        # vals = [0.0, 100.0], mu = 50.0, sigma = 50.0 -> penalty = 1.0 - 1.0 = 0.0
        assert calculate_fcs([0.9, 0.9], [0.0, 100.0]) == 0.0

    def test_zero_mean_handling(self):
        # All sensors report zero concentration (perfect agreement at 0.0)
        # penalty should be 1.0
        dqs_list = [0.75, 0.75]
        vals_zero = [0.0, 0.0]
        assert calculate_fcs(dqs_list, vals_zero) == 0.75

        # Mean is zero but sensors disagree (e.g. [-10.0, 10.0])
        # penalty should be 0.0
        vals_opposing = [-10.0, 10.0]
        assert calculate_fcs(dqs_list, vals_opposing) == 0.0

    def test_custom_source_weights(self):
        # DQS = [0.9, 0.5], values identical [50.0, 50.0]
        # weights = [3.0, 1.0] -> weighted DQS = (0.9*3 + 0.5*1)/4 = 3.2/4 = 0.8
        fcs = calculate_fcs(
            dqs_values=[0.9, 0.5],
            values=[50.0, 50.0],
            weights=[3.0, 1.0],
        )
        assert fcs == 0.8

    def test_confidence_level_categorization(self):
        assert get_fcs_confidence_level(0.95) == "HIGH"
        assert get_fcs_confidence_level(0.81) == "HIGH"
        assert get_fcs_confidence_level(0.80) == "MEDIUM"
        assert get_fcs_confidence_level(0.65) == "MEDIUM"
        assert get_fcs_confidence_level(0.51) == "MEDIUM"
        assert get_fcs_confidence_level(0.50) == "LOW"
        assert get_fcs_confidence_level(0.20) == "LOW"
        assert get_fcs_confidence_level(0.0) == "LOW"

    def test_fcs_single_source_nan_and_inf_dqs(self):
        """Single source FCS must return 0.0 when DQS is NaN or Inf, not 1.0."""
        assert calculate_fcs([float("nan")], [10.0]) == 0.0
        assert calculate_fcs([float("inf")], [10.0]) == 0.0
        assert calculate_fcs([-float("inf")], [10.0]) == 0.0

    def test_fcs_multi_source_nan_and_inf_dqs(self):
        """Multi-source FCS with all or mixed NaN/Inf DQS values must not inflate to 1.0."""
        # All NaN DQS -> 0.0
        assert calculate_fcs([float("nan"), float("nan")], [10.0, 10.0]) == 0.0
        assert calculate_fcs([float("inf"), float("nan")], [10.0, 10.0]) == 0.0

        # Mixed: source 0 has NaN DQS (sanitized to 0.0), source 1 has DQS=0.8
        # Weighted DQS = (0.0*1 + 0.8*1)/2 = 0.4. Penalty = 1.0 -> FCS = 0.4
        fcs_mixed = calculate_fcs([float("nan"), 0.8], [10.0, 10.0])
        assert fcs_mixed == pytest.approx(0.4, abs=1e-5)

        # Inf DQS sanitized to 0.0
        fcs_inf_mixed = calculate_fcs([float("inf"), 0.8], [10.0, 10.0])
        assert fcs_inf_mixed == pytest.approx(0.4, abs=1e-5)

    def test_fcs_nan_and_inf_weights(self):
        """Non-finite or invalid weights must be sanitized to 0.0 and never inflate FCS to 1.0."""
        # All weights NaN/Inf -> total_weight == 0.0 -> FCS = 0.0
        assert calculate_fcs([0.8, 0.8], [10.0, 10.0], weights=[float("nan"), float("nan")]) == 0.0
        assert calculate_fcs([0.8, 0.8], [10.0, 10.0], weights=[float("inf"), float("inf")]) == 0.0

        # Mixed weights: NaN weight sanitized to 0.0, remaining weight retains valid source
        # weights = [0.0, 1.0] -> weighted DQS = (0.2*0.0 + 0.2*1.0) / 1.0 = 0.2 -> FCS = 0.2
        fcs_nan_wt = calculate_fcs([0.2, 0.2], [10.0, 10.0], weights=[float("nan"), 1.0])
        assert fcs_nan_wt == pytest.approx(0.2, abs=1e-5)

        # Mixed weights with Inf: Inf sanitized to 0.0
        # weights = [0.0, 1.0] -> weighted DQS = 0.5 -> FCS = 0.5
        fcs_inf_wt = calculate_fcs([0.5, 0.5], [10.0, 10.0], weights=[float("inf"), 1.0])
        assert fcs_inf_wt == pytest.approx(0.5, abs=1e-5)

        # Negative weights sanitized to 0.0
        assert calculate_fcs([0.8, 0.8], [10.0, 10.0], weights=[-1.0, -2.0]) == 0.0
        fcs_neg_wt = calculate_fcs([0.8, 0.4], [10.0, 10.0], weights=[-1.0, 2.0])
        assert fcs_neg_wt == pytest.approx(0.4, abs=1e-5)

    def test_fcs_nan_and_inf_values(self):
        """Values containing NaN or Inf must return FCS = 0.0 (uncomputable/corrupt data)."""
        # Single source with NaN / Inf value
        assert calculate_fcs([0.8], [float("nan")]) == 0.0
        assert calculate_fcs([0.8], [float("inf")]) == 0.0
        assert calculate_fcs([0.8], [-float("inf")]) == 0.0

        # Multi source with NaN value
        assert calculate_fcs([0.8, 0.8], [float("nan"), 10.0]) == 0.0
        assert calculate_fcs([0.8, 0.8], [10.0, float("nan")]) == 0.0
        assert calculate_fcs([0.8, 0.8], [float("nan"), float("nan")]) == 0.0

        # Multi source with Inf value
        assert calculate_fcs([0.8, 0.8], [float("inf"), 10.0]) == 0.0
        assert calculate_fcs([0.8, 0.8], [10.0, -float("inf")]) == 0.0
        assert calculate_fcs([0.8, 0.8], [float("inf"), float("inf")]) == 0.0

    def test_fcs_never_returns_nan_or_out_of_bounds(self):
        """FCS must never return NaN, Inf, or values outside [0.0, 1.0] under hostile combinations."""
        hostile_dqs = [float("nan"), float("inf"), -1.0, 2.0, 0.5]
        hostile_vals = [float("nan"), 1e12, -1e12, float("inf"), 0.0]
        hostile_w = [float("nan"), float("inf"), -5.0, 0.0, 1.0]

        res = calculate_fcs(hostile_dqs, hostile_vals, weights=hostile_w)
        assert isinstance(res, float)
        assert not math.isnan(res)
        assert not math.isinf(res)
        assert 0.0 <= res <= 1.0
