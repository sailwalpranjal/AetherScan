"""
Facility Intelligence and Environmental Evidence Chain API Routes.

Endpoints:
- GET  /facility/list: Paginated search and discovery of industrial facilities.
- GET  /facility/nearby: Geodesic radial search for facilities near coordinates.
- GET  /facility/{facility_id}/evidence-chain: Multi-sensor environmental evidence chain.
- GET  /facility/standards: Registered regulatory air quality benchmarks.
- POST /facility/compliance/check: Custom observation regulatory compliance verification.
"""

import logging
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query, Path

from db.database import db_manager
from services.facility_intelligence import FacilityIntelligenceService, haversine_distance
from core.regulatory import (
    check_compliance,
    evaluate_environmental_evidence,
    REGULATORY_STANDARDS
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/facility", tags=["facility"])


class ComplianceCheckRequest(BaseModel):
    pollutant: str = Field(..., description="Pollutant code (e.g. pm25, pm10, no2, so2, co, o3)")
    value: float = Field(..., ge=0.0, description="Observed concentration numeric value")
    unit: str = Field("ug/m3", description="Concentration unit (e.g. ug/m3, mg/m3, ppm)")
    jurisdiction: str = Field("India", description="Jurisdiction (India, US, or Global)")
    averaging_period: Optional[str] = Field("24h", description="Averaging period (24h, annual, 1h, 8h)")


def _get_service() -> FacilityIntelligenceService:
    return FacilityIntelligenceService(db_manager)


@router.get("/list")
async def list_facilities(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    industry_type: Optional[str] = Query(None, description="Filter by industry type (e.g. power_plant, refinery)"),
    state: Optional[str] = Query(None, description="Filter by state name"),
    search: Optional[str] = Query(None, description="Text search in facility name or state")
) -> Dict[str, Any]:
    """
    Paginated discovery of industrial facilities across India.
    Supports filtering by type, state, and name search.
    """
    service = _get_service()
    
    where_clauses: List[str] = []
    params: Dict[str, Any] = {}

    if industry_type:
        where_clauses.append("LOWER(type) = :type")
        params["type"] = industry_type.strip().lower()

    if state:
        where_clauses.append("LOWER(state) = :state")
        params["state"] = state.strip().lower()

    if search:
        where_clauses.append("(LOWER(name) LIKE :search OR LOWER(state) LIKE :search)")
        params["search"] = f"%{search.strip().lower()}%"

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    count_query = f"SELECT COUNT(*) as total FROM industries {where_sql}"
    total_row = await service._fetch_one_safe(count_query, params)
    total = int(total_row.get("total", 0)) if total_row else 0

    offset = (page - 1) * page_size
    select_query = f"""
        SELECT id, name, type, latitude, longitude, state, capacity
        FROM industries
        {where_sql}
        ORDER BY id ASC
        LIMIT :limit OFFSET :offset
    """
    params["limit"] = page_size
    params["offset"] = offset

    rows = await service._fetch_all_safe(select_query, params)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "facilities": [dict(r) for r in rows]
    }


@router.get("/nearby")
async def get_nearby_facilities(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude coordinate"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude coordinate"),
    radius_km: float = Query(25.0, ge=1.0, le=200.0, description="Search radius in kilometers"),
    limit: int = Query(20, ge=1, le=100, description="Maximum facilities to return")
) -> Dict[str, Any]:
    """
    Geodesic radial search for industrial facilities around a coordinate.
    Uses two-phase bounding box filter + Haversine distance verification.
    """
    service = _get_service()
    bbox = service.generate_bounding_box(lat, lon, radius_km)

    query = """
        SELECT id, name, type, latitude, longitude, state, capacity
        FROM industries
        WHERE latitude >= :min_lat AND latitude <= :max_lat
          AND longitude >= :min_lon AND longitude <= :max_lon
    """
    candidates = await service._fetch_all_safe(query, bbox)

    results: List[Dict[str, Any]] = []
    for row in candidates:
        dist = haversine_distance(lat, lon, float(row["latitude"]), float(row["longitude"]))
        if dist <= radius_km:
            fac = dict(row)
            fac["distance_km"] = round(dist, 2)
            results.append(fac)

    results.sort(key=lambda f: f["distance_km"])
    trimmed = results[:limit]

    return {
        "count": len(trimmed),
        "total_found": len(results),
        "origin": {"latitude": lat, "longitude": lon},
        "radius_km": radius_km,
        "facilities": trimmed
    }


@router.get("/standards")
async def get_regulatory_standards(
    jurisdiction: Optional[str] = Query(None, description="Filter by jurisdiction (India, US, Global)"),
    pollutant: Optional[str] = Query(None, description="Filter by pollutant code")
) -> Dict[str, Any]:
    """
    List official ambient air quality standards (CPCB India, WHO 2021, US EPA).
    """
    standards = []
    for sid, std in REGULATORY_STANDARDS.items():
        if jurisdiction and std.jurisdiction.lower() != jurisdiction.strip().lower():
            continue
        if pollutant and std.pollutant.lower() != pollutant.strip().lower():
            continue
        standards.append({
            "standard_id": sid,
            **std.to_dict()
        })

    return {
        "count": len(standards),
        "standards": standards
    }


@router.post("/compliance/check")
async def check_custom_compliance(req: ComplianceCheckRequest) -> Dict[str, Any]:
    """
    Evaluate a custom observation against applicable regulatory standards.
    Returns exceedance ratios, severity classification, and delta over threshold.
    """
    result = check_compliance(
        pollutant=req.pollutant,
        value=req.value,
        unit=req.unit,
        jurisdiction=req.jurisdiction,
        averaging_period=req.averaging_period
    )
    return result


@router.get("/{facility_id}/evidence-chain")
async def get_facility_evidence_chain(
    facility_id: str = Path(..., description="Facility identifier"),
    radius_km: float = Query(10.0, ge=1.0, le=100.0, description="Radial analysis buffer in km")
) -> Dict[str, Any]:
    """
    Assemble the complete Environmental Evidence Chain for an industrial facility.
    Integrates OpenAQ ground stations, NASA FIRMS active fire hotspots,
    Fusion Confidence Score (FCS), regulatory compliance, and thermal correlation.
    """
    service = _get_service()
    try:
        chain = await service.get_evidence_chain(facility_id=facility_id, radius_km=radius_km)
        return chain
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Evidence chain generation failed for facility {facility_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate evidence chain")
