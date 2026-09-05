# Data Source Registry

This registry tracks all external data sources integrated into AetherScan. All sources must comply with the Zero-Cost and Zero-Fake-Data directives.

## Primary Sources

| Provider | Dataset / API Name | License | Update Freq | Auth Req | Rate Limits | Resolution | Provenance Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AQICN** | Air Quality Data | Free for non-commercial | Hourly | API Token | 1000/day | Station-level | Retain station ID, timestamp, original value |
| **OpenAQ** | Global Air Quality | Open | Real-time | API Key | 10k/month (Free) | Station-level | Retain location ID, timestamp |
| **NASA FIRMS** | Active Fires | Open | 3-Hourly | MAP Key | 1000/10min | 375m - 1km | Bounding box retrieval, temporal tracking |
| **NASA POWER** | Meteorology / Climatology | Open | Daily | None | 30/min/IP | 0.5 deg x 0.5 deg | Chunked requests by region |
| **NASA OMI** | NO2 & SO2 Column | Open | Daily | Earthdata | Variable | 13x24 km | Selective subsetting |
| **NASA VIIRS** | AOD / LST | Open | Daily | Earthdata | Variable | 750m - 1km | Selective subsetting |
| **ISRO Bhuvan** | Indian Satellite Imagery / WMS | Open (Gov) | Variable | None | N/A | Variable | Bounding box queries |
| **World Resources Institute (WRI)** | Global Power Plant Database | Open | Static (2019) | None | N/A | Facility-level | Cached database |
| **WorldPop** | Population Density | Open | Static (2020) | None | N/A | 1km | Cached dataset |
| **OpenStreetMap (OSM)** | Infrastructure / Geography | ODbL | Real-time | None | Nominatim limits | Variable | Regional extracts / localized queries |
| **Copernicus Data Space (CDSE)** | Sentinel-5P/TROPOMI, Sentinel-2 | Open | Daily | CDSE Auth | Variable | 7km / 10m | STAC search -> bounding box -> subset |

## Automated Ingestion Principles
1. **No manual downloading**: Agents must use automated scripts to fetch updates.
2. **Chunking**: Large datasets (like global Sentinel archives) must be filtered by bounding box (BBOX) and time range prior to download.
3. **Caching**: Data must be stored in the database or cache with strict TTLs based on the update frequency to avoid redundant API calls.
4. **Resilience**: All collectors must be retryable and idempotent.
