"""
backend/services/facility_intelligence.py

Core service for the AetherScan Environmental Evidence Chain.
Provides:
- WGS-84 pure spherical Haversine geodesic distance with domain clamping and pole guards.
- Geodetic bounding box calculation with polar and antimeridian protections.
- Two-phase spatial discovery (SQL bounding box pre-filter + spherical Haversine post-filter)
  for OpenAQ monitoring stations and NASA FIRMS active fire hotspots.
- Parameter-grouped latest physical measurement retrieval with dynamic distance-decay DQS.
- Observation-level Data Quality Score (DQS) sub-indices decomposition.
- Multi-sensor Fusion Confidence Score (FCS) mathematical aggregation.
- Strict Zero-Fake-Data empty states and explicit data availability flags.
- Complete backward compatibility with legacy callers and MockDB test fixtures.
"""

import logging
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)

# WGS-84 volumetric mean Earth radius in kilometers (IUGG recommended)
EARTH_RADIUS_KM: float = 6371.0088


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the great-circle distance in kilometers between two geographic coordinates
    on Earth using the spherical Haversine formula and WGS-84 volumetric mean radius (6371.0088 km).

    Parameters:
        lat1 (float): Latitude of point 1 in decimal degrees [-90.0, 90.0].
        lon1 (float): Longitude of point 1 in decimal degrees [-180.0, 180.0].
        lat2 (float): Latitude of point 2 in decimal degrees [-90.0, 90.0].
        lon2 (float): Longitude of point 2 in decimal degrees [-180.0, 180.0].

    Returns:
        float: Spherical great-circle distance in kilometers.

    Raises:
        ValueError: If any coordinate is NaN or outside valid physical ranges.
    """
    # 1. Coordinate range and physical validity checks
    if math.isnan(lat1) or math.isnan(lon1) or math.isnan(lat2) or math.isnan(lon2):
        raise ValueError("Coordinates cannot be NaN.")
    if not (-90.0 <= lat1 <= 90.0 and -90.0 <= lat2 <= 90.0):
        raise ValueError(f"Latitude out of valid range [-90.0, 90.0]: lat1={lat1}, lat2={lat2}")
    if not (-180.0 <= lon1 <= 180.0 and -180.0 <= lon2 <= 180.0):
        raise ValueError(f"Longitude out of valid range [-180.0, 180.0]: lon1={lon1}, lon2={lon2}")

    # 2. Fast-path exact identity
    if lat1 == lat2 and lon1 == lon2:
        return 0.0

    # 3. Fast-path degenerate poles (identical physical point regardless of longitude)
    if (lat1 == 90.0 and lat2 == 90.0) or (lat1 == -90.0 and lat2 == -90.0):
        return 0.0

    # 4. Spherical Haversine calculation
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )

    # 5. Numerical precision clamping to [0.0, 1.0]
    # Prevents math domain error in asin() or atan2() for antipodal points
    # caused by IEEE-754 double precision roundoff (e.g. a = 1.0000000000000002)
    a_clamped = max(0.0, min(1.0, a))

    return 2.0 * EARTH_RADIUS_KM * math.asin(math.sqrt(a_clamped))


class FacilityIntelligenceService:
    """
    Core service for the AetherScan Environmental Evidence Chain.
    Coordinates spatial discovery, ground sensor fusion, thermal anomalies,
    and regulatory compliance around industrial facilities.
    """

    def __init__(self, db_manager=None):
        if db_manager is not None:
            self.db = db_manager
        else:
            try:
                from db.database import db_manager as default_db
            except ImportError:
                try:
                    from backend.db.database import db_manager as default_db
                except ImportError:
                    default_db = None
            self.db = default_db

    async def _fetch_one_safe(self, query: str, params: Union[dict, tuple] = ()) -> Optional[Dict[str, Any]]:
        """
        Execute a query and fetch a single row, supporting DatabaseManager,
        aiosqlite, SQLAlchemy AsyncSession, and legacy MockDB.
        Always returns a standard Python dict or None.
        """
        if hasattr(self.db, "fetch_one"):
            row = await self.db.fetch_one(query, params)
            if row is not None:
                if hasattr(row, "_mapping"):
                    return dict(row._mapping)
                return dict(row) if hasattr(row, "keys") else row
            return None
        elif hasattr(self.db, "execute"):
            from sqlalchemy import text
            res = await self.db.execute(text(query), params)
            if hasattr(res, "fetchone"):
                row = res.fetchone()
                if row is not None:
                    if hasattr(row, "_mapping"):
                        return dict(row._mapping)
                    return dict(row) if hasattr(row, "keys") else row
        return None

    async def _fetch_all_safe(self, query: str, params: Union[dict, tuple] = ()) -> List[Dict[str, Any]]:
        """
        Execute a query and fetch all rows, supporting DatabaseManager,
        aiosqlite, SQLAlchemy AsyncSession, and legacy MockDB.
        Always returns a list of standard Python dicts.
        """
        if hasattr(self.db, "fetch_all"):
            rows = await self.db.fetch_all(query, params)
            return [
                dict(r._mapping) if hasattr(r, "_mapping") else dict(r) if hasattr(r, "keys") else r
                for r in rows
            ]
        elif hasattr(self.db, "execute"):
            from sqlalchemy import text
            res = await self.db.execute(text(query), params)
            if hasattr(res, "fetchall"):
                rows = res.fetchall()
                return [
                    dict(r._mapping) if hasattr(r, "_mapping") else dict(r) if hasattr(r, "keys") else r
                    for r in rows
                ]
        return []

    async def _fetch_facility(self, facility_id: Union[str, int]) -> Optional[Dict[str, Any]]:
        """Fetch facility row by ID, handling string/int type conversions and MockDB."""
        row = await self._fetch_one_safe(
            "SELECT * FROM industries WHERE id = :id", {"id": facility_id}
        )
        if row is None and isinstance(facility_id, str) and facility_id.isdigit():
            row = await self._fetch_one_safe(
                "SELECT * FROM industries WHERE id = :id", {"id": int(facility_id)}
            )
        if row is not None:
            return dict(row)
        return None

    def generate_bounding_box(
        self, lat: float, lon: float, radius_km: float = 10.0
    ) -> Dict[str, Any]:
        """
        Generate a bounding box around a coordinate based on a radius in kilometers.
        Preserves 111.0 km/degree latitude scaling for backward compatibility.
        Guarantees coverage without pole division-by-zero errors.
        """
        lat_delta = radius_km / 111.0
        min_lat = max(-90.0, lat - lat_delta)
        max_lat = min(90.0, lat + lat_delta)

        cos_lat = math.cos(math.radians(lat))
        if abs(cos_lat) < 1e-6:
            lon_delta = 180.0
        else:
            lon_delta = min(180.0, radius_km / (111.0 * cos_lat))

        min_lon = lon - lon_delta
        max_lon = lon + lon_delta

        crosses_dateline = (min_lon < -180.0 or max_lon > 180.0)

        return {
            "min_lat": min_lat,
            "max_lat": max_lat,
            "min_lon": min_lon,
            "max_lon": max_lon,
            "crosses_dateline": crosses_dateline,
        }

    async def get_openaq_stations_within_radius(
        self, lat: float, lon: float, radius_km: float = 10.0
    ) -> List[Dict[str, Any]]:
        """
        Two-phase spatial discovery for OpenAQ monitoring stations:
        1. SQL bounding box pre-filter.
        2. Exact spherical Haversine distance post-filter (d <= radius_km).
        Returns stations sorted by distance_km ascending.
        """
        bbox = self.generate_bounding_box(lat, lon, radius_km)

        if bbox.get("crosses_dateline"):
            query = """
                SELECT station_id, name, latitude, longitude, city, country, last_updated, parameters
                FROM openaq_stations
                WHERE latitude BETWEEN :min_lat AND :max_lat
                  AND latitude IS NOT NULL
                  AND longitude IS NOT NULL
            """
            params = {"min_lat": bbox["min_lat"], "max_lat": bbox["max_lat"]}
        else:
            query = """
                SELECT station_id, name, latitude, longitude, city, country, last_updated, parameters
                FROM openaq_stations
                WHERE latitude BETWEEN :min_lat AND :max_lat
                  AND longitude BETWEEN :min_lon AND :max_lon
                  AND latitude IS NOT NULL
                  AND longitude IS NOT NULL
            """
            params = {
                "min_lat": bbox["min_lat"],
                "max_lat": bbox["max_lat"],
                "min_lon": bbox["min_lon"],
                "max_lon": bbox["max_lon"],
            }

        rows = await self._fetch_all_safe(query, params)
        if not rows:
            return []

        stations = []
        for r in rows:
            try:
                st_lat = float(r["latitude"])
                st_lon = float(r["longitude"])
            except (TypeError, ValueError, KeyError):
                continue

            dist = haversine_distance(lat, lon, st_lat, st_lon)
            if dist <= radius_km:
                stations.append({
                    "station_id": str(r["station_id"]),
                    "name": r.get("name") or f"Station {r['station_id']}",
                    "latitude": st_lat,
                    "longitude": st_lon,
                    "distance_km": round(dist, 3),
                    "city": r.get("city") or "",
                    "country": r.get("country") or "IN",
                    "last_updated": r.get("last_updated") or "",
                    "parameters": {},
                })

        stations.sort(key=lambda s: s["distance_km"])
        return stations

    async def get_latest_measurements_for_stations(
        self,
        stations: List[Dict[str, Any]],
        ref_time: Optional[Union[datetime, str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves latest measurements grouped by parameter for each station,
        recomputing DQS and DQS breakdown relative to station distance from the facility.
        """
        if not stations:
            return []

        try:
            from core.quality import calculate_dqs, get_dqs_breakdown
        except ImportError:
            from backend.core.quality import calculate_dqs, get_dqs_breakdown

        st_map = {s["station_id"]: s for s in stations}
        placeholders = ", ".join([f":s_{i}" for i in range(len(stations))])
        params = {f"s_{i}": s["station_id"] for i, s in enumerate(stations)}

        query = f"""
            SELECT station_id, parameter, value, unit, timestamp, dqs
            FROM openaq_measurements
            WHERE station_id IN ({placeholders})
            ORDER BY timestamp DESC, id DESC
        """
        rows = await self._fetch_all_safe(query, params)

        station_params: Dict[str, Dict[str, Any]] = {s["station_id"]: {} for s in stations}

        for r in rows:
            st_id = str(r["station_id"])
            if st_id not in station_params:
                continue

            raw_param = str(r.get("parameter") or "").lower().strip().replace("-", "_").replace(".", "")
            if raw_param in ("pm25", "pm_25"):
                p_name = "pm25"
            elif raw_param in ("pm10", "pm_10"):
                p_name = "pm10"
            elif raw_param in ("no2", "no_2"):
                p_name = "no2"
            elif raw_param in ("so2", "so_2"):
                p_name = "so2"
            elif raw_param in ("o3", "ozone"):
                p_name = "o3"
            elif raw_param in ("co",):
                p_name = "co"
            else:
                p_name = raw_param

            if not p_name:
                continue

            # First encountered row per parameter is the latest observation
            if p_name not in station_params[st_id]:
                try:
                    val = float(r["value"])
                except (TypeError, ValueError):
                    continue

                unit = str(r.get("unit") or "ug/m3")
                ts = str(r.get("timestamp") or "")
                dist = st_map[st_id]["distance_km"]

                dqs_val = calculate_dqs(
                    value=val,
                    parameter=p_name,
                    timestamp=ts,
                    distance_km=dist,
                    sensor_type="reference",
                    is_satellite=False,
                    ref_time=ref_time,
                )
                breakdown = get_dqs_breakdown(
                    value=val,
                    parameter=p_name,
                    timestamp=ts,
                    distance_km=dist,
                    sensor_type="reference",
                    is_satellite=False,
                    ref_time=ref_time,
                )

                station_params[st_id][p_name] = {
                    "value": val,
                    "unit": unit,
                    "timestamp": ts,
                    "dqs": dqs_val,
                    "dqs_breakdown": {
                        "freshness": breakdown["q_fresh"],
                        "spatial": breakdown["q_spatial"],
                        "sensor": breakdown["q_sensor"],
                        "validity": breakdown["q_valid"],
                        "q_fresh": breakdown["q_fresh"],
                        "q_spatial": breakdown["q_spatial"],
                        "q_sensor": breakdown["q_sensor"],
                        "q_valid": breakdown["q_valid"],
                    },
                }

        results = []
        for s in stations:
            st_copy = dict(s)
            st_copy["parameters"] = station_params.get(s["station_id"], {})
            results.append(st_copy)

        return results

    async def get_firms_fires_within_radius(
        self,
        lat: float,
        lon: float,
        radius_km: float = 10.0,
        ref_time: Optional[Union[datetime, str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Two-phase spatial discovery for NASA FIRMS active fire hotspots:
        1. SQL bounding box pre-filter.
        2. Exact spherical Haversine distance post-filter (d <= radius_km).
        Computes observation-level DQS for thermal anomalies.
        Returns fire events sorted by distance_km ascending.
        """
        bbox = self.generate_bounding_box(lat, lon, radius_km)

        if bbox.get("crosses_dateline"):
            query = """
                SELECT id, latitude, longitude, brightness, scan, track,
                       acq_date, acq_time, satellite, confidence, frp, dqs
                FROM nasa_firms_fires
                WHERE latitude BETWEEN :min_lat AND :max_lat
                  AND latitude IS NOT NULL
                  AND longitude IS NOT NULL
            """
            params = {"min_lat": bbox["min_lat"], "max_lat": bbox["max_lat"]}
        else:
            query = """
                SELECT id, latitude, longitude, brightness, scan, track,
                       acq_date, acq_time, satellite, confidence, frp, dqs
                FROM nasa_firms_fires
                WHERE latitude BETWEEN :min_lat AND :max_lat
                  AND longitude BETWEEN :min_lon AND :max_lon
                  AND latitude IS NOT NULL
                  AND longitude IS NOT NULL
            """
            params = {
                "min_lat": bbox["min_lat"],
                "max_lat": bbox["max_lat"],
                "min_lon": bbox["min_lon"],
                "max_lon": bbox["max_lon"],
            }

        rows = await self._fetch_all_safe(query, params)
        if not rows:
            return []

        try:
            from core.quality import calculate_dqs
        except ImportError:
            from backend.core.quality import calculate_dqs

        fire_events = []
        for r in rows:
            try:
                fire_lat = float(r["latitude"])
                fire_lon = float(r["longitude"])
                brightness = float(r["brightness"])
            except (TypeError, ValueError, KeyError):
                continue

            dist = haversine_distance(lat, lon, fire_lat, fire_lon)
            if dist <= radius_km:
                acq_date = str(r.get("acq_date") or "").strip().replace("/", "-")
                raw_acq_time = str(r.get("acq_time") or "").strip()
                acq_time = raw_acq_time.zfill(4)[:4] if raw_acq_time else "0000"

                if acq_date and len(acq_time) == 4:
                    timestamp = f"{acq_date}T{acq_time[:2]}:{acq_time[2:]}:00Z"
                else:
                    timestamp = acq_date or datetime.now(timezone.utc).isoformat()

                dqs_val = calculate_dqs(
                    value=brightness,
                    parameter="brightness",
                    timestamp=timestamp,
                    distance_km=dist,
                    sensor_type="satellite",
                    is_satellite=True,
                    is_cloud_free=True,
                    ref_time=ref_time,
                )

                fire_events.append({
                    "id": r["id"],
                    "latitude": fire_lat,
                    "longitude": fire_lon,
                    "distance_km": round(dist, 3),
                    "brightness": brightness,
                    "scan": float(r.get("scan") or 1.0),
                    "track": float(r.get("track") or 1.0),
                    "acq_date": acq_date,
                    "acq_time": acq_time,
                    "satellite": str(r.get("satellite") or "VIIRS"),
                    "confidence": str(r.get("confidence") or "nominal"),
                    "frp": float(r.get("frp") or 0.0),
                    "dqs": dqs_val,
                })

        fire_events.sort(key=lambda f: f["distance_km"])
        return fire_events

    def _determine_dominant_pollutant(self, ground_sensors: List[Dict[str, Any]]) -> Optional[str]:
        """Determine dominant pollutant prioritizing PM2.5, then PM10, then most frequent."""
        param_counts: Dict[str, int] = {}
        for st in ground_sensors:
            for p_name in st.get("parameters", {}):
                param_counts[p_name] = param_counts.get(p_name, 0) + 1

        if "pm25" in param_counts:
            return "pm25"
        elif "pm10" in param_counts:
            return "pm10"
        elif param_counts:
            return max(param_counts.items(), key=lambda x: x[1])[0]
        return None

    def _calculate_ambient_quality(
        self,
        ground_sensors: List[Dict[str, Any]],
        fire_events: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Calculates multi-sensor Fusion Confidence Score (FCS) across ambient observations.
        If ground sensors exist, evaluates FCS on the dominant pollutant across stations.
        If no ground sensors exist but fire events exist, evaluates FCS across thermal anomalies.
        """
        try:
            from core.quality import calculate_fcs, get_fcs_confidence_level
        except ImportError:
            from backend.core.quality import calculate_fcs, get_fcs_confidence_level

        dominant_pollutant = self._determine_dominant_pollutant(ground_sensors)

        dqs_values: List[float] = []
        observed_values: List[float] = []
        weights: List[float] = []

        if dominant_pollutant:
            # Gather observations of dominant pollutant across all ground sensors
            for st in ground_sensors:
                p_data = st.get("parameters", {}).get(dominant_pollutant)
                if p_data and "dqs" in p_data and "value" in p_data:
                    dqs_values.append(float(p_data["dqs"]))
                    observed_values.append(float(p_data["value"]))
                    weights.append(1.0)
        elif fire_events:
            dominant_pollutant = "brightness"
            for fire in fire_events:
                if "dqs" in fire and "brightness" in fire:
                    dqs_values.append(float(fire["dqs"]))
                    observed_values.append(float(fire["brightness"]))
                    weights.append(0.8)

        if not dqs_values:
            return {
                "fcs": 0.0,
                "fcs_confidence": "INSUFFICIENT_DATA",
                "dominant_pollutant": None,
                "observations_count": 0,
            }

        fcs = calculate_fcs(dqs_values, observed_values, weights)
        fcs_confidence = get_fcs_confidence_level(fcs)

        return {
            "fcs": fcs,
            "fcs_confidence": fcs_confidence,
            "dominant_pollutant": dominant_pollutant,
            "observations_count": len(observed_values),
        }

    def _build_regulatory_summary(self, ground_sensors: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Assembles regulatory compliance evaluation for ground sensor observations.
        Seamlessly integrates with Milestone 2 regulatory engine if present.
        """
        measurements = []
        for st in ground_sensors:
            for p_name, p_data in st.get("parameters", {}).items():
                measurements.append({
                    "pollutant": p_name,
                    "value": float(p_data.get("value", 0.0)),
                    "unit": str(p_data.get("unit", "ug/m3")),
                    "station_id": st.get("station_id"),
                })

        if not measurements:
            return {
                "overall_status": "no_data",
                "exceedances": [],
                "details": [],
            }

        # Attempt to use M2 calculate_exceedance_ratios if available
        try:
            try:
                from core.regulatory import calculate_exceedance_ratios
            except ImportError:
                from backend.core.regulatory import calculate_exceedance_ratios

            exceedances = calculate_exceedance_ratios(measurements)
            has_exceedance = any(e.get("exceedance_ratio", 0.0) > 1.0 for e in exceedances)
            return {
                "overall_status": "exceeded" if has_exceedance else "compliant",
                "exceedances": exceedances,
                "details": exceedances,
            }
        except (ImportError, AttributeError):
            pass

        # Fallback to standard check_compliance
        try:
            try:
                from core.regulatory import check_compliance
            except ImportError:
                from backend.core.regulatory import check_compliance
        except ImportError:
            check_compliance = None

        exceedances = []
        details = []
        has_exceedance = False

        for m in measurements:
            if check_compliance:
                res = check_compliance(m["pollutant"], m["value"], m["unit"])
                if res.get("status") == "exceeded":
                    has_exceedance = True
                    for det in res.get("details", []):
                        limit = float(det.get("limit", 1.0))
                        exceedance_ratio = round(m["value"] / max(limit, 1e-6), 2)
                        item = {
                            "pollutant": m["pollutant"],
                            "observed_value": m["value"],
                            "unit": m["unit"],
                            "standard_value": limit,
                            "exceedance_ratio": exceedance_ratio,
                            "standard_id": f"IN_CPCB_{m['pollutant'].upper()}_24H",
                            "authority": det.get("authority", "CPCB"),
                            "averaging_period": "24h",
                        }
                        exceedances.append(item)
                        details.append(det)

        return {
            "overall_status": "exceeded" if has_exceedance else "compliant",
            "exceedances": exceedances,
            "details": details,
        }

    def _build_thermal_correlation(
        self,
        fire_events: List[Dict[str, Any]],
        ground_sensors: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Evaluates observational correlation between FIRMS fires and ambient PM levels.
        Seamlessly integrates with Milestone 2 analyze_thermal_correlation if present.
        Strictly includes non-causality disclaimer.
        """
        # Attempt to use M2 analyze_thermal_correlation if available
        try:
            try:
                from core.regulatory import analyze_thermal_correlation
            except ImportError:
                from backend.core.regulatory import analyze_thermal_correlation

            all_measurements = []
            for st in ground_sensors:
                for p_name, p_data in st.get("parameters", {}).items():
                    all_measurements.append({
                        "pollutant": p_name,
                        "value": float(p_data.get("value", 0.0)),
                    })
            return analyze_thermal_correlation(fire_events, all_measurements)
        except (ImportError, AttributeError):
            pass

        # Robust baseline evaluation
        fire_count = len(fire_events)
        max_brightness = max((float(f.get("brightness", 0.0)) for f in fire_events), default=0.0)

        elevated_pm = False
        for st in ground_sensors:
            for p_name, p_data in st.get("parameters", {}).items():
                val = float(p_data.get("value", 0.0))
                if p_name == "pm25" and val > 60.0:
                    elevated_pm = True
                elif p_name == "pm10" and val > 100.0:
                    elevated_pm = True

        if fire_count == 0 and len(ground_sensors) == 0:
            state = "DATA_UNAVAILABLE"
            desc = "Insufficient ground sensor or thermal anomaly data within the specified radius."
        elif fire_count > 0 and elevated_pm:
            state = "CONCURRENT_THERMAL_AND_PM_ANOMALY"
            desc = f"Detected {fire_count} active thermal anomalies concurrently with elevated particulate matter in ambient radius."
        elif fire_count > 0:
            state = "THERMAL_ANOMALY_ONLY"
            desc = f"Detected {fire_count} active thermal anomalies; ambient particulate levels remain within standard limits or unmonitored."
        elif elevated_pm:
            state = "ELEVATED_PM_ONLY"
            desc = "Elevated particulate matter detected by ground stations without concurrent thermal anomalies."
        else:
            state = "NORMAL_CONDITIONS"
            desc = "Ground air quality observations and thermal observations are within nominal baseline ranges."

        return {
            "state": state,
            "fire_count": fire_count,
            "max_brightness_k": round(max_brightness, 2),
            "elevated_pm": elevated_pm,
            "description": desc,
            "disclaimer": "Observational correlation only. Does not establish industrial causality or emission provenance without atmospheric dispersion modeling.",
        }

    async def get_evidence_chain(
        self,
        facility_id: Union[str, int],
        radius_km: float = 10.0,
        ref_time: Optional[Union[datetime, str]] = None,
        fallback_lat: Optional[float] = None,
        fallback_lon: Optional[float] = None,
        fallback_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Assemble the comprehensive multi-sensor Environmental Evidence Chain for a facility.
        Adheres strictly to Zero-Fake-Data and Phase 3 Interface Contracts.

        Returns full evidence chain:
        - facility: Dict (id, name, type, latitude, longitude, state, capacity)
        - radius_km: float
        - ground_sensors: List[Dict]
        - fire_events: List[Dict]
        - ambient_quality: Dict (fcs, fcs_confidence, dominant_pollutant, observations_count)
        - regulatory_summary: Dict (overall_status, exceedances, details)
        - thermal_correlation: Dict (state, fire_count, max_brightness_k, elevated_pm, description, disclaimer)
        - data_availability: Dict (has_ground_stations, has_fire_hotspots, stations_count, fires_count)
        """
        facility_row = await self._fetch_facility(facility_id)
        if not facility_row:
            if fallback_lat is not None and fallback_lon is not None:
                facility = {
                    "id": facility_id,
                    "name": fallback_name or f"Facility {facility_id}",
                    "type": "industrial",
                    "latitude": float(fallback_lat),
                    "longitude": float(fallback_lon),
                    "state": "IND",
                    "capacity": "N/A",
                }
            else:
                raise ValueError(f"Facility {facility_id} not found.")
        else:
            facility = dict(facility_row)

        fac_lat = float(facility["latitude"])
        fac_lon = float(facility["longitude"])

        # 1. OpenAQ Ground Stations and latest measurements
        stations = await self.get_openaq_stations_within_radius(fac_lat, fac_lon, radius_km)
        ground_sensors = await self.get_latest_measurements_for_stations(stations, ref_time=ref_time)

        # 2. NASA FIRMS Active Fire Hotspots
        fire_events = await self.get_firms_fires_within_radius(fac_lat, fac_lon, radius_km, ref_time=ref_time)

        # 3. Multi-Sensor Ambient Quality & FCS
        ambient_quality = self._calculate_ambient_quality(ground_sensors, fire_events)

        # 4. Regulatory Summary
        regulatory_summary = self._build_regulatory_summary(ground_sensors)

        # 5. Observational Thermal Correlation
        thermal_correlation = self._build_thermal_correlation(fire_events, ground_sensors)

        # 6. Data Availability Flags (Zero-Fake-Data compliance)
        data_availability = {
            "has_ground_stations": len(ground_sensors) > 0,
            "has_fire_hotspots": len(fire_events) > 0,
            "stations_count": len(ground_sensors),
            "fires_count": len(fire_events),
        }

        return {
            "facility": {
                "id": facility.get("id"),
                "name": facility.get("name"),
                "type": facility.get("type"),
                "latitude": fac_lat,
                "longitude": fac_lon,
                "state": facility.get("state"),
                "capacity": facility.get("capacity"),
            },
            "radius_km": radius_km,
            "ground_sensors": ground_sensors,
            "fire_events": fire_events,
            "ambient_quality": ambient_quality,
            "regulatory_summary": regulatory_summary,
            "thermal_correlation": thermal_correlation,
            "data_availability": data_availability,
        }

    async def get_environmental_context(self, facility_id: str) -> Dict[str, Any]:
        """
        Build the Environmental Evidence Chain for a specific facility.
        Preserves complete backward compatibility with legacy callers and MockDB tests.
        """
        facility_row = await self._fetch_facility(facility_id)
        if not facility_row:
            raise ValueError(f"Facility {facility_id} not found.")

        facility = dict(facility_row)
        fac_lat = float(facility["latitude"])
        fac_lon = float(facility["longitude"])

        bbox = self.generate_bounding_box(fac_lat, fac_lon, 10.0)

        try:
            evidence = await self.get_evidence_chain(facility_id, radius_km=10.0)
            ground_sensors = evidence["ground_sensors"]
            fire_events = evidence["fire_events"]
            ambient_quality = evidence.get("ambient_quality")
            data_availability = evidence.get("data_availability")
        except Exception as e:
            logger.warning(f"Fallback in get_environmental_context: {e}")
            ground_sensors = []
            fire_events = []
            ambient_quality = {
                "fcs": 0.0,
                "fcs_confidence": "INSUFFICIENT_DATA",
                "dominant_pollutant": None,
                "observations_count": 0,
            }
            data_availability = {
                "has_ground_stations": False,
                "has_fire_hotspots": False,
                "stations_count": 0,
                "fires_count": 0,
            }

        logger.info(f"Generated intelligence context for facility {facility.get('name')}")

        return {
            "facility": facility,
            "spatial_context": {
                "bbox": bbox,
                "radius_km": 10.0,
            },
            "evidence_chain": {
                "ground_sensors": ground_sensors,
                "satellite_observations": [],
                "fire_events": fire_events,
            },
            "ambient_quality": ambient_quality,
            "data_availability": data_availability,
        }
