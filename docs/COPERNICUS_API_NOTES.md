# Copernicus Data Space Ecosystem (CDSE) API Notes - Sentinel-5P NO2

## 1. STAC Endpoint URL
The base STAC URL for CDSE is:
`https://catalogue.dataspace.copernicus.eu/stac`

For searching collections, use the `/search` endpoint:
`https://catalogue.dataspace.copernicus.eu/stac/search`

## 2. Collection Name
For Sentinel-5P data, the collection name is:
`SENTINEL-5P`

Sentinel-5P products are grouped under this single collection. To specifically target NO2 column density (`L2__NO2___`), you need to use the `query` extension to filter by product type.

## 3. Filtering by BBOX, Datetime, and Product Type
You can use standard STAC API POST requests (or GET with query parameters) to filter the data.

**Example POST JSON payload:**
```json
{
  "collections": ["SENTINEL-5P"],
  "bbox": [10.0, 45.0, 12.0, 47.0],
  "datetime": "2023-05-01T00:00:00Z/2023-05-31T23:59:59Z",
  "query": {
    "productType": {
      "eq": "L2__NO2___"
    }
  },
  "limit": 10
}
```
*(Note: standard `bbox` format is `[min_lon, min_lat, max_lon, max_lat]`.)*

## 4. Authentication Requirements
- **Searching (STAC API):** NO authentication is required. The STAC catalog and search endpoints are public.
- **Downloading Data:** YES, authentication is required. To download the actual NetCDF assets via OData or S3 access, you must obtain a JWT access token from the CDSE Keycloak identity provider (`https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`) and include it as a Bearer token in your download requests.
