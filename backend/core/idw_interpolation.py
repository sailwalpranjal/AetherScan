import numpy as np
from scipy.spatial import KDTree
from typing import List, Tuple, Dict, Optional
from config.settings import settings

class IDWInterpolator:
    def __init__(self, power: float = None, smoothing: float = None, neighbors: int = None):
        self.power = power or settings.IDW_POWER
        self.smoothing = smoothing or settings.IDW_SMOOTHING
        self.neighbors = neighbors or settings.IDW_NEIGHBORS
        self.kdtree = None
        self.values = None

    def fit(self, points: np.ndarray, values: np.ndarray):
        if len(points) == 0:
            raise ValueError("No points provided for interpolation")

        if len(points) != len(values):
            raise ValueError("Number of points must match number of values")

        # Build KD-Tree for fast nearest neighbor search
        self.kdtree = KDTree(points)
        self.values = np.array(values, dtype=np.float64)

    def interpolate(self, query_points: np.ndarray) -> np.ndarray:
        if self.kdtree is None:
            raise ValueError("Interpolator not fitted. Call fit() first.")

        n_neighbors = min(self.neighbors, len(self.values))

        # Find k nearest neighbors for each query point
        distances, indices = self.kdtree.query(query_points, k=n_neighbors)

        # Handle single neighbor case
        if n_neighbors == 1:
            distances = distances.reshape(-1, 1)
            indices = indices.reshape(-1, 1)

        # Apply smoothing to avoid division by zero
        distances = distances + self.smoothing

        # Calculate weights using IDW formula: w_i = 1 / d_i^p
        with np.errstate(divide='ignore', invalid='ignore'):
            weights = 1.0 / np.power(distances, self.power)

            # Handle points that coincide with data points (distance = 0)
            weights = np.where(np.isinf(weights), 1e10, weights)

        # Normalize weights
        weights_sum = np.sum(weights, axis=1, keepdims=True)
        weights_normalized = weights / weights_sum

        # Get values at neighbor points
        neighbor_values = self.values[indices]

        # Calculate weighted sum
        interpolated = np.sum(weights_normalized * neighbor_values, axis=1)

        return interpolated

    def interpolate_grid(
        self,
        bounds: Tuple[float, float, float, float],
        resolution: float = 0.1
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        min_lat, max_lat, min_lon, max_lon = bounds

        # Create grid
        lats = np.arange(min_lat, max_lat, resolution)
        lons = np.arange(min_lon, max_lon, resolution)
        lon_grid, lat_grid = np.meshgrid(lons, lats)

        # Flatten grid for interpolation
        query_points = np.column_stack([lat_grid.ravel(), lon_grid.ravel()])

        # Interpolate
        values_flat = self.interpolate(query_points)

        # Reshape back to grid
        values_grid = values_flat.reshape(lat_grid.shape)

        return lat_grid, lon_grid, values_grid

    def interpolate_point(self, lat: float, lon: float) -> float:
        query_point = np.array([[lat, lon]])
        result = self.interpolate(query_point)
        return float(result[0])

def interpolate_sensor_data(
    sensor_data: List[Dict],
    bounds: Optional[Tuple[float, float, float, float]] = None,
    resolution: float = 0.1,
    parameter: str = 'value'
) -> Dict:
   
    if not sensor_data:
        return {'lats': np.array([]), 'lons': np.array([]), 'values': np.array([])}

    # Extract points and values
    points = np.array([[d['latitude'], d['longitude']] for d in sensor_data])
    values = np.array([d.get(parameter, 0) for d in sensor_data])

    # Filter out invalid values
    valid_mask = ~np.isnan(values) & (values >= 0)
    points = points[valid_mask]
    values = values[valid_mask]

    if len(points) == 0:
        return {'lats': np.array([]), 'lons': np.array([]), 'values': np.array([])}

    # Determine bounds
    if bounds is None:
        bounds = (
            float(np.min(points[:, 0])) - 1.0,
            float(np.max(points[:, 0])) + 1.0,
            float(np.min(points[:, 1])) - 1.0,
            float(np.max(points[:, 1])) + 1.0
        )

    # Interpolate
    interpolator = IDWInterpolator()
    interpolator.fit(points, values)
    lats, lons, values_grid = interpolator.interpolate_grid(bounds, resolution)

    return {
        'lats': lats.tolist(),
        'lons': lons.tolist(),
        'values': values_grid.tolist()
    }
