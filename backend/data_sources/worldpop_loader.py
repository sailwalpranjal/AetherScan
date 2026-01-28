"""
WorldPop Population Data Loader
Processes GeoTIFF raster files for population density
"""
import numpy as np
import rasterio
from rasterio.windows import Window
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from config.settings import settings
import json

class WorldPopLoader:
    """Load and process WorldPop raster data"""

    def __init__(self):
        self.cache_dir = Path(settings.DATA_CACHE_DIR) / "worldpop"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Available WorldPop files
        self.india_constrained = self.cache_dir / "ind_ppp_2020_constrained.tif"
        self.aggregated_1km = self.cache_dir / "ppp_2020_1km_Aggregated.tif"

    def is_data_available(self) -> bool:
        """Check if WorldPop data files exist"""
        return self.india_constrained.exists() or self.aggregated_1km.exists()

    def get_best_available_file(self) -> Optional[Path]:
        """Get the best available WorldPop file"""
        # Prefer constrained (more accurate)
        if self.india_constrained.exists():
            return self.india_constrained
        elif self.aggregated_1km.exists():
            return self.aggregated_1km
        return None

    def extract_population_grid(
        self,
        bounds: Optional[Dict] = None,
        grid_size: int = 50
    ) -> List[Dict]:
        """
        Extract population data as grid points

        Args:
            bounds: Geographic bounds (min_lat, max_lat, min_lon, max_lon)
            grid_size: Number of grid points to extract

        Returns:
            List of grid points with population data
        """
        raster_file = self.get_best_available_file()

        if not raster_file:
            print("[WARN] No WorldPop files available")
            return self._get_sample_data()

        try:
            with rasterio.open(raster_file) as src:
                print(f"[INFO] Loading WorldPop from: {raster_file.name}")
                print(f"   Resolution: {src.res}")
                print(f"   CRS: {src.crs}")
                print(f"   Bounds: {src.bounds}")

                # Use India bounds if not specified
                if not bounds:
                    bounds = settings.INDIA_BOUNDS

                # Convert geographic bounds to pixel coordinates
                min_lon = bounds.get('min_lon', 68.0)
                max_lon = bounds.get('max_lon', 98.0)
                min_lat = bounds.get('min_lat', 6.0)
                max_lat = bounds.get('max_lat', 37.0)

                # Read data
                # Sample grid uniformly
                lat_step = (max_lat - min_lat) / grid_size
                lon_step = (max_lon - min_lon) / grid_size

                grid_points = []

                for i in range(grid_size):
                    for j in range(grid_size):
                        lat = min_lat + i * lat_step
                        lon = min_lon + j * lon_step

                        try:
                            # Convert lat/lon to row/col
                            row, col = src.index(lon, lat)

                            # Read single pixel value
                            if 0 <= row < src.height and 0 <= col < src.width:
                                window = Window(col, row, 1, 1)
                                value = src.read(1, window=window)[0, 0]

                                # Skip no-data values
                                if value != src.nodata and value > 0:
                                    grid_points.append({
                                        'latitude': lat,
                                        'longitude': lon,
                                        'population_density': float(value),
                                        'population_per_pixel': float(value)
                                    })
                        except Exception:
                            continue

                print(f"[OK] Extracted {len(grid_points)} population grid points")
                return grid_points

        except Exception as e:
            print(f"[ERROR] Error loading WorldPop data: {e}")
            return self._get_sample_data()

    def get_population_at_point(
        self,
        latitude: float,
        longitude: float
    ) -> Optional[float]:
        """
        Get population density at a specific point

        Args:
            latitude: Latitude
            longitude: Longitude

        Returns:
            Population density value or None
        """
        raster_file = self.get_best_available_file()

        if not raster_file:
            return None

        try:
            with rasterio.open(raster_file) as src:
                # Convert lat/lon to row/col
                row, col = src.index(longitude, latitude)

                # Read value
                if 0 <= row < src.height and 0 <= col < src.width:
                    value = src.read(1)[row, col]
                    if value != src.nodata:
                        return float(value)
                return None
        except Exception as e:
            print(f"[ERROR] Error reading population at point: {e}")
            return None

    def get_population_statistics(self) -> Dict:
        """
        Get overall statistics from WorldPop data

        Returns:
            Dictionary with statistics
        """
        raster_file = self.get_best_available_file()

        if not raster_file:
            return {'available': False}

        try:
            with rasterio.open(raster_file) as src:
                # Read a sample for statistics (every 100th pixel)
                sample_data = src.read(1, out_shape=(src.height // 100, src.width // 100))

                # Filter out no-data
                valid_data = sample_data[sample_data != src.nodata]
                valid_data = valid_data[valid_data > 0]

                return {
                    'available': True,
                    'file': raster_file.name,
                    'total_pixels': src.width * src.height,
                    'resolution': src.res,
                    'crs': str(src.crs),
                    'bounds': {
                        'min_lon': src.bounds.left,
                        'max_lon': src.bounds.right,
                        'min_lat': src.bounds.bottom,
                        'max_lat': src.bounds.top
                    },
                    'population_stats': {
                        'min': float(np.min(valid_data)) if len(valid_data) > 0 else 0,
                        'max': float(np.max(valid_data)) if len(valid_data) > 0 else 0,
                        'mean': float(np.mean(valid_data)) if len(valid_data) > 0 else 0,
                        'median': float(np.median(valid_data)) if len(valid_data) > 0 else 0
                    }
                }
        except Exception as e:
            print(f"[ERROR] Error getting statistics: {e}")
            return {'available': False, 'error': str(e)}

    def _get_sample_data(self) -> List[Dict]:
        """Sample population data for testing"""
        return [
            {'latitude': 28.6139, 'longitude': 77.2090, 'population_density': 11320, 'city': 'Delhi'},
            {'latitude': 19.0760, 'longitude': 72.8777, 'population_density': 20680, 'city': 'Mumbai'},
            {'latitude': 13.0827, 'longitude': 80.2707, 'population_density': 26903, 'city': 'Chennai'},
            {'latitude': 22.5726, 'longitude': 88.3639, 'population_density': 24252, 'city': 'Kolkata'},
            {'latitude': 12.9716, 'longitude': 77.5946, 'population_density': 11371, 'city': 'Bangalore'},
            {'latitude': 17.3850, 'longitude': 78.4867, 'population_density': 18480, 'city': 'Hyderabad'},
            {'latitude': 23.0225, 'longitude': 72.5714, 'population_density': 11167, 'city': 'Ahmedabad'},
            {'latitude': 26.9124, 'longitude': 75.7873, 'population_density': 3502, 'city': 'Jaipur'},
            {'latitude': 18.5204, 'longitude': 73.8567, 'population_density': 6919, 'city': 'Pune'},
            {'latitude': 21.1702, 'longitude': 72.8311, 'population_density': 13087, 'city': 'Surat'}
        ]

# Global instance
worldpop_loader = WorldPopLoader()
