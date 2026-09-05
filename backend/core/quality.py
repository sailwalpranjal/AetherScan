"""
Data Quality Engine for AetherScan.

Implements mathematical models for:
1. Data Quality Score (DQS):
   DQS = Q_fresh * Q_spatial * Q_sensor * Q_valid
   where DQS in [0.0, 1.0].

2. Fusion Confidence Score (FCS):
   FCS = [sum(DQS_i * w_i) / sum(w_i)] * max(0.0, 1.0 - sigma / mu)
   where sigma is standard deviation, mu is mean of values, and w_i are source weights.

Zero-fake-data and zero-cost compliant.
"""

from datetime import datetime, timezone
import math
from typing import Dict, List, Optional, Tuple, Union


# Physical bounds for environmental and atmospheric parameters
# Concentrations in ug/m3 unless otherwise specified (CO in mg/m3)
PHYSICAL_BOUNDS: Dict[str, Tuple[float, float]] = {
    "aqi": (0.0, 500.0),
    "pm25": (0.0, 1000.0),
    "pm2.5": (0.0, 1000.0),
    "pm_25": (0.0, 1000.0),
    "pm10": (0.0, 1500.0),
    "pm_10": (0.0, 1500.0),
    "no2": (0.0, 1000.0),
    "no_2": (0.0, 1000.0),
    "so2": (0.0, 1000.0),
    "so_2": (0.0, 1000.0),
    "o3": (0.0, 1000.0),
    "ozone": (0.0, 1000.0),
    "co": (0.0, 100.0),
    # NASA FIRMS / Satellite parameters
    "brightness": (200.0, 600.0),     # VIIRS/MODIS brightness temp (Kelvin)
    "bright_ti4": (200.0, 600.0),
    "bright_ti5": (200.0, 500.0),
    "frp": (0.0, 15000.0),            # Fire Radiative Power (MW)
    "confidence": (0.0, 100.0),       # Detection confidence percentage [0, 100]
    # Meteorological parameters
    "temperature": (-100.0, 70.0),    # Celsius
    "humidity": (0.0, 100.0),         # Relative humidity percentage [0, 100]
    "pressure": (300.0, 1100.0),      # Atmospheric pressure (hPa)
    "wind_speed": (0.0, 150.0),       # Wind speed (m/s)
}


def _normalize_datetime(dt: Union[datetime, str, float, int]) -> Optional[datetime]:
    """
    Safely parse and convert datetime / ISO string / unix timestamp to a UTC-aware datetime.
    Returns None if parsing fails.
    """
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    if isinstance(dt, (int, float)):
        try:
            return datetime.fromtimestamp(float(dt), tz=timezone.utc)
        except (ValueError, OSError, OverflowError):
            return None

    if isinstance(dt, str):
        cleaned = dt.strip()
        if not cleaned:
            return None

        # Convert trailing 'Z' or 'z' to '+00:00' for ISO compatibility
        if cleaned.endswith("Z") or cleaned.endswith("z"):
            cleaned = cleaned[:-1] + "+00:00"

        try:
            parsed = datetime.fromisoformat(cleaned)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except ValueError:
            pass

        # Fallback formats
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%d",
            "%Y/%m/%d %H:%M:%S",
            "%Y/%m/%d",
        ]
        for fmt in formats:
            try:
                parsed = datetime.strptime(cleaned, fmt)
                return parsed.replace(tzinfo=timezone.utc)
            except ValueError:
                continue

    return None


def calculate_freshness(
    timestamp: Union[datetime, str, float, int],
    ref_time: Optional[Union[datetime, str, float, int]] = None,
    decay_lambda: float = 0.1,
) -> float:
    """
    Calculate freshness score Q_fresh in [0.0, 1.0].

    Formula:
    - If dt < 1 hour: Q_fresh = 1.0
    - If 1 hour <= dt <= 24 hours: Q_fresh = exp(-decay_lambda * dt) (default lambda = 0.1)
    - If dt > 24 hours: Q_fresh = 0.0 (Stale data)

    Future timestamps (e.g. clock skew <= 5 minutes) are treated as dt = 0.0 (Q_fresh = 1.0).
    Timestamps farther in the future (> 5 mins) are considered invalid (Q_fresh = 0.0).
    """
    t_norm = _normalize_datetime(timestamp)
    if t_norm is None:
        return 0.0

    r_norm: Optional[datetime] = None
    if ref_time is None:
        r_norm = datetime.now(timezone.utc)
    else:
        r_norm = _normalize_datetime(ref_time)
        if r_norm is None:
            return 0.0

    delta_seconds = (r_norm - t_norm).total_seconds()
    dt_hours = delta_seconds / 3600.0

    if dt_hours < 0.0:
        # Clock skew tolerance: skew <= 5 minutes treated as dt = 0
        skew_minutes = -delta_seconds / 60.0
        if skew_minutes <= 5.0:
            dt_hours = 0.0
        else:
            # Future timestamp anomaly
            return 0.0

    # Validate decay_lambda: fallback to default 0.1 if invalid, non-finite, or <= 0.0
    try:
        lam = float(decay_lambda)
        if not math.isfinite(lam) or lam <= 0.0:
            lam = 0.1
    except (TypeError, ValueError):
        lam = 0.1

    if dt_hours < 1.0:
        q_fresh = 1.0
    elif dt_hours <= 24.0:
        try:
            q_fresh = math.exp(-lam * dt_hours)
        except OverflowError:
            q_fresh = 0.0
    else:
        q_fresh = 0.0

    if not math.isfinite(q_fresh):
        q_fresh = 0.0

    return round(max(0.0, min(1.0, float(q_fresh))), 6)


def calculate_spatial_representativeness(
    distance_km: float,
    is_satellite: bool = False,
) -> float:
    """
    Calculate spatial representativeness score Q_spatial in [0.1, 1.0].

    - Ground sensors: linear decay from 1.0 at 0 km to 0.1 at 50 km:
      Q_spatial = max(0.1, 1.0 - 0.9 * (d / 50.0))
    - Satellite pixel covering target coordinates: 0.90
    """
    if is_satellite:
        return 0.9

    try:
        d = float(distance_km)
    except (TypeError, ValueError):
        return 0.1

    if math.isnan(d) or math.isinf(d):
        return 0.1

    d = max(0.0, d)

    if d >= 50.0:
        return 0.1

    q_spatial = 1.0 - 0.9 * (d / 50.0)
    return round(max(0.1, min(1.0, float(q_spatial))), 6)


def calculate_sensor_reliability(
    sensor_type: str,
    is_cloud_free: bool = True,
) -> float:
    """
    Calculate sensor reliability score Q_sensor in [0.3, 1.0].

    - Government / reference grade (CPCB, EPA): 1.0
    - Low-cost / uncalibrated sensors: 0.6
    - Satellite retrieval (cloud-free): 0.85
    - Satellite retrieval (cloud-contaminated): 0.30
    """
    if not isinstance(sensor_type, str):
        return 0.6

    st = sensor_type.lower().strip().replace("-", "_").replace(" ", "_")

    # Satellite sensor check
    if any(sat in st for sat in ("sat", "viirs", "modis", "sentinel", "landsat", "goes")):
        return 0.85 if is_cloud_free else 0.30

    # Government / Reference grade check
    if any(ref in st for ref in ("ref", "cpcb", "epa", "gov", "regulatory", "caaqms", "grade_a")):
        return 1.0

    # Low-cost / Uncalibrated check
    if any(low in st for low in ("low", "uncal", "purple", "citizen", "indicative", "pms")):
        return 0.6

    # Default fallback for ground sensor
    return 0.6


def validate_value(parameter: str, value: float) -> float:
    """
    Validate physical boundaries for an observation value.
    Returns 1.0 if physically possible, 0.0 if impossible (e.g. negative concentration).
    """
    if value is None:
        return 0.0

    try:
        val = float(value)
    except (TypeError, ValueError):
        return 0.0

    if math.isnan(val) or math.isinf(val):
        return 0.0

    if not isinstance(parameter, str):
        return 1.0 if val >= 0.0 else 0.0

    param_key = parameter.lower().strip().replace("-", "_")
    param_clean = param_key.replace(".", "")

    bounds = PHYSICAL_BOUNDS.get(param_key) or PHYSICAL_BOUNDS.get(param_clean)

    if bounds is not None:
        min_bound, max_bound = bounds
        if min_bound <= val <= max_bound:
            return 1.0
        return 0.0

    # General environmental concentration fallback: must be non-negative
    return 1.0 if val >= 0.0 else 0.0


def calculate_dqs(
    value: float,
    parameter: str,
    timestamp: Union[datetime, str, float, int],
    distance_km: float = 0.0,
    sensor_type: str = "reference",
    is_satellite: bool = False,
    is_cloud_free: bool = True,
    ref_time: Optional[Union[datetime, str, float, int]] = None,
) -> float:
    """
    Calculate Data Quality Score (DQS) in [0.0, 1.0]:
    DQS = Q_fresh * Q_spatial * Q_sensor * Q_valid

    If value is physically invalid or data is stale (> 24h), returns 0.0.
    """
    q_valid = validate_value(parameter, value)
    if q_valid == 0.0:
        return 0.0

    q_fresh = calculate_freshness(timestamp, ref_time=ref_time)
    if q_fresh == 0.0:
        return 0.0

    q_spatial = calculate_spatial_representativeness(distance_km, is_satellite=is_satellite)
    q_sensor = calculate_sensor_reliability(sensor_type, is_cloud_free=is_cloud_free)

    dqs = q_fresh * q_spatial * q_sensor * q_valid
    return round(max(0.0, min(1.0, float(dqs))), 6)


def get_dqs_breakdown(
    value: float,
    parameter: str,
    timestamp: Union[datetime, str, float, int],
    distance_km: float = 0.0,
    sensor_type: str = "reference",
    is_satellite: bool = False,
    is_cloud_free: bool = True,
    ref_time: Optional[Union[datetime, str, float, int]] = None,
) -> Dict[str, float]:
    """
    Return comprehensive sub-indices breakdown along with final DQS.
    Useful for UI evidence chains and audit logs.
    """
    q_valid = validate_value(parameter, value)
    q_fresh = calculate_freshness(timestamp, ref_time=ref_time)
    q_spatial = calculate_spatial_representativeness(distance_km, is_satellite=is_satellite)
    q_sensor = calculate_sensor_reliability(sensor_type, is_cloud_free=is_cloud_free)

    dqs = q_fresh * q_spatial * q_sensor * q_valid
    dqs_clamped = round(max(0.0, min(1.0, float(dqs))), 6)

    return {
        "dqs": dqs_clamped,
        "q_fresh": q_fresh,
        "q_spatial": q_spatial,
        "q_sensor": q_sensor,
        "q_valid": q_valid,
    }


def calculate_fcs(
    dqs_values: List[float],
    values: List[float],
    weights: Optional[List[float]] = None,
) -> float:
    """
    Calculate Fusion Confidence Score (FCS) in [0.0, 1.0]:
    FCS = [sum(DQS_i * w_i) / sum(w_i)] * max(0.0, 1.0 - sigma / mu)

    - Single source: N=1 -> sigma=0, FCS = DQS_1.
    - Disagreement: penalized by coefficient of variation (sigma / mu).
    - If mu == 0 and all values are 0, penalty factor is 1.0; otherwise 0.0.
    - Clamped strictly to [0.0, 1.0].
    - Corrupt, NaN, or non-finite inputs return 0.0.
    """
    if not dqs_values or not values:
        return 0.0

    if len(dqs_values) != len(values):
        raise ValueError(
            f"dqs_values and values must have the same length (got {len(dqs_values)} and {len(values)})"
        )

    n = len(values)

    if weights is not None and len(weights) != n:
        raise ValueError(
            f"weights and values must have the same length (got {len(weights)} and {n})"
        )

    # 1. Sanitize dqs_values: ensure finite, clamped [0.0, 1.0]; non-finite/invalid -> 0.0
    clean_dqs: List[float] = []
    for d in dqs_values:
        try:
            val_d = float(d)
            if not math.isfinite(val_d):
                clean_dqs.append(0.0)
            else:
                clean_dqs.append(max(0.0, min(1.0, val_d)))
        except (TypeError, ValueError):
            clean_dqs.append(0.0)

    # 2. Sanitize values: if any observation is non-finite or uncomputable, abort to 0.0
    clean_vals: List[float] = []
    for v in values:
        try:
            val_v = float(v)
            if not math.isfinite(val_v):
                return 0.0
            clean_vals.append(val_v)
        except (TypeError, ValueError):
            return 0.0

    # 3. Sanitize weights: non-finite or negative weights treated as 0.0
    clean_weights: List[float] = []
    if weights is None:
        clean_weights = [1.0] * n
    else:
        for wt in weights:
            try:
                val_w = float(wt)
                if not math.isfinite(val_w) or val_w <= 0.0:
                    clean_weights.append(0.0)
                else:
                    clean_weights.append(val_w)
            except (TypeError, ValueError):
                clean_weights.append(0.0)

    total_weight = sum(clean_weights)
    if not math.isfinite(total_weight) or total_weight <= 0.0:
        return 0.0

    weighted_dqs = sum(d * wt for d, wt in zip(clean_dqs, clean_weights)) / total_weight
    if not math.isfinite(weighted_dqs) or weighted_dqs <= 0.0:
        return 0.0
    weighted_dqs = min(1.0, weighted_dqs)

    # Single source
    if n == 1:
        if not math.isfinite(clean_dqs[0]) or clean_dqs[0] <= 0.0:
            return 0.0
        return round(min(1.0, clean_dqs[0]), 6)

    # Multi-source dispersion
    mu = sum(clean_vals) / n
    if not math.isfinite(mu):
        return 0.0

    if abs(mu) < 1e-12:
        if all(abs(v) < 1e-12 for v in clean_vals):
            penalty = 1.0
        else:
            penalty = 0.0
    else:
        variance = sum((v - mu) ** 2 for v in clean_vals) / n
        if not math.isfinite(variance) or variance < 0.0:
            return 0.0
        sigma = math.sqrt(variance)
        if not math.isfinite(sigma):
            return 0.0
        ratio = sigma / abs(mu)
        if not math.isfinite(ratio):
            penalty = 0.0
        else:
            penalty = max(0.0, 1.0 - ratio)

    if not math.isfinite(penalty) or penalty <= 0.0:
        return 0.0

    fcs = weighted_dqs * min(1.0, penalty)
    if not math.isfinite(fcs) or fcs <= 0.0:
        return 0.0

    return round(min(1.0, fcs), 6)


def get_fcs_confidence_level(fcs: float) -> str:
    """
    Categorize FCS into UI confidence tiers:
    - FCS > 0.8: 'HIGH' (Solid green indicator)
    - 0.5 < FCS <= 0.8: 'MEDIUM' (Yellow indicator)
    - FCS <= 0.5: 'LOW' (Red indicator, data disagreement warning)
    """
    if fcs > 0.8:
        return "HIGH"
    elif fcs > 0.5:
        return "MEDIUM"
    else:
        return "LOW"
