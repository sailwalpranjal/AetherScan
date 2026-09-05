from typing import Dict, Any, Optional

class RegulatoryStandard:
    def __init__(self, jurisdiction: str, authority: str, pollutant: str, 
                 concentration: float, unit: str, averaging_period: str):
        self.jurisdiction = jurisdiction
        self.authority = authority
        self.pollutant = pollutant
        self.concentration = concentration
        self.unit = unit
        self.averaging_period = averaging_period

# Base standards representing India (CPCB) and WHO
STANDARDS = {
    "WHO_PM25_24H": RegulatoryStandard("Global", "WHO", "pm25", 15.0, "ug/m3", "24h"),
    "WHO_PM10_24H": RegulatoryStandard("Global", "WHO", "pm10", 45.0, "ug/m3", "24h"),
    "IN_CPCB_PM25_24H": RegulatoryStandard("India", "CPCB", "pm25", 60.0, "ug/m3", "24h"),
    "IN_CPCB_PM10_24H": RegulatoryStandard("India", "CPCB", "pm10", 100.0, "ug/m3", "24h"),
}

def check_compliance(pollutant: str, value: float, unit: str, 
                     jurisdiction: str = "India") -> Dict[str, Any]:
    """
    Check an observed concentration against applicable regulatory standards.
    Never claims causal attribution, only observation vs standard.
    """
    relevant_standards = [
        s for s in STANDARDS.values() 
        if s.pollutant == pollutant.lower() and s.unit == unit.lower() 
        and s.jurisdiction in (jurisdiction, "Global")
    ]
    
    if not relevant_standards:
        return {"status": "unknown", "message": f"No reference standards found for {pollutant}"}
        
    exceedances = []
    for standard in relevant_standards:
        if value > standard.concentration:
            exceedances.append({
                "authority": standard.authority,
                "limit": standard.concentration,
                "observed": value,
                "message": f"Observed concentration exceeds the {standard.authority} reference standard for the {standard.averaging_period} averaging period."
            })
            
    if exceedances:
        return {
            "status": "exceeded",
            "details": exceedances
        }
        
    return {
        "status": "compliant",
        "message": f"Observation is within all applicable {jurisdiction} and Global limits."
    }
