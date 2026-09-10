import pytest
from core.regulatory import check_compliance

def test_check_compliance_exceeded():
    result = check_compliance("pm25", 85.0, "ug/m3", "India")
    
    assert result["status"] == "exceeded"
    assert len(result["details"]) == 2
    authorities = [d["authority"] for d in result["details"]]
    assert "WHO" in authorities
    assert "CPCB" in authorities

def test_check_compliance_compliant_india():
    # Between WHO (15) and CPCB (60)
    result = check_compliance("pm25", 40.0, "ug/m3", "India")
    
    assert result["status"] == "exceeded"
    assert len(result["details"]) == 1
    assert result["details"][0]["authority"] == "WHO"

def test_check_compliance_compliant_all():
    result = check_compliance("pm25", 10.0, "ug/m3", "India")
    
    assert result["status"] == "compliant"

def test_check_compliance_unknown():
    result = check_compliance("unknown_pollutant", 100.0, "ug/m3", "India")
    
    assert result["status"] == "unknown"


def test_check_compliance_severity_and_ratio():
    # CPCB 24h limit is 60 (ratio 3.0 -> severe_exceedance).
    # WHO 24h limit is 15 (ratio 12.0 -> hazardous_exceedance).
    result = check_compliance("pm25", 180.0, "ug/m3", "India")
    assert result["status"] == "exceeded"
    assert result["worst_severity"] == "hazardous_exceedance"
    assert result["max_exceedance_ratio"] >= 12.0

    cpcb_eval = next(d for d in result["details"] if d["authority"] == "CPCB")
    assert cpcb_eval["severity"] == "severe_exceedance"
    assert cpcb_eval["exceedance_ratio"] == 3.0
    assert cpcb_eval["delta"] == 120.0
    assert cpcb_eval["pct_over_limit"] == 200.0


def test_check_compliance_approaching_limit():
    # CPCB limit is 60. 50 is 0.833 -> approaching_limit for CPCB, but exceeds WHO (15)
    # If we check against US EPA (limit 35 for 24h), 30 is 0.857 -> approaching_limit
    result = check_compliance("pm25", 30.0, "ug/m3", "US")
    us_eval = next(e for e in result["all_evaluations"] if e["authority"] == "US-EPA")
    assert us_eval["severity"] == "approaching_limit"


def test_check_compliance_annual_averaging():
    result = check_compliance("pm25", 20.0, "ug/m3", "India", averaging_period="annual")
    assert result["status"] == "exceeded"  # Exceeds WHO Annual (5.0) but below CPCB Annual (40.0)
    who_detail = next(d for d in result["details"] if d["authority"] == "WHO")
    assert who_detail["limit"] == 5.0
    assert who_detail["averaging_period"] == "annual"


def test_check_compliance_gaseous_pollutants():
    # NO2: CPCB 24h limit is 80, WHO is 25
    res_no2 = check_compliance("no2", 90.0, "ug/m3", "India")
    assert res_no2["status"] == "exceeded"
    assert len(res_no2["details"]) == 2

    # CO: CPCB 8h limit is 2.0 mg/m3
    res_co = check_compliance("co", 1.5, "mg/m3", "India", averaging_period="8h")
    assert res_co["status"] == "compliant"


def test_evaluate_environmental_evidence_empty():
    from core.regulatory import evaluate_environmental_evidence
    res = evaluate_environmental_evidence([])
    assert res["status"] == "no_data"
    assert res["total_exceedances"] == 0


def test_evaluate_environmental_evidence_multi_pollutant():
    from core.regulatory import evaluate_environmental_evidence
    measurements = [
        {"parameter": "pm25", "value": 75.0, "unit": "ug/m3", "station_name": "Station A"},
        {"parameter": "pm10", "value": 50.0, "unit": "ug/m3", "station_name": "Station A"},
        {"parameter": "no2", "value": 15.0, "unit": "ug/m3", "station_name": "Station B"},
    ]
    res = evaluate_environmental_evidence(measurements, jurisdiction="India")
    assert res["status"] == "exceeded"
    assert res["total_pollutants_evaluated"] == 3
    assert res["total_exceedances"] > 0
    assert "pm25" in res["pollutant_details"]


def test_correlate_thermal_anomalies_no_fires():
    from core.regulatory import correlate_thermal_anomalies
    res = correlate_thermal_anomalies((28.5, 77.2), [], [])
    assert res["correlation_status"] == "none_detected"
    assert res["fire_count"] == 0
    assert res["correlation_index"] == 0.0


def test_correlate_thermal_anomalies_proximity_and_elevated_pm():
    from core.regulatory import correlate_thermal_anomalies
    fires = [
        {"latitude": 28.52, "longitude": 77.22, "distance_km": 2.5, "frp": 35.0},
        {"latitude": 28.55, "longitude": 77.25, "distance_km": 4.0, "frp": 20.0},
    ]
    sensors = [
        {"measurements": [{"parameter": "pm25", "value": 160.0}]}
    ]
    res = correlate_thermal_anomalies((28.5, 77.2), fires, sensors, radius_km=10.0)
    assert res["correlation_status"] == "strong_co_occurrence"
    assert res["fire_count"] == 2
    assert res["closest_fire_km"] == 2.5
    assert res["total_frp_mw"] == 55.0
    assert res["correlation_index"] >= 0.7
    assert "chemical speciation" in res["scientific_caveat"]

