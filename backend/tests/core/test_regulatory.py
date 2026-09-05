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
