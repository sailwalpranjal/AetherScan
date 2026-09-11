"""
State-wise Pollution Heatmap Layer
Aggregates pollution data by state boundaries
"""
from typing import Dict, List, Optional
import logging
import asyncio
from data_sources.openaq_loader import openaq_loader
from core.aqi_calculator import aqi_calculator
from db.database import db_manager
from services.data_sync import get_cached_layer, set_cached_layer

logger = logging.getLogger(__name__)

# State centroids for aggregation (with major cities for matching)
STATE_DATA = {
    'Delhi': {
        'centroid': (28.7041, 77.1025),
        'cities': ['delhi', 'new delhi', 'noida', 'ghaziabad', 'faridabad', 'gurugram', 'gurgaon']
    },
    'Maharashtra': {
        'centroid': (19.7515, 75.7139),
        'cities': ['mumbai', 'pune', 'nagpur', 'nashik', 'thane', 'aurangabad']
    },
    'Karnataka': {
        'centroid': (15.3173, 75.7139),
        'cities': ['bangalore', 'bengaluru', 'mysore', 'mangalore', 'hubli']
    },
    'Tamil Nadu': {
        'centroid': (11.1271, 78.6569),
        'cities': ['chennai', 'coimbatore', 'madurai', 'trichy', 'salem']
    },
    'Uttar Pradesh': {
        'centroid': (26.8467, 80.9462),
        'cities': ['lucknow', 'kanpur', 'agra', 'varanasi', 'allahabad', 'meerut', 'ghaziabad', 'noida']
    },
    'Gujarat': {
        'centroid': (22.2587, 71.1924),
        'cities': ['ahmedabad', 'surat', 'vadodara', 'rajkot', 'gandhinagar']
    },
    'Rajasthan': {
        'centroid': (27.0238, 74.2179),
        'cities': ['jaipur', 'jodhpur', 'udaipur', 'kota', 'ajmer']
    },
    'West Bengal': {
        'centroid': (22.9868, 87.8550),
        'cities': ['kolkata', 'howrah', 'durgapur', 'asansol', 'siliguri']
    },
    'Madhya Pradesh': {
        'centroid': (22.9734, 78.6569),
        'cities': ['bhopal', 'indore', 'jabalpur', 'gwalior', 'ujjain']
    },
    'Telangana': {
        'centroid': (18.1124, 79.0193),
        'cities': ['hyderabad', 'warangal', 'secunderabad', 'karimnagar']
    },
    'Andhra Pradesh': {
        'centroid': (15.9129, 79.7400),
        'cities': ['visakhapatnam', 'vijayawada', 'guntur', 'tirupati']
    },
    'Bihar': {
        'centroid': (25.0961, 85.3131),
        'cities': ['patna', 'gaya', 'muzaffarpur', 'bhagalpur']
    },
    'Odisha': {
        'centroid': (20.9517, 85.0985),
        'cities': ['bhubaneswar', 'cuttack', 'rourkela', 'puri']
    },
    'Kerala': {
        'centroid': (10.8505, 76.2711),
        'cities': ['kochi', 'thiruvananthapuram', 'kozhikode', 'thrissur']
    },
    'Haryana': {
        'centroid': (29.0588, 76.0856),
        'cities': ['chandigarh', 'faridabad', 'gurgaon', 'gurugram', 'ambala', 'hisar', 'panipat', 'karnal']
    },
    'Punjab': {
        'centroid': (31.1471, 75.3412),
        'cities': ['ludhiana', 'amritsar', 'jalandhar', 'patiala', 'bathinda']
    },
    'Jharkhand': {
        'centroid': (23.6102, 85.2799),
        'cities': ['ranchi', 'jamshedpur', 'dhanbad', 'bokaro']
    },
    'Chhattisgarh': {
        'centroid': (21.2787, 81.8661),
        'cities': ['raipur', 'bhilai', 'bilaspur', 'korba']
    },
    'Assam': {
        'centroid': (26.2006, 92.9376),
        'cities': ['guwahati', 'silchar', 'dibrugarh']
    },
    'Uttarakhand': {
        'centroid': (30.0668, 79.0193),
        'cities': ['dehradun', 'haridwar', 'rishikesh', 'nainital']
    },
}

def _match_city_to_state(city_name: str) -> str:
    """Match a city name or state name to its state"""
    if not city_name:
        return None
    city_lower = city_name.lower().strip()

    for state_name, data in STATE_DATA.items():
        if state_name.lower() == city_lower or state_name.lower() in city_lower:
            return state_name
        for city in data['cities']:
            if city in city_lower or city_lower in city:
                return state_name

    return None



def _get_fallback_state_data() -> List[Dict]:
    """
    Deprecated fallback stub adhering to Zero-Fake-Data invariant.
    Returns an empty list instead of synthetic state pollution records.
    """
    logger.warning("Zero-Fake-Data: fallback state data requested, returning []")
    return []


async def get_state_wise_pollution() -> Dict:
    """
    Get pollution aggregated by state using multiple data sources

    Returns:
        Dict with state-level pollution data
    """
    cache_key = "state_heatmap"
    cached = get_cached_layer(cache_key)
    if cached:
        return cached

    from data_sources.aqicn_service import get_aqicn_service

    features = []
    state_data = {}
    data_source = 'None'

    # Try OpenAQ first (fast: checks local DB first via openaq_loader in <2ms)
    try:
        measurements = await asyncio.wait_for(
            openaq_loader.fetch_latest_measurements(country='IN'),
            timeout=2.5
        )

        if measurements:
            for measure in measurements:
                city = measure.get('city', '') or measure.get('location', '')
                parameter = measure.get('parameter', '').lower()
                value = measure.get('value', 0)

                matched_state = _match_city_to_state(city)
                if not matched_state:
                    continue

                if matched_state not in state_data:
                    state_data[matched_state] = {}
                if parameter not in state_data[matched_state]:
                    state_data[matched_state][parameter] = []
                state_data[matched_state][parameter].append(value)

            if state_data:
                data_source = 'OpenAQ'
                logger.info(f"OpenAQ: Found data for {len(state_data)} states")
    except Exception as e:
        logger.warning(f"OpenAQ error or timeout: {e}")

    # If OpenAQ didn't provide enough data, supplement with AQICN
    if len(state_data) < 10:
        try:
            aqicn_service = get_aqicn_service()
            if aqicn_service:
                async def fetch_city_aqi(s_name: str, c_name: str):
                    try:
                        res = await asyncio.wait_for(aqicn_service.get_aqi_by_city_name(c_name), timeout=2.0)
                        if res and 'aqi' in res:
                            val = res['aqi']
                            if val != '-' and isinstance(val, (int, float)):
                                return s_name, int(val)
                    except Exception:
                        pass
                    return s_name, None

                tasks = []
                for state_name, state_info in STATE_DATA.items():
                    if state_name in state_data and len(state_data[state_name]) >= 2:
                        continue
                    cities = state_info.get('cities', [])
                    if cities:
                        tasks.append(fetch_city_aqi(state_name, cities[0]))

                if tasks:
                    try:
                        city_results = await asyncio.wait_for(
                            asyncio.gather(*tasks, return_exceptions=True),
                            timeout=3.0
                        )
                    except Exception:
                        city_results = []
                    for item in city_results:
                        if isinstance(item, tuple) and item[1] is not None:
                            s_name, aqi_val = item
                            if s_name not in state_data:
                                state_data[s_name] = {}
                            state_data[s_name]['pm25'] = [aqi_val * 0.5]
                            state_data[s_name]['aqi_direct'] = [aqi_val]

                    if len(state_data) > 0:
                        data_source = 'OpenAQ + AQICN' if data_source == 'OpenAQ' else 'AQICN'
        except Exception as e:
            logger.warning(f"AQICN error: {e}")

    # Calculate AQI for each state
    for state_name, pollutants in state_data.items():
        avg_pollutants = {}

        # Check for direct AQI from AQICN
        if 'aqi_direct' in pollutants:
            aqi_value = int(sum(pollutants['aqi_direct']) / len(pollutants['aqi_direct'])) if pollutants['aqi_direct'] else 0
            if aqi_value <= 50:
                category, color = 'Good', '#00E400'
            elif aqi_value <= 100:
                category, color = 'Moderate', '#FFFF00'
            elif aqi_value <= 150:
                category, color = 'Unhealthy for Sensitive', '#FF7E00'
            elif aqi_value <= 200:
                category, color = 'Unhealthy', '#FF0000'
            elif aqi_value <= 300:
                category, color = 'Very Unhealthy', '#8F3F97'
            else:
                category, color = 'Hazardous', '#7E0023'

            aqi_result = {
                'aqi': aqi_value,
                'category': category,
                'color': color,
                'dominant_pollutant': 'PM2.5'
            }
        else:
            # Calculate from pollutant values
            for param, values in pollutants.items():
                if values and param != 'aqi_direct':
                    avg_pollutants[param] = sum(values) / len(values) if values else 0.0

            if not avg_pollutants:
                continue

            aqi_result = aqi_calculator.calculate_aqi(avg_pollutants)

        if state_name in STATE_DATA:
            lat, lon = STATE_DATA[state_name]['centroid']

            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [lon, lat]
                },
                'properties': {
                    'state': state_name,
                    'aqi': aqi_result['aqi'],
                    'category': aqi_result['category'],
                    'color': aqi_result['color'],
                    'dominant_pollutant': aqi_result.get('dominant_pollutant', 'PM2.5'),
                    'pollutants': {k: v for k, v in avg_pollutants.items() if k != 'aqi_direct'},
                    'source': data_source
                }
            })

    # Zero-Fake-Data Invariant: If no data from APIs, return empty collection cleanly
    if not features:
        data_source = 'None'

    result = {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'source': data_source,
        'description': 'State-wise pollution aggregation with AQI'
    }
    if features:
        set_cached_layer(cache_key, result)

    return result
