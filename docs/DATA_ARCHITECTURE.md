# Data Architecture

## 1. Data Flow
External API $\rightarrow$ Ingestion Service $\rightarrow$ Normalization $\rightarrow$ Spatial Index $\rightarrow$ Database/Cache $\rightarrow$ Fusion Engine $\rightarrow$ Output API

## 2. Ingestion Modules
The `backend/data_sources/` directory must contain isolated, idempotent ingestion scripts for:
- OpenAQ
- NASA FIRMS
- NASA POWER
- Copernicus / Sentinel

## 3. Storage and Caching
- **Raw Data**: Stored with full provenance (source URL, retrieval timestamp).
- **Normalized Data**: Mapped to AetherScan internal schemas (e.g., standardizing pollutant names to `pm25`, `pm10`).
- **Cache**: Ephemeral cache for high-volume APIs (AQICN) with TTLs matching the provider's update frequency.

## 4. Large Dataset Rule
Satellite subsets (e.g., NetCDF, GeoTIFF) are never processed directly in memory as a whole.
- Use bounding box (BBOX) queries during download.
- Extract only required arrays (e.g., NO2 column density).
- Discard raw files immediately after extraction to save disk space on Render.
