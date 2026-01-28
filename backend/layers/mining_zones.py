"""Mining Zones Layer from ISRO Bhuvan"""
from typing import Dict
from data_sources.bhuvan_loader import bhuvan_loader

async def get_mining_zones_wms() -> Dict:
    """Get Bhuvan mining zones WMS layer"""
    return {
        'type': 'wms',
        'url': bhuvan_loader.get_wms_url('mining'),
        'layer_name': 'mining',
        'title': 'Mining Zones',
        'source': 'ISRO Bhuvan'
    }
