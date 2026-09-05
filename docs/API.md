# API Architecture

## 1. Design Principles
- RESTful principles with structured JSON responses.
- Every response must include provenance metadata if it contains environmental data.
- Explicit error codes and messages when data is unavailable (Zero Fake Data).

## 2. Core Namespaces
- `/api/v1/facilities`: Geocoding, buffering, and facility intelligence.
- `/api/v1/observations`: Ground sensor data retrieval (OpenAQ, AQICN).
- `/api/v1/satellite`: Copernicus, NASA OMI/VIIRS querying.
- `/api/v1/fusion`: Executes sensor fusion (Classical or Quantum).
- `/api/v1/quantum`: Direct access to quantum experiment routes.

## 3. Standard Response Format
```json
{
  "status": "success|error",
  "data": { ... },
  "metadata": {
    "provenance": [...],
    "quality_score": 0.95,
    "compute_time_ms": 120,
    "stale_flags": []
  },
  "message": "Optional context"
}
```
