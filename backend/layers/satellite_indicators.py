"""
Satellite Imagery Layers - WITH REAL NASA SATELLITE DATA
"""
from typing import Dict
from data_sources.bhuvan_loader import bhuvan_loader
from data_sources.nasa_satellite_loader import nasa_satellite_loader

async def get_satellite_imagery() -> Dict:
    """Get Bhuvan high-resolution satellite imagery"""
    return {
        'type': 'wms',
        'url': bhuvan_loader.get_wms_url('india_satellite'),
        'layer_name': 'india3',
        'title': 'India Satellite Imagery',
        'source': 'ISRO Bhuvan',
        'description': 'High-resolution satellite imagery of India'
    }

async def get_satellite_no2() -> Dict:
    """
    NO2 satellite layer - REAL NASA OMI DATA
    Uses OMI-Aura Level 2 NO2 tropospheric column data
    """
    print("[INFO] Loading NO2 from NASA OMI satellite data - UPDATED")

    try:
        # Debug: Check loader cache directory
        from pathlib import Path
        cache_dir_check = Path(nasa_satellite_loader.cache_dir)
        print(f"[DEBUG] Loader cache_dir: {cache_dir_check}")
        print(f"[DEBUG] Cache dir exists: {cache_dir_check.exists()}")
        if cache_dir_check.exists():
            omi_files = list(cache_dir_check.glob("OMI-*.he5"))
            print(f"[DEBUG] OMI files in cache: {[f.name for f in omi_files]}")

        # Load REAL OMI NO2 data from HE5 file
        no2_data = nasa_satellite_loader.load_omi_no2()

        if not no2_data:
            print("[WARN] No OMI NO2 data available, returning empty")
            return {
                'type': 'FeatureCollection',
                'features': [],
                'count': 0,
                'message': f'No OMI NO2 data files found in {cache_dir_check}',
                'source': 'NASA OMI'
            }

        features = []

        for point in no2_data:
            lat = point.get('latitude')
            lon = point.get('longitude')

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

            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [lon, lat]
                },
                'properties': {
                    'no2_concentration': point['no2_concentration'],
                    'unit': point['unit'],
                    'quality': point['quality'],
                    'source': 'NASA OMI-Aura L2',
                    'instrument': 'Ozone Monitoring Instrument',
                    'product': 'OMNO2 - Tropospheric NO2 Column'
                }
            })

        print(f"[OK] Loaded {len(features)} NO2 points from NASA OMI satellite data")

        return {
            'type': 'FeatureCollection',
            'features': features,
            'count': len(features),
            'source': 'NASA OMI-Aura Level 2 (REAL SATELLITE DATA)',
            'description': 'Nitrogen dioxide tropospheric column measurements from OMI satellite',
            'satellite': 'Aura',
            'instrument': 'OMI (Ozone Monitoring Instrument)',
            'url': 'https://disc.gsfc.nasa.gov/datasets/OMNO2_003/summary'
        }

    except Exception as e:
        print(f"[ERROR] Error loading OMI NO2 data: {e}")
        return {
            'type': 'FeatureCollection',
            'features': [],
            'count': 0,
            'error': str(e),
            'source': 'NASA OMI'
        }

async def get_satellite_so2() -> Dict:
    """
    SO2 satellite layer - REALISTIC POLLUTION-BASED GRID
    Uses realistic SO2 concentrations based on known industrial zones
    """
    print("[INFO] Generating SO2 grid based on India pollution patterns")

    try:
        # Generate realistic SO2 grid
        so2_data = nasa_satellite_loader.get_so2_sample_grid()

        if not so2_data:
            print("[WARN] No SO2 data generated")
            return {
                'type': 'FeatureCollection',
                'features': [],
                'count': 0,
                'source': 'SO2 Model'
            }

        features = []

        for point in so2_data:
            lat = point.get('latitude')
            lon = point.get('longitude')

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

            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [lon, lat]
                },
                'properties': {
                    'so2_concentration': point['so2_concentration'],
                    'unit': point['unit'],
                    'quality': point['quality'],
                    'source': point.get('source', 'Industrial zone model'),
                    'description': 'SO2 based on industrial activity patterns'
                }
            })

        print(f"[OK] Generated {len(features)} SO2 grid points")

        return {
            'type': 'FeatureCollection',
            'features': features,
            'count': len(features),
            'source': 'Industrial Zone SO2 Model (Based on known pollution sources)',
            'description': 'Sulfur dioxide concentrations modeled from industrial activity',
            'note': 'Estimated values based on major industrial zones in India'
        }

    except Exception as e:
        print(f"[ERROR] Error generating SO2 data: {e}")
        return {
            'type': 'FeatureCollection',
            'features': [],
            'count': 0,
            'error': str(e),
            'source': 'SO2 Model'
        }

async def get_satellite_aod() -> Dict:
    """
    Get Aerosol Optical Depth (AOD) from REAL NASA VIIRS satellite data
    Uses VIIRS Deep Blue AOD Level 2 data
    """
    print("[INFO] Loading AOD from NASA VIIRS satellite data")

    try:
        # Load REAL VIIRS AOD data from NetCDF file
        aod_data = nasa_satellite_loader.load_viirs_aod()

        if not aod_data:
            # Fallback to Bhuvan WMS if local file not available
            print("[INFO] VIIRS AOD file not found, using Bhuvan WMS")
            wms_url = bhuvan_loader.get_wms_url('aod')

            return {
                'type': 'wms',
                'url': wms_url,
                'layer_name': 'aod',
                'title': 'Aerosol Optical Depth (AOD)',
                'source': 'ISRO Bhuvan',
                'attribution': 'ISRO NRSC',
                'description': 'Satellite-derived aerosol optical depth indicating air pollution levels'
            }

        # Convert to GeoJSON
        features = []

        for point in aod_data:
            lat = point.get('latitude')
            lon = point.get('longitude')

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

            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [lon, lat]
                },
                'properties': {
                    'aod_550nm': point['aod'],  # Using 550nm as standard AOD wavelength
                    'quality': point['quality'],
                    'wavelength': point['wavelength'],
                    'source': 'NASA VIIRS Deep Blue',
                    'satellite': 'Suomi-NPP',
                    'instrument': 'VIIRS'
                }
            })

        print(f"[OK] Loaded {len(features)} AOD points from NASA VIIRS satellite data")

        return {
            'type': 'FeatureCollection',
            'features': features,
            'count': len(features),
            'source': 'NASA VIIRS Deep Blue AOD Level 2 (REAL SATELLITE DATA)',
            'description': 'Aerosol Optical Depth at 550nm from VIIRS satellite',
            'satellite': 'Suomi-NPP',
            'instrument': 'VIIRS (Visible Infrared Imaging Radiometer Suite)',
            'url': 'https://ladsweb.modaps.eosdis.nasa.gov/'
        }

    except Exception as e:
        print(f"[ERROR] Error loading VIIRS AOD: {e}")
        # Fallback to Bhuvan WMS
        try:
            wms_url = bhuvan_loader.get_wms_url('aod')
            return {
                'type': 'wms',
                'url': wms_url,
                'layer_name': 'aod',
                'title': 'Aerosol Optical Depth (AOD)',
                'source': 'ISRO Bhuvan',
                'attribution': 'ISRO NRSC',
                'description': 'Satellite-derived aerosol optical depth',
                'error': str(e)
            }
        except Exception as e2:
            return {
                'type': 'FeatureCollection',
                'features': [],
                'count': 0,
                'error': str(e),
                'source': 'NASA VIIRS / ISRO Bhuvan'
            }
