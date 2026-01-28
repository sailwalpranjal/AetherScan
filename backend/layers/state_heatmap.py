"""
State-wise Pollution Heatmap Layer
Aggregates pollution data by state boundaries
"""
from typing import Dict, List
from data_sources.openaq_loader import openaq_loader
from core.aqi_calculator import aqi_calculator
import numpy as np
import random

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

# Fallback AQI data by state (realistic values)
FALLBACK_STATE_AQI = {
    'Delhi': {'aqi': 185, 'pm25': 95, 'pm10': 180},
    'Maharashtra': {'aqi': 95, 'pm25': 45, 'pm10': 85},
    'Karnataka': {'aqi': 75, 'pm25': 35, 'pm10': 65},
    'Tamil Nadu': {'aqi': 85, 'pm25': 40, 'pm10': 75},
    'Uttar Pradesh': {'aqi': 165, 'pm25': 85, 'pm10': 155},
    'Gujarat': {'aqi': 115, 'pm25': 55, 'pm10': 105},
    'Rajasthan': {'aqi': 140, 'pm25': 70, 'pm10': 130},
    'West Bengal': {'aqi': 125, 'pm25': 60, 'pm10': 115},
    'Madhya Pradesh': {'aqi': 110, 'pm25': 52, 'pm10': 100},
    'Telangana': {'aqi': 90, 'pm25': 42, 'pm10': 80},
    'Andhra Pradesh': {'aqi': 80, 'pm25': 38, 'pm10': 70},
    'Bihar': {'aqi': 155, 'pm25': 78, 'pm10': 145},
    'Odisha': {'aqi': 95, 'pm25': 45, 'pm10': 85},
    'Kerala': {'aqi': 55, 'pm25': 25, 'pm10': 50},
    'Haryana': {'aqi': 150, 'pm25': 75, 'pm10': 140},
    'Punjab': {'aqi': 145, 'pm25': 72, 'pm10': 135},
    'Jharkhand': {'aqi': 120, 'pm25': 58, 'pm10': 110},
    'Chhattisgarh': {'aqi': 105, 'pm25': 50, 'pm10': 95},
    'Assam': {'aqi': 85, 'pm25': 40, 'pm10': 75},
    'Uttarakhand': {'aqi': 70, 'pm25': 32, 'pm10': 60},
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
    """Generate fallback state-wise pollution data"""
    random.seed(42)

    features = []
    for state_name, data in STATE_DATA.items():
        lat, lon = data['centroid']
        fallback = FALLBACK_STATE_AQI.get(state_name, {'aqi': 100, 'pm25': 50, 'pm10': 90})

        # Add some variation
        aqi = fallback['aqi'] + random.randint(-15, 15)
        aqi = max(0, min(500, aqi))

        # Calculate category and color
        if aqi <= 50:
            category, color = 'Good', '#00E400'
        elif aqi <= 100:
            category, color = 'Moderate', '#FFFF00'
        elif aqi <= 150:
            category, color = 'Unhealthy for Sensitive', '#FF7E00'
        elif aqi <= 200:
            category, color = 'Unhealthy', '#FF0000'
        elif aqi <= 300:
            category, color = 'Very Unhealthy', '#8F3F97'
        else:
            category, color = 'Hazardous', '#7E0023'

        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [lon, lat]
            },
            'properties': {
                'state': state_name,
                'aqi': aqi,
                'category': category,
                'color': color,
                'dominant_pollutant': 'PM2.5',
                'pollutants': {
                    'pm25': fallback['pm25'] + random.randint(-5, 5),
                    'pm10': fallback['pm10'] + random.randint(-10, 10)
                },
                'source': 'Fallback'
            }
        })

    return features


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
    data_source = 'Unknown'

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
        print(f"[WARN] OpenAQ error: {e}")

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
                        except Exception as e:
                            continue

                if len(state_data) > 10:
                    data_source = 'OpenAQ + AQICN'
                    print(f"[OK] AQICN: Supplemented to {len(state_data)} states")
        except Exception as e:
            print(f"[WARN] AQICN error: {e}")

    # Calculate AQI for each state
    for state_name, pollutants in state_data.items():
        avg_pollutants = {}

        # Check for direct AQI from AQICN
        if 'aqi_direct' in pollutants:
            aqi_value = int(np.mean(pollutants['aqi_direct']))
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
                    avg_pollutants[param] = np.mean(values)

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

    # If no data from APIs, use fallback
    if not features:
        print("[INFO] Using fallback state pollution data")
        features = _get_fallback_state_data()
        data_source = 'Fallback Data'

    # Ensure we always have at least some data
    if not features or len(features) < 5:
        print("[INFO] Using fallback state pollution data (insufficient API data)")
        features = _get_fallback_state_data()
        data_source = 'Fallback Data'

    print(f"[OK] Generated {len(features)} state pollution aggregations")

    return {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'source': data_source,
        'description': 'State-wise pollution aggregation with AQI'
    }
