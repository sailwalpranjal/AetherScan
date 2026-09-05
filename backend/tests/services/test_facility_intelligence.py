import pytest
from services.facility_intelligence import FacilityIntelligenceService

class MockDB:
    async def fetch_one(self, query, params):
        if params.get("id") == "123":
            return {
                "id": "123",
                "name": "Test Factory",
                "latitude": 45.0,
                "longitude": 10.0,
                "type": "manufacturing",
                "state": "Test State",
                "capacity": "High"
            }
        return None

@pytest.mark.asyncio
async def test_generate_bounding_box():
    service = FacilityIntelligenceService(MockDB())
    bbox = service.generate_bounding_box(45.0, 10.0, 11.1)
    
    assert bbox["min_lat"] == pytest.approx(44.9, 0.1)
    assert bbox["max_lat"] == pytest.approx(45.1, 0.1)

@pytest.mark.asyncio
async def test_get_environmental_context():
    service = FacilityIntelligenceService(MockDB())
    context = await service.get_environmental_context("123")
    
    assert context["facility"]["name"] == "Test Factory"
    assert "bbox" in context["spatial_context"]
