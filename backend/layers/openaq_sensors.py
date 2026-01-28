"""OpenAQ Sensor Layer - Display sensor locations"""
from typing import Dict, List
from data_sources.openaq_loader import openaq_loader
import random

def _get_fallback_sensor_data() -> List[Dict]:
    """Fallback sensor location data for major Indian cities"""
    random.seed(42)

    # Real monitoring stations in India
    stations = [
        # Delhi NCR
        {'id': 'CPCB_Delhi_1', 'name': 'Delhi - ITO', 'lat': 28.6280, 'lon': 77.2410, 'city': 'Delhi', 'params': ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']},
        {'id': 'CPCB_Delhi_2', 'name': 'Delhi - Anand Vihar', 'lat': 28.6469, 'lon': 77.3164, 'city': 'Delhi', 'params': ['pm25', 'pm10', 'no2', 'so2']},
        {'id': 'CPCB_Delhi_3', 'name': 'Delhi - R.K. Puram', 'lat': 28.5672, 'lon': 77.1865, 'city': 'Delhi', 'params': ['pm25', 'pm10', 'no2']},
        {'id': 'CPCB_Delhi_4', 'name': 'Delhi - Dwarka', 'lat': 28.5921, 'lon': 77.0460, 'city': 'Delhi', 'params': ['pm25', 'pm10']},

        # Mumbai
        {'id': 'MPCB_Mumbai_1', 'name': 'Mumbai - Bandra', 'lat': 19.0596, 'lon': 72.8295, 'city': 'Mumbai', 'params': ['pm25', 'pm10', 'no2', 'so2']},
        {'id': 'MPCB_Mumbai_2', 'name': 'Mumbai - Colaba', 'lat': 18.9067, 'lon': 72.8147, 'city': 'Mumbai', 'params': ['pm25', 'pm10', 'no2']},
        {'id': 'MPCB_Mumbai_3', 'name': 'Mumbai - Worli', 'lat': 19.0178, 'lon': 72.8178, 'city': 'Mumbai', 'params': ['pm25', 'pm10']},

        # Bangalore
        {'id': 'KSPCB_Bang_1', 'name': 'Bangalore - BTM Layout', 'lat': 12.9165, 'lon': 77.6101, 'city': 'Bangalore', 'params': ['pm25', 'pm10', 'no2']},
        {'id': 'KSPCB_Bang_2', 'name': 'Bangalore - Peenya', 'lat': 13.0285, 'lon': 77.5198, 'city': 'Bangalore', 'params': ['pm25', 'pm10']},

        # Chennai
        {'id': 'TNPCB_Chen_1', 'name': 'Chennai - Alandur', 'lat': 13.0020, 'lon': 80.2062, 'city': 'Chennai', 'params': ['pm25', 'pm10', 'no2', 'so2']},
        {'id': 'TNPCB_Chen_2', 'name': 'Chennai - Manali', 'lat': 13.1630, 'lon': 80.2581, 'city': 'Chennai', 'params': ['pm25', 'pm10']},

        # Kolkata
        {'id': 'WBPCB_Kol_1', 'name': 'Kolkata - Victoria', 'lat': 22.5448, 'lon': 88.3426, 'city': 'Kolkata', 'params': ['pm25', 'pm10', 'no2']},
        {'id': 'WBPCB_Kol_2', 'name': 'Kolkata - Jadavpur', 'lat': 22.4959, 'lon': 88.3687, 'city': 'Kolkata', 'params': ['pm25', 'pm10']},

        # Hyderabad
        {'id': 'TSPCB_Hyd_1', 'name': 'Hyderabad - Jubilee Hills', 'lat': 17.4326, 'lon': 78.4071, 'city': 'Hyderabad', 'params': ['pm25', 'pm10', 'no2']},
        {'id': 'TSPCB_Hyd_2', 'name': 'Hyderabad - Zoo Park', 'lat': 17.3500, 'lon': 78.4517, 'city': 'Hyderabad', 'params': ['pm25', 'pm10']},

        # Pune
        {'id': 'MPCB_Pune_1', 'name': 'Pune - Shivajinagar', 'lat': 18.5308, 'lon': 73.8475, 'city': 'Pune', 'params': ['pm25', 'pm10', 'no2']},
        {'id': 'MPCB_Pune_2', 'name': 'Pune - Hadapsar', 'lat': 18.5089, 'lon': 73.9260, 'city': 'Pune', 'params': ['pm25', 'pm10']},

        # Ahmedabad
        {'id': 'GPCB_Ahm_1', 'name': 'Ahmedabad - Maninagar', 'lat': 23.0045, 'lon': 72.5974, 'city': 'Ahmedabad', 'params': ['pm25', 'pm10', 'no2']},

        # Jaipur
        {'id': 'RSPCB_Jai_1', 'name': 'Jaipur - Adarsh Nagar', 'lat': 26.9314, 'lon': 75.7865, 'city': 'Jaipur', 'params': ['pm25', 'pm10']},

        # Lucknow
        {'id': 'UPPCB_Luc_1', 'name': 'Lucknow - Gomti Nagar', 'lat': 26.8557, 'lon': 81.0139, 'city': 'Lucknow', 'params': ['pm25', 'pm10', 'no2']},
        {'id': 'UPPCB_Luc_2', 'name': 'Lucknow - Talkatora', 'lat': 26.8629, 'lon': 80.9234, 'city': 'Lucknow', 'params': ['pm25', 'pm10']},

        # Kanpur
        {'id': 'UPPCB_Kan_1', 'name': 'Kanpur - Nehru Nagar', 'lat': 26.4632, 'lon': 80.3294, 'city': 'Kanpur', 'params': ['pm25', 'pm10']},

        # Patna
        {'id': 'BSPCB_Pat_1', 'name': 'Patna - IGSC Planetarium', 'lat': 25.6146, 'lon': 85.1355, 'city': 'Patna', 'params': ['pm25', 'pm10']},

        # Bhopal
        {'id': 'MPPCB_Bho_1', 'name': 'Bhopal - TT Nagar', 'lat': 23.2395, 'lon': 77.4120, 'city': 'Bhopal', 'params': ['pm25', 'pm10', 'no2']},

        # Chandigarh
        {'id': 'CPCB_Chd_1', 'name': 'Chandigarh - Sector 22', 'lat': 30.7310, 'lon': 76.7794, 'city': 'Chandigarh', 'params': ['pm25', 'pm10', 'no2']},

        # Varanasi
        {'id': 'UPPCB_Var_1', 'name': 'Varanasi - Ardhali Bazar', 'lat': 25.3204, 'lon': 83.0010, 'city': 'Varanasi', 'params': ['pm25', 'pm10']},

        # Guwahati
        {'id': 'ASPCB_Guw_1', 'name': 'Guwahati - Railway Colony', 'lat': 26.1751, 'lon': 91.7516, 'city': 'Guwahati', 'params': ['pm25', 'pm10']},

        # Visakhapatnam
        {'id': 'APPCB_Viz_1', 'name': 'Visakhapatnam - GVM Corporation', 'lat': 17.7231, 'lon': 83.3001, 'city': 'Visakhapatnam', 'params': ['pm25', 'pm10']},
    ]

    features = []
    for station in stations:
        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [station['lon'] + random.uniform(-0.01, 0.01), station['lat'] + random.uniform(-0.01, 0.01)]
            },
            'properties': {
                'id': station['id'],
                'name': station['name'],
                'city': station['city'],
                'parameters': station['params'],
                'source': 'Fallback'
            }
        })

    return features


async def get_sensor_locations() -> Dict:
    """Get all OpenAQ sensor locations"""
    features = []
    source = 'Fallback Data'

    try:
        stations = await openaq_loader.fetch_stations(country='IN', limit=500)

        for station in stations:
            if station.get('latitude') and station.get('longitude'):
                features.append({
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [station['longitude'], station['latitude']]
                    },
                    'properties': {
                        'id': station.get('station_id', ''),
                        'name': station.get('name', 'Unknown'),
                        'city': station.get('city', ''),
                        'parameters': station.get('parameters', []),
                        'source': 'OpenAQ'
                    }
                })

        if features:
            source = 'OpenAQ'
    except Exception as e:
        print(f"[WARN] OpenAQ API error: {e}")

    # If no data from API, use fallback
    if not features:
        print("[INFO] Using fallback sensor location data")
        features = _get_fallback_sensor_data()
        source = 'Fallback Data'

    print(f"[OK] Returning {len(features)} sensor locations")

    return {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'source': source
    }
