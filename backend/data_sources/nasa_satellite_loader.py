"""
NASA Satellite Data Loader - REAL SATELLITE & OBSERVATIONAL DATA
Processes OMI NO2, VIIRS AOD, and AIRS data from NASA & verified monitoring networks
Strict zero-fake-data policy: No synthetic random jitter (np.random.uniform).
"""
import logging
import sqlite3
from pathlib import Path
from typing import List, Dict, Optional
import numpy as np

from config.settings import settings

logger = logging.getLogger(__name__)

# Optional HDF5/NetCDF support - graceful degradation if unavailable
try:
    import h5py
    H5PY_AVAILABLE = True
except ImportError:
    h5py = None
    H5PY_AVAILABLE = False

try:
    from netCDF4 import Dataset
    NETCDF4_AVAILABLE = True
except ImportError:
    Dataset = None
    NETCDF4_AVAILABLE = False


class NASASatelliteLoader:
    """Load and process NASA satellite data files and verified observational datasets."""

    def __init__(self):
        backend_dir = Path(__file__).parent.parent
        self.cache_dir = backend_dir / "cache" / "data"
        self.nasa_api_key = settings.NASA_EARTHDATA_API_KEY
        logger.info(f"[INIT] NASA Satellite Loader cache_dir: {self.cache_dir}")

    def _get_db_connection(self) -> Optional[sqlite3.Connection]:
        """Establish connection to local database for verified observational ground truth."""
        try:
            db_path = Path(settings.DATABASE_PATH).resolve()
            if db_path.exists():
                return sqlite3.connect(str(db_path))
        except Exception as e:
            logger.warning(f"Could not connect to database: {e}")
        return None

    def _load_db_measurements(self, parameter: str) -> List[Dict]:
        """
        Query verified observational sensor data for a specific pollutant
        from OpenAQ / CPCB stations stored in SQLite.
        """
        conn = self._get_db_connection()
        if not conn:
            return []
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT s.name, s.latitude, s.longitude, m.value, m.unit, m.dqs
                FROM openaq_measurements m
                JOIN openaq_stations s ON m.station_id = s.station_id
                WHERE m.parameter = ? AND m.value IS NOT NULL AND m.value > 0
                ORDER BY m.timestamp DESC
            """, (parameter,))
            rows = cur.fetchall()
            results = []
            seen_locs = set()
            for name, lat, lon, val, unit, dqs in rows:
                if lat is None or lon is None:
                    continue
                loc_key = (round(float(lat), 3), round(float(lon), 3))
                if loc_key in seen_locs:
                    continue
                seen_locs.add(loc_key)
                results.append({
                    'name': name,
                    'latitude': float(lat),
                    'longitude': float(lon),
                    'value': float(val),
                    'unit': unit or 'µg/m³',
                    'quality': 'verified_cpcb' if (dqs and dqs > 0.7) else 'good',
                    'dqs': dqs or 0.85
                })
            return results
        except Exception as e:
            logger.warning(f"Error querying {parameter} from database: {e}")
            return []
        finally:
            conn.close()

    def load_omi_no2(self) -> List[Dict]:
        """
        Load OMI NO2 data from local HDF5 files if intersecting India,
        or from verified CPCB/OpenAQ ground monitoring network observations.

        Returns:
            List of NO2 measurements with lat, lon, value
        """
        logger.info("[INFO] Loading real NO2 observations (Satellite / CPCB Network)")

        # 1. Try local HDF5 satellite file
        if H5PY_AVAILABLE and self.cache_dir.exists():
            omi_files = list(self.cache_dir.glob("OMI-*.he5"))
            for omi_file in omi_files:
                try:
                    with h5py.File(str(omi_file), 'r') as f:
                        swath = f.get('HDFEOS/SWATHS/ColumnAmountNO2')
                        if swath:
                            lats = swath['Geolocation Fields/Latitude'][:]
                            lons = swath['Geolocation Fields/Longitude'][:]
                            no2 = swath['Data Fields/ColumnAmountNO2Trop'][:]
                            # India bounding box: lat 6 to 38, lon 68 to 98
                            mask = (lats >= 6.0) & (lats <= 38.0) & (lons >= 68.0) & (lons <= 98.0) & (no2 > 0) & (no2 < 1e18)
                            if np.any(mask):
                                sub_lats = lats[mask][::4]
                                sub_lons = lons[mask][::4]
                                sub_no2 = no2[mask][::4]
                                results = []
                                for lat, lon, val in zip(sub_lats, sub_lons, sub_no2):
                                    results.append({
                                        'latitude': float(lat),
                                        'longitude': float(lon),
                                        'no2_concentration': float(val),
                                        'quality': 'good',
                                        'unit': 'molecules/cm²'
                                    })
                                logger.info(f"[OK] Extracted {len(results)} satellite NO2 points from {omi_file.name}")
                                return results
                except Exception as exc:
                    logger.warning(f"Error reading OMI file {omi_file}: {exc}")

        # 2. Extract verified CPCB / OpenAQ ground stations from database
        db_records = self._load_db_measurements('no2')
        if db_records:
            results = []
            for r in db_records:
                results.append({
                    'latitude': r['latitude'],
                    'longitude': r['longitude'],
                    'no2_concentration': r['value'],
                    'quality': r['quality'],
                    'unit': r['unit'],
                    'name': r['name']
                })
            logger.info(f"[OK] Loaded {len(results)} verified CPCB/OpenAQ NO2 station measurements")
            return results

        return []

    def load_viirs_aod(self) -> List[Dict]:
        """
        Load VIIRS AOD data from local NetCDF files if intersecting India,
        or return empty to route to the ISRO Bhuvan WMS AOD service.

        Returns:
            List of AOD measurements with lat, lon, value
        """
        logger.info("[INFO] Loading real VIIRS AOD data")

        if NETCDF4_AVAILABLE and self.cache_dir.exists():
            nc_files = list(self.cache_dir.glob("AERDB_L2_VIIRS_*.nc"))
            for nc_file in nc_files:
                try:
                    with Dataset(str(nc_file), 'r') as ds:
                        if 'Latitude' in ds.variables and 'Longitude' in ds.variables:
                            lats = ds.variables['Latitude'][:]
                            lons = ds.variables['Longitude'][:]
                            aod_var = ds.variables.get('Aerosol_Optical_Thickness_550_Land_Ocean_Best_Estimate')
                            if aod_var is not None:
                                aod_vals = aod_var[:]
                                mask = (lats >= 6.0) & (lats <= 38.0) & (lons >= 68.0) & (lons <= 98.0) & (aod_vals > 0.0) & (aod_vals < 5.0)
                                if np.any(mask):
                                    sub_lats = lats[mask][::4]
                                    sub_lons = lons[mask][::4]
                                    sub_aod = aod_vals[mask][::4]
                                    results = []
                                    for lat, lon, val in zip(sub_lats, sub_lons, sub_aod):
                                        results.append({
                                            'latitude': float(lat),
                                            'longitude': float(lon),
                                            'aod': float(val),
                                            'quality': 'good',
                                            'wavelength': '550nm'
                                        })
                                    logger.info(f"[OK] Extracted {len(results)} VIIRS AOD points from {nc_file.name}")
                                    return results
                except Exception as exc:
                    logger.warning(f"Error reading VIIRS file {nc_file}: {exc}")

        return []

    def get_so2_sample_grid(self) -> List[Dict]:
        """
        Load real SO2 measurements from verified CPCB/OpenAQ monitoring stations.

        Returns:
            List of verified SO2 station measurements
        """
        logger.info("[INFO] Loading verified SO2 observations from CPCB/OpenAQ network")
        db_records = self._load_db_measurements('so2')
        if db_records:
            results = []
            for r in db_records:
                results.append({
                    'latitude': r['latitude'],
                    'longitude': r['longitude'],
                    'so2_concentration': r['value'],
                    'quality': r['quality'],
                    'unit': r['unit'],
                    'source': f"CPCB Station: {r['name']}"
                })
            logger.info(f"[OK] Loaded {len(results)} verified SO2 measurements from monitoring stations")
            return results

        return []


# Global instance - lazy loaded
_nasa_satellite_loader_instance = None

def get_nasa_satellite_loader():
    global _nasa_satellite_loader_instance
    if _nasa_satellite_loader_instance is None:
        _nasa_satellite_loader_instance = NASASatelliteLoader()
    return _nasa_satellite_loader_instance

# For backwards compatibility
nasa_satellite_loader = get_nasa_satellite_loader()
