"""Pollution Trend Evolution Layer - Time series analysis"""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from data_sources.openaq_loader import openaq_loader
import numpy as np

async def get_pollution_trends(
    parameter: str = 'pm25',
    days: int = 30,
    location: Optional[str] = None
) -> Dict:
    """Get pollution trends over time"""
    date_to = datetime.utcnow().isoformat()
    date_from = (datetime.utcnow() - timedelta(days=days)).isoformat()

    measurements = await openaq_loader.fetch_measurements(
        date_from=date_from,
        date_to=date_to,
        parameter=parameter,
        country='IN'
    )

    if not measurements:
        return {'type': 'trend', 'data': [], 'message': 'No data'}

    # Group by date
    daily_data = {}
    for m in measurements:
        date = m['timestamp'][:10]
        if date not in daily_data:
            daily_data[date] = []
        daily_data[date].append(m['value'])

    trend_data = []
    for date in sorted(daily_data.keys()):
        values = daily_data[date]
        trend_data.append({
            'date': date,
            'avg': np.mean(values),
            'min': np.min(values),
            'max': np.max(values),
            'count': len(values)
        })

    return {'type': 'trend', 'parameter': parameter, 'data': trend_data}
