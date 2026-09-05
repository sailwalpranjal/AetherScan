# AetherScan Architecture

## 1. High-Level Architecture
AetherScan is a three-tier environmental intelligence platform designed for zero-cost, serverless deployment on Vercel and Render.

### Frontend (Vercel)
- **Framework**: Next.js 14, React 18
- **Language**: TypeScript
- **Mapping**: MapLibre GL JS, Deck.gl
- **Styling**: Tailwind CSS
- **Reporting**: jsPDF

### Backend (Render Free Tier)
- **Framework**: FastAPI (Python 3.11)
- **Concurrency**: `asyncio` for I/O bounds, `ProcessPoolExecutor` for CPU bounds.
- **Quantum Engine**: Qiskit 0.45.1 (Aer Simulator)
- **Security**: Token-authenticated API requests.

### Database / Storage
- **Current**: Async SQLite.
- **Constraint**: Render's free tier has an ephemeral filesystem. SQLite will be wiped on restart.
- **Migration Path**: Migrate to PostgreSQL/PostGIS (e.g., Supabase free tier or Neon) for persistent geospatial indexing and caching.

## 2. Ingestion Pipeline
To handle external APIs responsibly and avoid rate limits:
- Provider $\rightarrow$ Collector $\rightarrow$ Validator $\rightarrow$ Normalizer $\rightarrow$ Cache/DB
- The backend will cache API responses (e.g., AQICN) using a robust TTL-based cache.

## 3. Industrial Facility Intelligence
For a given facility:
1. Geocoding & Bounding Box creation.
2. Query cached OSM / WRI data.
3. Query nearby OpenAQ / AQICN stations.
4. Apply spatial/temporal alignment.
5. Fuse data using `quantum_superposition_process()` or classical IDW.
6. Generate Environmental Evidence Chain and PDF Report.
