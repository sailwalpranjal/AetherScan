import numpy as np
from PIL import Image, ImageDraw
import json
import hashlib
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from config.settings import settings
import io

class TileGenerator:
    """Generate map tiles for heatmaps and vector layers"""

    def __init__(self):
        self.tile_size = settings.TILE_SIZE
        self.cache_dir = Path(settings.TILE_CACHE_DIR)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def latlon_to_tile(self, lat: float, lon: float, zoom: int) -> Tuple[int, int]:
        """Convert lat/lon to tile coordinates"""
        lat_rad = np.radians(lat)
        n = 2.0 ** zoom
        x = int((lon + 180.0) / 360.0 * n)
        y = int((1.0 - np.log(np.tan(lat_rad) + (1 / np.cos(lat_rad))) / np.pi) / 2.0 * n)
        return x, y

    def tile_to_latlon(self, x: int, y: int, zoom: int) -> Tuple[float, float, float, float]:
        """Get tile bounds in lat/lon"""
        n = 2.0 ** zoom
        lon_min = x / n * 360.0 - 180.0
        lon_max = (x + 1) / n * 360.0 - 180.0

        lat_rad_max = np.arctan(np.sinh(np.pi * (1 - 2 * y / n)))
        lat_rad_min = np.arctan(np.sinh(np.pi * (1 - 2 * (y + 1) / n)))

        lat_min = np.degrees(lat_rad_min)
        lat_max = np.degrees(lat_rad_max)

        return lat_min, lat_max, lon_min, lon_max

    def generate_heatmap_tile(
        self,
        x: int,
        y: int,
        zoom: int,
        data_points: List[Dict],
        color_map: str = 'aqi'
    ) -> bytes:
        """
            x, y, zoom: Tile coordinates
            data_points: List of dicts with 'latitude', 'longitude', 'value'
            color_map: Color scheme ('aqi', 'thermal', 'density')
        """
        # Get tile bounds
        lat_min, lat_max, lon_min, lon_max = self.tile_to_latlon(x, y, zoom)

        # Filter points within tile bounds
        tile_points = [
            p for p in data_points
            if lon_min <= p['longitude'] <= lon_max and lat_min <= p['latitude'] <= lat_max
        ]

        # Create image
        img = Image.new('RGBA', (self.tile_size, self.tile_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img, 'RGBA')

        if not tile_points:
            return self._image_to_bytes(img)

        # Convert lat/lon to pixel coordinates
        for point in tile_points:
            lat = point['latitude']
            lon = point['longitude']
            value = point.get('value', 0)

            # Map to pixel coordinates
            px = int((lon - lon_min) / (lon_max - lon_min) * self.tile_size)
            py = int((lat_max - lat) / (lat_max - lat_min) * self.tile_size)

            # Get color based on value
            color = self._get_color_for_value(value, color_map)

            # Draw circle with gradient effect
            radius = max(5, int(15 / (2 ** (zoom - 5)))) if zoom > 5 else 15
            self._draw_gradient_circle(draw, px, py, radius, color)

        return self._image_to_bytes(img)

    def generate_vector_tile(
        self,
        x: int,
        y: int,
        zoom: int,
        features: List[Dict]
    ) -> Dict:
        """
            x, y, zoom: Tile coordinates
            features: List of GeoJSON features
        """
        lat_min, lat_max, lon_min, lon_max = self.tile_to_latlon(x, y, zoom)

        # Filter features within tile bounds
        tile_features = []
        for feature in features:
            geom = feature.get('geometry', {})
            coords = geom.get('coordinates', [])

            if geom.get('type') == 'Point':
                lon, lat = coords
                if lon_min <= lon <= lon_max and lat_min <= lat <= lat_max:
                    tile_features.append(feature)

        return {
            'type': 'FeatureCollection',
            'features': tile_features
        }

    def _get_color_for_value(self, value: float, color_map: str) -> Tuple[int, int, int, int]:
        """Get RGBA color for a value based on color map"""
        if color_map == 'aqi':
            # AQI color scale
            if value <= 50:
                return (0, 228, 0, 180)  # Good - Green
            elif value <= 100:
                return (255, 255, 0, 180)  # Satisfactory - Yellow
            elif value <= 200:
                return (255, 126, 0, 180)  # Moderate - Orange
            elif value <= 300:
                return (255, 0, 0, 180)  # Poor - Red
            elif value <= 400:
                return (143, 63, 151, 180)  # Very Poor - Purple
            else:
                return (126, 0, 35, 180)  # Severe - Maroon

        elif color_map == 'thermal':
            # Thermal gradient (blue to red)
            normalized = min(1.0, value / 100.0)
            r = int(255 * normalized)
            b = int(255 * (1 - normalized))
            return (r, 128, b, 180)

        else:  # density
            # Density gradient (transparent to solid)
            normalized = min(1.0, value / 100.0)
            alpha = int(200 * normalized)
            return (255, 128, 0, alpha)

    def _draw_gradient_circle(
        self,
        draw: ImageDraw.Draw,
        cx: int,
        cy: int,
        radius: int,
        color: Tuple[int, int, int, int]
    ):
        """Draw a circle with gradient effect"""
        r, g, b, base_alpha = color

        for i in range(radius, 0, -1):
            alpha = int(base_alpha * (i / radius) ** 2)
            current_color = (r, g, b, alpha)
            draw.ellipse(
                [cx - i, cy - i, cx + i, cy + i],
                fill=current_color
            )

    def _image_to_bytes(self, img: Image.Image) -> bytes:
        """Convert PIL Image to PNG bytes"""
        buffer = io.BytesIO()
        img.save(buffer, format='PNG', optimize=True)
        return buffer.getvalue()

    def get_cached_tile(self, layer: str, x: int, y: int, zoom: int) -> Optional[bytes]:
        """Get cached tile if it exists and is not expired"""
        cache_key = self._get_cache_key(layer, x, y, zoom)
        cache_file = self.cache_dir / f"{cache_key}.png"

        if cache_file.exists():
            return cache_file.read_bytes()
        return None

    def cache_tile(self, layer: str, x: int, y: int, zoom: int, data: bytes):
        """Cache tile data"""
        cache_key = self._get_cache_key(layer, x, y, zoom)
        cache_file = self.cache_dir / f"{cache_key}.png"
        cache_file.write_bytes(data)

    def _get_cache_key(self, layer: str, x: int, y: int, zoom: int) -> str:
        """Generate cache key for tile"""
        key_string = f"{layer}_{zoom}_{x}_{y}"
        return hashlib.md5(key_string.encode()).hexdigest()

tile_generator = TileGenerator()
