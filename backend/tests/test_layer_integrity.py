"""
Dedicated Zero-Fake-Data Invariant & Layer Integrity Test Suite.

Verifies:
1. All fallback stubs in backend/layers/ return empty lists ([]).
2. All layer generator coroutines return clean empty FeatureCollections with source 'None'
   when upstream data sources are unavailable or raise exceptions.
3. Static AST analysis confirms complete absence of 'import random' and random jitter
   across all layer modules.
"""

import ast
from pathlib import Path
import sys
import unittest.mock as mock
import pytest

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import layers.openaq_sensors as openaq_sensors
import layers.state_heatmap as state_heatmap
import layers.pollution_heatmap as pollution_heatmap
import layers.wind_climate as wind_climate
import layers.population_density as population_density


class TestFallbackStubsReturnEmpty:
    """Verify that all deprecated fallback stubs return empty lists without synthesizing points."""

    def test_openaq_sensors_fallback_stub(self):
        assert openaq_sensors._get_fallback_sensor_data() == []

    def test_state_heatmap_fallback_stub(self):
        assert state_heatmap._get_fallback_state_data() == []

    def test_pollution_heatmap_fallback_stub(self):
        assert pollution_heatmap._get_fallback_pollution_data() == []

    def test_wind_climate_fallback_stub(self):
        assert wind_climate._get_fallback_wind_data() == []

    def test_population_density_fallback_stub(self):
        assert population_density._get_fallback_population_data() == []


class TestLayerZeroFakeDataBehavior:
    """Verify that layer generators return empty collections with source 'None' on missing/failing data."""

    @pytest.mark.asyncio
    async def test_openaq_sensors_empty_on_loader_empty(self):
        with mock.patch("layers.openaq_sensors.openaq_loader.fetch_stations", new=mock.AsyncMock(return_value=[])):
            res = await openaq_sensors.get_sensor_locations()
            assert res == {
                'type': 'FeatureCollection',
                'features': [],
                'count': 0,
                'source': 'None'
            }

    @pytest.mark.asyncio
    async def test_openaq_sensors_empty_on_loader_exception(self):
        with mock.patch("layers.openaq_sensors.openaq_loader.fetch_stations", new=mock.AsyncMock(side_effect=ConnectionError("Offline"))):
            res = await openaq_sensors.get_sensor_locations()
            assert res == {
                'type': 'FeatureCollection',
                'features': [],
                'count': 0,
                'source': 'None'
            }

    @pytest.mark.asyncio
    async def test_state_heatmap_empty_on_loader_empty(self):
        with mock.patch("layers.state_heatmap.openaq_loader.fetch_latest_measurements", new=mock.AsyncMock(return_value=[])):
            with mock.patch("data_sources.aqicn_service.get_aqicn_service", return_value=None):
                res = await state_heatmap.get_state_wise_pollution()
                assert res == {
                    'type': 'FeatureCollection',
                    'features': [],
                    'count': 0,
                    'source': 'None',
                    'description': 'State-wise pollution aggregation with AQI'
                }

    @pytest.mark.asyncio
    async def test_state_heatmap_empty_on_exception(self):
        with mock.patch("layers.state_heatmap.openaq_loader.fetch_latest_measurements", new=mock.AsyncMock(side_effect=RuntimeError("Fail"))):
            with mock.patch("data_sources.aqicn_service.get_aqicn_service", side_effect=RuntimeError("Fail")):
                res = await state_heatmap.get_state_wise_pollution()
                assert res["type"] == "FeatureCollection"
                assert res["features"] == []
                assert res["count"] == 0
                assert res["source"] == "None"

    @pytest.mark.asyncio
    async def test_pollution_heatmap_empty_on_uninitialized_service(self):
        with mock.patch("layers.pollution_heatmap.get_aqicn_service", return_value=None):
            res = await pollution_heatmap.get_national_pollution_heatmap()
            assert res["type"] == "heatmap"
            assert res["data"] == []
            assert res["source"] == "None"
            assert res["sensor_count"] == 0

    @pytest.mark.asyncio
    async def test_wind_climate_empty_on_timeout(self):
        import asyncio
        with mock.patch("layers.wind_climate.nasa_power_loader.fetch_wind_climate_india", new=mock.AsyncMock(side_effect=asyncio.TimeoutError())):
            res = await wind_climate.get_wind_climate()
            assert res["type"] == "FeatureCollection"
            assert res["features"] == []
            assert res["count"] == 0
            assert res["source"] == "None"

    @pytest.mark.asyncio
    async def test_population_density_empty_on_unavailable(self):
        with mock.patch("layers.population_density.worldpop_loader.is_data_available", return_value=False):
            with mock.patch("data_sources.census_excel_processor.census_excel_processor.get_state_population_grid", return_value=[]):
                res = await population_density.get_population_points()
                assert res["type"] == "FeatureCollection"
                assert res["features"] == []
                assert res["count"] == 0
                assert res["source"] == "None"


class TestStaticASTZeroRandomInvariant:
    """AST & source inspection to prove 'random' is completely purged from all layers."""

    LAYER_FILES = [
        "openaq_sensors.py",
        "state_heatmap.py",
        "pollution_heatmap.py",
        "wind_climate.py",
        "population_density.py",
    ]

    def test_no_random_import_via_ast(self):
        layers_dir = backend_dir / "layers"
        for filename in self.LAYER_FILES:
            filepath = layers_dir / filename
            assert filepath.exists(), f"Layer file {filename} does not exist"
            tree = ast.parse(filepath.read_text(encoding="utf-8"), filename=str(filepath))

            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        assert alias.name != "random", f"Forbidden 'import random' found in {filename} at line {node.lineno}"
                elif isinstance(node, ast.ImportFrom):
                    assert node.module != "random", f"Forbidden 'from random import ...' found in {filename} at line {node.lineno}"

    def test_no_random_attribute_access_via_ast(self):
        layers_dir = backend_dir / "layers"
        for filename in self.LAYER_FILES:
            filepath = layers_dir / filename
            tree = ast.parse(filepath.read_text(encoding="utf-8"), filename=str(filepath))

            for node in ast.walk(tree):
                if isinstance(node, ast.Attribute):
                    if isinstance(node.value, ast.Name) and node.value.id == "random":
                        assert False, f"Forbidden 'random.{node.attr}' call found in {filename} at line {node.lineno}"


class TestStateHeatmapPositiveIntegration:
    """Verify that state_heatmap layer correctly aggregates real measurements and direct AQI."""

    @pytest.mark.asyncio
    async def test_state_heatmap_with_real_measurements(self):
        sample_measurements = [
            {'city': 'Delhi', 'parameter': 'pm25', 'value': 45.0},
            {'city': 'Delhi', 'parameter': 'pm10', 'value': 90.0},
        ]
        with mock.patch("layers.state_heatmap.openaq_loader.fetch_latest_measurements", new=mock.AsyncMock(return_value=sample_measurements)):
            with mock.patch("data_sources.aqicn_service.get_aqicn_service", return_value=None):
                result = await state_heatmap.get_state_wise_pollution()
                assert result['count'] > 0
                assert result['source'] == 'OpenAQ'
                assert len(result['features']) == result['count']

                delhi_feat = next((f for f in result['features'] if f['properties']['state'] == 'Delhi'), None)
                assert delhi_feat is not None, "Delhi feature should be present in results"
                props = delhi_feat['properties']
                assert props['aqi'] > 0
                assert 'pollutants' in props
                assert props['pollutants'].get('pm25') == 45.0
                assert props['pollutants'].get('pm10') == 90.0
                assert props['category'] in ('Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe', 'Hazardous')
                assert props['source'] == 'OpenAQ'

    @pytest.mark.asyncio
    async def test_state_heatmap_with_aqicn_direct_aqi(self):
        """Test the direct AQI path (line 199) by supplying station data with 'aqi' key."""
        mock_aqicn = mock.AsyncMock()
        mock_aqicn.get_aqi_by_city_name = mock.AsyncMock(return_value={'aqi': 85})

        with mock.patch("layers.state_heatmap.openaq_loader.fetch_latest_measurements", new=mock.AsyncMock(return_value=[])):
            with mock.patch("data_sources.aqicn_service.get_aqicn_service", return_value=mock_aqicn):
                with mock.patch("asyncio.sleep", new=mock.AsyncMock()):
                    result = await state_heatmap.get_state_wise_pollution()
                    assert result['count'] > 0
                    assert len(result['features']) == result['count']

                    delhi_feat = next((f for f in result['features'] if f['properties']['state'] == 'Delhi'), None)
                    assert delhi_feat is not None, "Delhi feature should be present in AQICN direct AQI results"
                    props = delhi_feat['properties']
                    assert props['aqi'] == 85
                    assert props['category'] == 'Moderate'
                    assert props['color'] == '#FFFF00'
                    assert props['dominant_pollutant'] == 'PM2.5'
