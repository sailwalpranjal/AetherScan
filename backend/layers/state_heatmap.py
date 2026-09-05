"""
State-wise Pollution Heatmap Layer
Aggregates pollution data by state boundaries
"""
from typing import Dict, List
import logging
from data_sources.openaq_loader import openaq_loader
from core.aqi_calculator import aqi_calculator

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
    """Match a city name to its state"""
    city_lower = city_name.lower().strip()

    for state_name, data in STATE_DATA.items():
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
    import asyncio
    from data_sources.aqicn_service import get_aqicn_service

    features = []
    state_data = {}
    data_source = 'None'

    # Try OpenAQ first
    try:
        measurements = await openaq_loader.fetch_latest_measurements(country='IN')

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
                print(f"[OK] OpenAQ: Found data for {len(state_data)} states")
    except Exception as e:
        logger.warning(f"OpenAQ error: {e}")

    # If OpenAQ didn't provide enough data, supplement with AQICN
    if len(state_data) < 10:
        try:
            aqicn_service = get_aqicn_service()
            if aqicn_service:
                # Query major cities for each state
                for state_name, state_info in STATE_DATA.items():
                    if state_name in state_data and len(state_data[state_name]) >= 2:
                        continue  # Already have data for this state

                    # Try first city for this state
                    cities = state_info.get('cities', [])
                    if cities:
                        try:
                            # Note: get_aqi_by_city_name returns data directly (not wrapped in status)
                            result = await aqicn_service.get_aqi_by_city_name(cities[0])
                            # result IS the data since _make_request returns data.get('data', {})
                            if result and 'aqi' in result:
                                aqi_val = result['aqi']
                                if aqi_val != '-' and isinstance(aqi_val, (int, float)):
                                    if state_name not in state_data:
                                        state_data[state_name] = {}
                                    # AQICN returns overall AQI, estimate PM2.5
                                    state_data[state_name]['pm25'] = [aqi_val * 0.5]  # Rough estimate
                                    state_data[state_name]['aqi_direct'] = [int(aqi_val)]
                                    print(f"[OK] AQICN: Got AQI {aqi_val} for {state_name}")
                            await asyncio.sleep(0.1)  # Rate limiting
                        except Exception:
                            continue

                if len(state_data) > 10:
                    data_source = 'OpenAQ + AQICN'
                    print(f"[OK] AQICN: Supplemented to {len(state_data)} states")
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

    logger.info(f"Returning {len(features)} state pollution aggregations from {data_source}")

    return {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'source': data_source,
        'description': 'State-wise pollution aggregation with AQI'
    }
