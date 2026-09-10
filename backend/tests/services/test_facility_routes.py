"""
Unit and integration tests for Facility Intelligence API Routes.

Tests:
1. GET  /facility/standards
2. GET  /facility/standards?jurisdiction=India&pollutant=pm25
3. POST /facility/compliance/check
4. GET  /facility/list with pagination, state, and search filtering
5. GET  /facility/nearby with coordinate and radius filtering
6. GET  /facility/{facility_id}/evidence-chain with full multi-sensor integration
7. GET  /facility/{facility_id}/evidence-chain 404 on missing facility
"""

import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from db.database import db_manager, init_db
from models.domain import Base, Industry
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker


@pytest.fixture(autouse=True)
async def setup_test_db():
    """Setup in-memory SQLite database via db_manager for route testing."""
    await db_manager.close()
    await db_manager.initialize(":memory:")

    await db_manager.execute(
        """INSERT INTO industries (id, name, type, latitude, longitude, state, capacity)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (1, "Badarpur Thermal Power Station", "power_plant", 28.5085, 77.3060, "Delhi", "705 MW"),
    )
    await db_manager.execute(
        """INSERT INTO industries (id, name, type, latitude, longitude, state, capacity)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (2, "Panipat Refinery", "refinery", 29.3909, 76.9635, "Haryana", "15 MMTPA"),
    )
    await db_manager.execute(
        """INSERT INTO industries (id, name, type, latitude, longitude, state, capacity)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (3, "Thar Desert Solar Park", "solar_park", 27.5000, 71.5000, "Rajasthan", "2245 MW"),
    )

    yield

    await db_manager.close()


@pytest.mark.asyncio
async def test_get_standards():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/facility/standards")
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] > 0
        authorities = {s["authority"] for s in data["standards"]}
        assert "CPCB" in authorities
        assert "WHO" in authorities
        assert "US-EPA" in authorities


@pytest.mark.asyncio
async def test_get_standards_filtered():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/facility/standards?jurisdiction=India&pollutant=pm25")
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] >= 2
        for s in data["standards"]:
            assert s["pollutant"] == "pm25"
            assert s["authority"] == "CPCB"


@pytest.mark.asyncio
async def test_compliance_check_post():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "pollutant": "pm25",
            "value": 120.0,
            "unit": "ug/m3",
            "jurisdiction": "India",
            "averaging_period": "24h"
        }
        resp = await client.post("/facility/compliance/check", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "exceeded"
        assert data["max_exceedance_ratio"] >= 2.0


@pytest.mark.asyncio
async def test_list_facilities():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/facility/list?page=1&page_size=10")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert len(data["facilities"]) == 3
        assert data["page"] == 1


@pytest.mark.asyncio
async def test_list_facilities_search_and_filter():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Filter by type
        resp = await client.get("/facility/list?industry_type=power_plant")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["facilities"][0]["name"] == "Badarpur Thermal Power Station"

        # Text search
        resp_s = await client.get("/facility/list?search=refinery")
        assert resp_s.status_code == 200
        assert resp_s.json()["total"] == 1
        assert resp_s.json()["facilities"][0]["name"] == "Panipat Refinery"


@pytest.mark.asyncio
async def test_nearby_facilities():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Near Delhi coordinates (28.5, 77.3)
        resp = await client.get("/facility/nearby?lat=28.5&lon=77.3&radius_km=15.0")
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] >= 1
        closest = data["facilities"][0]
        assert closest["name"] == "Badarpur Thermal Power Station"
        assert closest["distance_km"] < 5.0


@pytest.mark.asyncio
async def test_evidence_chain_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/facility/1/evidence-chain?radius_km=10.0")
        assert resp.status_code == 200
        chain = resp.json()
        assert chain["facility"]["name"] == "Badarpur Thermal Power Station"
        assert "ground_sensors" in chain
        assert "fire_events" in chain
        assert "ambient_quality" in chain
        assert "regulatory_summary" in chain
        assert "thermal_correlation" in chain
        assert "data_availability" in chain


@pytest.mark.asyncio
async def test_evidence_chain_not_found():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/facility/999999/evidence-chain")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_evidence_chain_fallback_coords():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Non-existent ID, but provided fallback coordinates
        resp = await client.get(
            "/facility/custom_point/evidence-chain?radius_km=15.0&lat=28.505&lon=77.305&name=Custom+Plant"
        )
        assert resp.status_code == 200
        chain = resp.json()
        assert chain["facility"]["name"] == "Custom Plant"
        assert chain["facility"]["latitude"] == 28.505
        assert chain["facility"]["longitude"] == 77.305
        assert "ground_sensors" in chain
        assert "ambient_quality" in chain


