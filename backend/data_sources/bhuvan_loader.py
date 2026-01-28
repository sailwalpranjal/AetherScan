"""
ISRO BHUVAN WMS Data Loader
Provides access to ISRO satellite layers via WMS
No API key- Direct WMS access
"""
from owslib.wms import WebMapService
from typing import Dict, List, Optional, Tuple
from PIL import Image
import io
import numpy as np
from config.settings import settings

class BhuvanLoader:
    """Access ISRO Bhuvan WMS layers"""

    def __init__(self):
        self.wms_url = settings.BHUVAN_WMS_URL
        self.wms: Optional[WebMapService] = None

        # ISRO Bhuvan layer definitions (VERIFIED WORKING LAYERS)
        self.layers = {
            # Satellite Imagery
            'india_satellite': {
                'name': 'india3',
                'title': 'India Satellite Imagery',
                'description': 'High-resolution satellite imagery of India'
            },

            # Administrative Boundaries
            'india_map': {
                'name': 'mmi:mmi_india',
                'title': 'Map of India',
                'description': 'Vector map of India with administrative boundaries'
            },
            'admin_group': {
                'name': 'basemap:admin_group',
                'title': 'Administrative Boundaries',
                'description': 'Complete administrative boundary layers'
            },
            'states': {
                'name': 'mmi:mmi_india',
                'title': 'India State Boundaries',
                'description': 'State-level administrative boundaries'
            },

            # Cadastral/Land Data
            'cadastral': {
                'name': 'cadastral:cadastral_india',
                'title': 'Cadastral Map',
                'description': 'Cadastral and land parcel boundaries'
            },

            # Water Bodies
            'waterbody_dem': {
                'name': 'basemap:waterbody_DEM',
                'title': 'Water Bodies DEM',
                'description': 'Digital Elevation Model with water bodies'
            },

            # Vector Layers
            'city_hq': {
                'name': 'vector:city_hq',
                'title': 'City Headquarters',
                'description': 'Major city locations and headquarters'
            }
        }

        # DEM layers from bhuvan-ras2 server (separate WMS endpoint)
        self.dem_layers = {
            'ace2dem': {
                'name': 'ace2dem',
                'title': 'ACE2 Digital Elevation Model',
                'description': 'High-resolution elevation data',
                'wms_url': 'https://bhuvan-ras2.nrsc.gov.in/mapcache'
            }
        }

    def _get_wms(self) -> WebMapService:
        """Initialize WMS connection if not already connected"""
        if self.wms is None:
            try:
                self.wms = WebMapService(self.wms_url, version='1.3.0')
            except Exception as e:
                print(f"Error connecting to Bhuvan WMS: {e}")
                self.wms = None
        return self.wms

    def get_layer_info(self, layer_key: str) -> Optional[Dict]:
        """Get information about a specific layer"""
        # Check regular layers first, then DEM layers
        if layer_key in self.layers:
            return self.layers[layer_key]
        return self.dem_layers.get(layer_key)

    def get_all_layers(self) -> Dict[str, Dict]:
        """Get all available Bhuvan layers including DEM layers"""
        all_layers = {**self.layers, **self.dem_layers}
        return all_layers

    def fetch_wms_image(
        self,
        layer_key: str,
        bbox: Tuple[float, float, float, float],
        size: Tuple[int, int] = (512, 512),
        srs: str = 'EPSG:4326',
        format: str = 'image/png',
        transparent: bool = True
    ) -> Optional[bytes]:
        """
        Fetch WMS image for a specific layer
            layer_key: Key from self.layers dict
            bbox: Bounding box (min_lon, min_lat, max_lon, max_lat)
            size: Image size (width, height)
            srs: Spatial reference system
            format: Image format
            transparent: Transparent background

        Returns:
            Image bytes or None if error
        """
        wms = self._get_wms()
        if not wms:
            return None

        layer_info = self.layers.get(layer_key)
        if not layer_info:
            print(f"Unknown layer: {layer_key}")
            return None

        try:
            response = wms.getmap(
                layers=[layer_info['name']],
                srs=srs,
                bbox=bbox,
                size=size,
                format=format,
                transparent=transparent
            )

            return response.read()

        except Exception as e:
            print(f"Error fetching WMS image for {layer_key}: {e}")
            return None

    def fetch_wms_image_as_array(
        self,
        layer_key: str,
        bbox: Tuple[float, float, float, float],
        size: Tuple[int, int] = (512, 512)
    ) -> Optional[np.ndarray]:
        """
        Fetch WMS image and convert to numpy array

        Returns:
            numpy array of shape (height, width, channels) or None
        """
        image_bytes = self.fetch_wms_image(layer_key, bbox, size)

        if image_bytes is None:
            return None

        try:
            image = Image.open(io.BytesIO(image_bytes))
            return np.array(image)
        except Exception as e:
            print(f"Error converting image to array: {e}")
            return None

    def get_wms_url(
        self,
        layer_key: str,
        transparent: bool = True,
        format: str = 'image/png'
    ) -> Optional[str]:
        """
        Generate WMS GetMap URL for use in frontend

        Returns:
            WMS URL template with {bbox} placeholder
        """
        layer_info = self.get_layer_info(layer_key)
        if not layer_info:
            return None

        # Use custom WMS URL for DEM layers if specified
        wms_base_url = layer_info.get('wms_url', self.wms_url)

        url = (
            f"{wms_base_url}?"
            f"SERVICE=WMS&"
            f"VERSION=1.3.0&"
            f"REQUEST=GetMap&"
            f"LAYERS={layer_info['name']}&"
            f"STYLES=&"
            f"FORMAT={format}&"
            f"TRANSPARENT={'true' if transparent else 'false'}&"
            f"WIDTH=512&"
            f"HEIGHT=512&"
            f"CRS=EPSG:4326&"
            f"BBOX={{bbox}}"
        )

        return url

    def extract_values_from_raster(
        self,
        layer_key: str,
        points: List[Tuple[float, float]],
        buffer: float = 0.1
    ) -> List[Optional[float]]:
        """
        Extract raster values at specific points
            layer_key: Layer to query
            points: List of (lat, lon) tuples
            buffer: Buffer around points for sampling

        Returns:
            List of values at each point
        """
        values = []

        for lat, lon in points:
            bbox = (
                lon - buffer,
                lat - buffer,
                lon + buffer,
                lat + buffer
            )

            array = self.fetch_wms_image_as_array(layer_key, bbox, size=(10, 10))

            if array is not None:
                # Extract center pixel value
                center_value = array[5, 5, 0] if len(array.shape) == 3 else array[5, 5]
                values.append(float(center_value))
            else:
                values.append(None)

        return values

    def get_layer_capabilities(self) -> Optional[Dict]:
        """Get WMS capabilities and available layers"""
        wms = self._get_wms()
        if not wms:
            return None

        try:
            capabilities = {
                'title': wms.identification.title,
                'abstract': wms.identification.abstract,
                'available_layers': list(wms.contents.keys())
            }
            return capabilities
        except Exception as e:
            print(f"Error getting capabilities: {e}")
            return None

bhuvan_loader = BhuvanLoader()
