"""Population Exposure Risk Layer"""
from typing import Dict
from data_sources.census_loader import census_loader
from data_sources.openaq_loader import openaq_loader
from core.aqi_calculator import aqi_calculator
from core.idw_interpolation import IDWInterpolator
import numpy as np

async def calculate_population_exposure() -> Dict:
    """Calculate population exposure risk"""
    pop_data = census_loader.load_population_data()
    measurements = await openaq_loader.fetch_latest_measurements(country='IN')

    if not measurements or not pop_data:
        return {
            'type': 'FeatureCollection',
            'features': [],
            'count': 0,
            'message': 'Insufficient data',
            'source': 'Census + OpenAQ'
        }

    # Build interpolator for PM2.5
    pm25_points = []
    pm25_values = []
    for m in measurements:
        if m['parameter'].lower() in ['pm25', 'pm2.5'] and m['latitude'] and m['longitude']:
            pm25_points.append([m['latitude'], m['longitude']])
            pm25_values.append(m['value'])

    if len(pm25_points) < 3:
        return {
            'type': 'FeatureCollection',
            'features': [],
            'count': 0,
            'message': 'Insufficient sensor data',
            'source': 'Census + OpenAQ'
        }

    interpolator = IDWInterpolator(power=2.0, neighbors=10)
    interpolator.fit(np.array(pm25_points), np.array(pm25_values))

    # Calculate exposure for each population center - Return as GeoJSON
    features = []
    for record in pop_data:
        lat = record.get('latitude')
        lon = record.get('longitude')

        # Validate coordinates
        if lat is None or lon is None:
            continue

        try:
            lat = float(lat)
            lon = float(lon)
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                continue
        except (ValueError, TypeError):
            continue

        pm25_value = interpolator.interpolate_point(lat, lon)
        exposure_risk = record['population'] * pm25_value / 1000000  # Normalized risk score

        # Determine risk category
        if exposure_risk < 10:
            risk_category = 'Low'
            risk_color = '#00E400'
        elif exposure_risk < 25:
            risk_category = 'Moderate'
            risk_color = '#FFFF00'
        elif exposure_risk < 50:
            risk_category = 'High'
            risk_color = '#FF7E00'
        elif exposure_risk < 100:
            risk_category = 'Very High'
            risk_color = '#FF0000'
        else:
            risk_category = 'Extreme'
            risk_color = '#8F3F97'

        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [lon, lat]
            },
            'properties': {
                'location': record.get('location', 'Unknown'),
                'state': record.get('state', 'Unknown'),
                'population': record['population'],
                'pm25': round(float(pm25_value), 2),
                'exposure_risk': round(float(exposure_risk), 2),
                'risk_category': risk_category,
                'risk_color': risk_color
            }
        })

    print(f"[OK] Generated {len(features)} population exposure points")

    return {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'source': 'Census India + OpenAQ PM2.5',
        'description': 'Population exposure risk analysis'
    }
