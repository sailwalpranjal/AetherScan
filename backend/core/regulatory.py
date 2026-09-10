"""
Regulatory Compliance Standards & Thermal Anomaly Correlation Engine.

Covers:
1. Full CPCB (India NAAQS), WHO (2021 AQG), and US EPA NAAQS standards across PM2.5, PM10, NO2, SO2, CO, O3, NH3, Pb.
2. Exceedance ratio (C_observed / C_standard) and severity classification.
3. Observational thermal anomaly and particulate matter correlation without speculative causality claims.
4. Backward-compatible check_compliance interface.
"""

from dataclasses import dataclass, asdict
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import math
import logging

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RegulatoryStandard:
    jurisdiction: str        # e.g. "India", "Global", "US"
    authority: str           # e.g. "CPCB", "WHO", "US-EPA"
    pollutant: str           # normalized lowercase: "pm25", "pm10", "no2", "so2", "co", "o3"
    concentration: float     # numeric threshold value
    unit: str                # e.g. "ug/m3", "mg/m3", "ppm"
    averaging_period: str    # e.g. "1h", "8h", "24h", "annual"
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# Comprehensive Regulatory Standards Registry
REGULATORY_STANDARDS: Dict[str, RegulatoryStandard] = {
    # -------------------------------------------------------------------------
    # India CPCB (National Ambient Air Quality Standards - NAAQS)
    # -------------------------------------------------------------------------
    "IN_CPCB_PM25_24H": RegulatoryStandard(
        jurisdiction="India", authority="CPCB", pollutant="pm25",
        concentration=60.0, unit="ug/m3", averaging_period="24h",
        description="CPCB India NAAQS 24-hour limit for PM2.5 in industrial/residential areas"
    ),
    "IN_CPCB_PM25_ANNUAL": RegulatoryStandard(
        jurisdiction="India", authority="CPCB", pollutant="pm25",
        concentration=40.0, unit="ug/m3", averaging_period="annual",
        description="CPCB India NAAQS Annual average limit for PM2.5"
    ),
    "IN_CPCB_PM10_24H": RegulatoryStandard(
        jurisdiction="India", authority="CPCB", pollutant="pm10",
        concentration=100.0, unit="ug/m3", averaging_period="24h",
        description="CPCB India NAAQS 24-hour limit for PM10"
    ),
    "IN_CPCB_PM10_ANNUAL": RegulatoryStandard(
        jurisdiction="India", authority="CPCB", pollutant="pm10",
        concentration=60.0, unit="ug/m3", averaging_period="annual",
        description="CPCB India NAAQS Annual average limit for PM10"
    ),
    "IN_CPCB_NO2_24H": RegulatoryStandard(
        jurisdiction="India", authority="CPCB", pollutant="no2",
        concentration=80.0, unit="ug/m3", averaging_period="24h",
        description="CPCB India NAAQS 24-hour limit for Nitrogen Dioxide"
    ),
    "IN_CPCB_NO2_ANNUAL": RegulatoryStandard(
        jurisdiction="India", authority="CPCB", pollutant="no2",
        concentration=40.0, unit="ug/m3", averaging_period="annual",
        description="CPCB India NAAQS Annual average limit for Nitrogen Dioxide"
    ),
    "IN_CPCB_SO2_24H": RegulatoryStandard(
        jurisdiction="India", authority="CPCB", pollutant="so2",
        concentration=80.0, unit="ug/m3", averaging_period="24h",
        description="CPCB India NAAQS 24-hour limit for Sulphur Dioxide"
    ),
    "IN_CPCB_SO2_ANNUAL": RegulatoryStandard(
        jurisdiction="India", authority="CPCB", pollutant="so2",
        concentration=50.0, unit="ug/m3", averaging_period="annual",
        description="CPCB India NAAQS Annual average limit for Sulphur Dioxide"
    ),
    "IN_CPCB_CO_8H": RegulatoryStandard(
        jurisdiction="India", authority="CPCB", pollutant="co",
        concentration=2.0, unit="mg/m3", averaging_period="8h",
        description="CPCB India NAAQS 8-hour limit for Carbon Monoxide"
    ),
    "IN_CPCB_CO_1H": RegulatoryStandard(
        jurisdiction="India", authority="CPCB", pollutant="co",
        concentration=4.0, unit="mg/m3", averaging_period="1h",
        description="CPCB India NAAQS 1-hour limit for Carbon Monoxide"
    ),
    "IN_CPCB_O3_8H": RegulatoryStandard(
        jurisdiction="India", authority="CPCB", pollutant="o3",
        concentration=100.0, unit="ug/m3", averaging_period="8h",
        description="CPCB India NAAQS 8-hour limit for Ozone"
    ),
    "IN_CPCB_O3_1H": RegulatoryStandard(
        jurisdiction="India", authority="CPCB", pollutant="o3",
        concentration=180.0, unit="ug/m3", averaging_period="1h",
        description="CPCB India NAAQS 1-hour limit for Ozone"
    ),
    "IN_CPCB_NH3_24H": RegulatoryStandard(
        jurisdiction="India", authority="CPCB", pollutant="nh3",
        concentration=400.0, unit="ug/m3", averaging_period="24h",
        description="CPCB India NAAQS 24-hour limit for Ammonia"
    ),
    "IN_CPCB_PB_24H": RegulatoryStandard(
        jurisdiction="India", authority="CPCB", pollutant="pb",
        concentration=1.0, unit="ug/m3", averaging_period="24h",
        description="CPCB India NAAQS 24-hour limit for Lead"
    ),

    # -------------------------------------------------------------------------
    # WHO (2021 Global Air Quality Guidelines)
    # -------------------------------------------------------------------------
    "WHO_PM25_24H": RegulatoryStandard(
        jurisdiction="Global", authority="WHO", pollutant="pm25",
        concentration=15.0, unit="ug/m3", averaging_period="24h",
        description="WHO 2021 Air Quality Guideline 24-hour mean for PM2.5"
    ),
    "WHO_PM25_ANNUAL": RegulatoryStandard(
        jurisdiction="Global", authority="WHO", pollutant="pm25",
        concentration=5.0, unit="ug/m3", averaging_period="annual",
        description="WHO 2021 Air Quality Guideline Annual mean for PM2.5"
    ),
    "WHO_PM10_24H": RegulatoryStandard(
        jurisdiction="Global", authority="WHO", pollutant="pm10",
        concentration=45.0, unit="ug/m3", averaging_period="24h",
        description="WHO 2021 Air Quality Guideline 24-hour mean for PM10"
    ),
    "WHO_PM10_ANNUAL": RegulatoryStandard(
        jurisdiction="Global", authority="WHO", pollutant="pm10",
        concentration=15.0, unit="ug/m3", averaging_period="annual",
        description="WHO 2021 Air Quality Guideline Annual mean for PM10"
    ),
    "WHO_NO2_24H": RegulatoryStandard(
        jurisdiction="Global", authority="WHO", pollutant="no2",
        concentration=25.0, unit="ug/m3", averaging_period="24h",
        description="WHO 2021 Air Quality Guideline 24-hour mean for NO2"
    ),
    "WHO_NO2_ANNUAL": RegulatoryStandard(
        jurisdiction="Global", authority="WHO", pollutant="no2",
        concentration=10.0, unit="ug/m3", averaging_period="annual",
        description="WHO 2021 Air Quality Guideline Annual mean for NO2"
    ),
    "WHO_SO2_24H": RegulatoryStandard(
        jurisdiction="Global", authority="WHO", pollutant="so2",
        concentration=40.0, unit="ug/m3", averaging_period="24h",
        description="WHO 2021 Air Quality Guideline 24-hour mean for SO2"
    ),
    "WHO_CO_24H": RegulatoryStandard(
        jurisdiction="Global", authority="WHO", pollutant="co",
        concentration=4.0, unit="mg/m3", averaging_period="24h",
        description="WHO 2021 Air Quality Guideline 24-hour mean for CO"
    ),
    "WHO_O3_8H": RegulatoryStandard(
        jurisdiction="Global", authority="WHO", pollutant="o3",
        concentration=100.0, unit="ug/m3", averaging_period="8h",
        description="WHO 2021 Air Quality Guideline 8-hour mean for Ozone"
    ),

    # -------------------------------------------------------------------------
    # US EPA (National Ambient Air Quality Standards - NAAQS)
    # -------------------------------------------------------------------------
    "US_EPA_PM25_24H": RegulatoryStandard(
        jurisdiction="US", authority="US-EPA", pollutant="pm25",
        concentration=35.0, unit="ug/m3", averaging_period="24h",
        description="US EPA NAAQS 24-hour standard for PM2.5"
    ),
    "US_EPA_PM25_ANNUAL": RegulatoryStandard(
        jurisdiction="US", authority="US-EPA", pollutant="pm25",
        concentration=9.0, unit="ug/m3", averaging_period="annual",
        description="US EPA NAAQS Annual standard for PM2.5 (revised 2024)"
    ),
    "US_EPA_PM10_24H": RegulatoryStandard(
        jurisdiction="US", authority="US-EPA", pollutant="pm10",
        concentration=150.0, unit="ug/m3", averaging_period="24h",
        description="US EPA NAAQS 24-hour standard for PM10"
    ),
    "US_EPA_NO2_1H": RegulatoryStandard(
        jurisdiction="US", authority="US-EPA", pollutant="no2",
        concentration=188.0, unit="ug/m3", averaging_period="1h",
        description="US EPA NAAQS 1-hour standard for NO2 (100 ppb approx. 188 ug/m3)"
    ),
    "US_EPA_SO2_1H": RegulatoryStandard(
        jurisdiction="US", authority="US-EPA", pollutant="so2",
        concentration=196.0, unit="ug/m3", averaging_period="1h",
        description="US EPA NAAQS 1-hour standard for SO2 (75 ppb approx. 196 ug/m3)"
    ),
    "US_EPA_CO_8H": RegulatoryStandard(
        jurisdiction="US", authority="US-EPA", pollutant="co",
        concentration=10.0, unit="mg/m3", averaging_period="8h",
        description="US EPA NAAQS 8-hour standard for CO (9 ppm approx. 10 mg/m3)"
    ),
    "US_EPA_O3_8H": RegulatoryStandard(
        jurisdiction="US", authority="US-EPA", pollutant="o3",
        concentration=137.0, unit="ug/m3", averaging_period="8h",
        description="US EPA NAAQS 8-hour standard for Ozone (70 ppb approx. 137 ug/m3)"
    ),
}

# Alias mapping for backward compatibility
STANDARDS = REGULATORY_STANDARDS


def _normalize_unit(unit: str) -> str:
    """Normalize common unit variants to canonical representation."""
    cleaned = str(unit).strip().lower()
    cleaned = cleaned.replace("µg", "ug").replace("microgram", "ug")
    if cleaned in ("ug/m3", "ug/m^3", "ug/m³", "ug/m"):
        return "ug/m3"
    if cleaned in ("mg/m3", "mg/m^3", "mg/m³", "mg/m"):
        return "mg/m3"
    return cleaned


def _classify_severity(ratio: float) -> str:
    """Classify exceedance ratio into standard severity tiers."""
    if ratio <= 0.75:
        return "compliant"
    elif ratio <= 1.0:
        return "approaching_limit"
    elif ratio <= 2.0:
        return "moderate_exceedance"
    elif ratio <= 5.0:
        return "severe_exceedance"
    else:
        return "hazardous_exceedance"


def check_compliance(
    pollutant: str,
    value: float,
    unit: str,
    jurisdiction: str = "India",
    averaging_period: Optional[str] = "24h"
) -> Dict[str, Any]:
    """
    Check an observed concentration against applicable regulatory standards.
    Never claims causal attribution, only observation vs standard.

    Args:
        pollutant: Pollutant name (e.g. 'pm25', 'pm10', 'no2', 'so2', 'co', 'o3')
        value: Observed concentration value
        unit: Measurement unit (e.g. 'ug/m3', 'mg/m3')
        jurisdiction: Geographic jurisdiction ('India', 'US', or 'Global')
        averaging_period: Averaging window ('24h', 'annual', '1h', '8h', or None for all)

    Returns:
        Dictionary with status ("compliant", "exceeded", "unknown"),
        applicable details with ratios, severity, and observational notes.
    """
    if value is None or not math.isfinite(value) or value < 0:
        return {"status": "unknown", "message": f"Invalid observation value: {value}"}

    pollutant_norm = str(pollutant).strip().lower().replace(".", "").replace("-", "").replace(" ", "")
    unit_norm = _normalize_unit(unit)

    # Filter applicable standards: specific jurisdiction or Global (WHO)
    applicable_jurisdictions = {jurisdiction.capitalize(), "Global"}
    if jurisdiction.lower() in ("india", "in"):
        applicable_jurisdictions.add("India")
    elif jurisdiction.lower() in ("us", "usa", "united states"):
        applicable_jurisdictions.add("US")

    period_norm = str(averaging_period).strip().lower() if averaging_period else None

    relevant_standards = [
        s for s in REGULATORY_STANDARDS.values()
        if s.pollutant == pollutant_norm
        and _normalize_unit(s.unit) == unit_norm
        and s.jurisdiction in applicable_jurisdictions
        and (period_norm is None or period_norm == "all" or s.averaging_period.lower() == period_norm)
    ]

    if not relevant_standards:
        return {
            "status": "unknown",
            "message": f"No reference standards found for {pollutant}",
            "details": []
        }

    exceedances: List[Dict[str, Any]] = []
    evaluations: List[Dict[str, Any]] = []

    for standard in relevant_standards:
        ratio = round(value / standard.concentration, 3) if standard.concentration > 0 else 0.0
        delta = round(value - standard.concentration, 2)
        pct_over = max(0.0, round((ratio - 1.0) * 100.0, 1))
        severity = _classify_severity(ratio)

        eval_item = {
            "authority": standard.authority,
            "standard_id": f"{standard.authority}_{standard.pollutant.upper()}_{standard.averaging_period.upper()}",
            "limit": standard.concentration,
            "unit": standard.unit,
            "observed": value,
            "averaging_period": standard.averaging_period,
            "exceedance_ratio": ratio,
            "delta": delta,
            "pct_over_limit": pct_over,
            "severity": severity,
            "description": standard.description,
            "message": (
                f"Observed concentration exceeds the {standard.authority} reference standard "
                f"for the {standard.averaging_period} averaging period."
                if value > standard.concentration
                else f"Observed concentration is within {standard.authority} {standard.averaging_period} limit."
            )
        }

        evaluations.append(eval_item)
        if value > standard.concentration:
            exceedances.append(eval_item)

    if exceedances:
        max_ratio = max(e["exceedance_ratio"] for e in exceedances)
        worst_severity = _classify_severity(max_ratio)
        return {
            "status": "exceeded",
            "pollutant": pollutant_norm,
            "observed_value": value,
            "unit": unit_norm,
            "max_exceedance_ratio": max_ratio,
            "worst_severity": worst_severity,
            "details": exceedances,
            "all_evaluations": evaluations,
            "attribution_disclaimer": "Observational comparison only; does not establish legal or causal liability."
        }

    return {
        "status": "compliant",
        "pollutant": pollutant_norm,
        "observed_value": value,
        "unit": unit_norm,
        "max_exceedance_ratio": max(e["exceedance_ratio"] for e in evaluations) if evaluations else 0.0,
        "worst_severity": "compliant",
        "message": f"Observation is within all applicable {jurisdiction} and Global limits.",
        "details": [],
        "all_evaluations": evaluations
    }


def evaluate_environmental_evidence(
    measurements: List[Dict[str, Any]],
    jurisdiction: str = "India"
) -> Dict[str, Any]:
    """
    Evaluate an entire collection of ambient measurements around a facility
    against regulatory standards.
    """
    if not measurements:
        return {
            "status": "no_data",
            "message": "No sensor measurements provided for regulatory evaluation.",
            "total_pollutants_evaluated": 0,
            "total_exceedances": 0,
            "exceedances": [],
            "pollutant_details": {},
            "summary": {}
        }

    pollutant_evaluations: Dict[str, Any] = {}
    all_exceedances: List[Dict[str, Any]] = []

    for m in measurements:
        param = str(m.get("parameter") or m.get("pollutant") or "").lower()
        val = m.get("value")
        unit = m.get("unit", "ug/m3")

        if val is None or not math.isfinite(val):
            continue

        result = check_compliance(pollutant=param, value=float(val), unit=unit, jurisdiction=jurisdiction)
        if result["status"] != "unknown":
            pollutant_evaluations[param] = result
            if result["status"] == "exceeded":
                for exc in result.get("details", []):
                    all_exceedances.append({
                        **exc,
                        "station_id": m.get("station_id"),
                        "station_name": m.get("station_name"),
                        "timestamp": m.get("timestamp"),
                        "distance_km": m.get("distance_km")
                    })

    has_exceedance = len(all_exceedances) > 0
    overall_status = "exceeded" if has_exceedance else ("compliant" if pollutant_evaluations else "no_data")

    return {
        "status": overall_status,
        "jurisdiction": jurisdiction,
        "total_pollutants_evaluated": len(pollutant_evaluations),
        "total_exceedances": len(all_exceedances),
        "exceedances": all_exceedances,
        "pollutant_details": pollutant_evaluations,
        "evaluation_timestamp": datetime.now(timezone.utc).isoformat()
    }


def correlate_thermal_anomalies(
    facility_coords: Tuple[float, float],
    fire_events: List[Dict[str, Any]],
    ground_sensors: List[Dict[str, Any]],
    radius_km: float = 25.0
) -> Dict[str, Any]:
    """
    Compute observational correlation between active fire hotspots (NASA FIRMS)
    and particulate matter elevations near a facility.

    Strict Scientific Integrity Rule:
    Never asserts causal attribution ("fires caused pollution"). Reports
    strictly as spatial-temporal observational correlation.
    """
    # Extract PM2.5 / PM10 measurements from ground sensors
    pm_readings: List[float] = []
    for s in ground_sensors:
        for m in s.get("measurements", []):
            param = str(m.get("parameter") or m.get("pollutant") or "").lower()
            val = m.get("value")
            if param in ("pm25", "pm10") and val is not None and math.isfinite(val):
                pm_readings.append(float(val))

    avg_pm = sum(pm_readings) / len(pm_readings) if pm_readings else None
    elevated_pm = any(v > 60.0 for v in pm_readings) if pm_readings else False
    has_sensors = len(ground_sensors) > 0 and len(pm_readings) > 0

    if not fire_events:
        if not has_sensors:
            state = "DATA_UNAVAILABLE"
            desc = f"Insufficient ground sensor or thermal anomaly data within the specified radius ({radius_km} km)."
        elif elevated_pm:
            state = "ELEVATED_PM_ONLY"
            desc = "Elevated particulate matter detected by ground stations without concurrent thermal anomalies."
        else:
            state = "NORMAL_CONDITIONS"
            desc = "Ground air quality observations and thermal observations are within nominal baseline ranges."

        return {
            "state": state,
            "correlation_status": "none_detected",
            "fire_count": 0,
            "closest_fire_km": radius_km,
            "total_frp_mw": 0.0,
            "max_brightness_k": 0.0,
            "elevated_pm": elevated_pm,
            "average_pm_ambient": avg_pm,
            "correlation_index": 0.0,
            "description": desc,
            "message": f"No thermal anomalies detected within {radius_km} km of facility.",
            "disclaimer": "Observational correlation only. Does not establish industrial causality or emission provenance without atmospheric dispersion modeling.",
            "non_causality_disclaimer": (
                "Observational spatial-temporal correlation only. Causal attribution requires "
                "chemical speciation analysis and backward wind trajectory modeling."
            ),
            "scientific_caveat": (
                "Observation represents spatial-temporal proximity only. Causal attribution requires "
                "chemical speciation analysis and backward wind trajectory modeling."
            ),
            "evidence": []
        }

    # Calculate proximity and radiative power metrics
    fire_distances = [f.get("distance_km", radius_km) for f in fire_events if f.get("distance_km") is not None]
    min_fire_dist = min(fire_distances) if fire_distances else radius_km
    total_frp = sum(float(f.get("frp", 0.0) or 0.0) for f in fire_events)
    max_brightness = max((float(f.get("brightness", 0.0)) for f in fire_events), default=0.0)

    # Spatial proximity weight: exp(-d / 10.0)
    spatial_proximity_weight = math.exp(-min_fire_dist / 10.0) if min_fire_dist < radius_km else 0.0

    # Particulate elevation factor (relative to CPCB 24h limit 60 ug/m3)
    pm_elevation_factor = 0.5
    if avg_pm is not None:
        pm_elevation_factor = min(1.0, max(0.0, avg_pm / 120.0))

    # Composite observational correlation index in [0.0, 1.0]
    raw_index = 0.6 * spatial_proximity_weight + 0.4 * pm_elevation_factor
    correlation_index = round(min(1.0, max(0.0, raw_index)), 3)

    if elevated_pm:
        state = "CONCURRENT_THERMAL_AND_PM_ANOMALY"
    else:
        state = "THERMAL_ANOMALY_ONLY"

    if correlation_index >= 0.7:
        severity = "strong_co_occurrence"
        note = (
            f"Strong spatial-temporal co-occurrence observed: {len(fire_events)} active thermal "
            f"anomalies detected (closest at {min_fire_dist:.1f} km, total FRP {total_frp:.1f} MW) "
            f"coinciding with elevated local particulate levels."
        )
    elif correlation_index >= 0.4:
        severity = "moderate_co_occurrence"
        note = (
            f"Moderate spatial-temporal co-occurrence: {len(fire_events)} fire hotspots detected "
            f"(closest at {min_fire_dist:.1f} km)."
        )
    else:
        severity = "weak_or_isolated"
        note = f"Thermal anomalies present at peripheral distance ({min_fire_dist:.1f} km); minimal local correlation."

    return {
        "state": state,
        "correlation_status": severity,
        "correlation_index": correlation_index,
        "fire_count": len(fire_events),
        "closest_fire_km": round(min_fire_dist, 2),
        "total_frp_mw": round(total_frp, 2),
        "max_brightness_k": round(max_brightness, 2),
        "elevated_pm": elevated_pm,
        "average_pm_ambient": round(avg_pm, 1) if avg_pm is not None else None,
        "description": note,
        "observational_summary": note,
        "disclaimer": "Observational correlation only. Does not establish industrial causality or emission provenance without atmospheric dispersion modeling.",
        "non_causality_disclaimer": (
            "Observational spatial-temporal correlation only. Causal attribution requires "
            "chemical speciation analysis and backward wind trajectory modeling."
        ),
        "scientific_caveat": (
            "Observation represents spatial-temporal proximity only. Causal attribution requires "
            "chemical speciation analysis and backward wind trajectory modeling."
        )
    }


def calculate_exceedance_ratios(
    measurements: List[Dict[str, Any]],
    jurisdiction: str = "India"
) -> List[Dict[str, Any]]:
    """
    Calculate exceedance ratios for a list of ambient measurements against regulatory standards.
    Returns list of exceedance items with ratio, severity, standard_id, and delta.
    """
    eval_result = evaluate_environmental_evidence(measurements, jurisdiction=jurisdiction)
    return eval_result.get("exceedances", [])


def analyze_thermal_correlation(
    fire_events: List[Dict[str, Any]],
    measurements: List[Dict[str, Any]],
    facility_coords: Tuple[float, float] = (0.0, 0.0),
    radius_km: float = 25.0
) -> Dict[str, Any]:
    """
    Evaluate observational thermal anomaly correlation from flat measurement lists.
    """
    formatted_sensors = [{"measurements": measurements}] if measurements else []
    return correlate_thermal_anomalies(
        facility_coords=facility_coords,
        fire_events=fire_events,
        ground_sensors=formatted_sensors,
        radius_km=radius_km
    )

