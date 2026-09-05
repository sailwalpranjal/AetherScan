# AetherScan Six-Month Roadmap

## Phase 0: Forensic Audit (Current)
- Complete repository audit without modifying code.
- Generate traceability matrix linking paper claims to implementation.
- Establish Data Source, Quality, and Quantum architecture documents.

## Phase 1: Foundation (Weeks 1-3)
- Ensure Vercel/Render free-tier compatibility.
- Migrate from ephemeral SQLite to a persistent, free-tier PostGIS database (e.g. Supabase).
- Implement Provider Abstraction and basic caching.
- Establish clean API route boundaries.

## Phase 2: Trustworthy Data (Weeks 4-7)
- Implement robust ingestion for OpenAQ, NASA FIRMS, NASA POWER, and Copernicus.
- Enforce Zero Fake Data policy across all routes.
- Build the Data Quality Engine (calculating DQS and FCS).
- Establish data provenance tracking for every observation.

## Phase 3: Industrial Intelligence (Weeks 8-12)
- Build Facility Discovery and bounding box logic.
- Develop the Environmental Evidence Chain.
- Integrate regulatory comparisons (jurisdiction-aware limits).
- Detect and flag environmental events (e.g. fire-AQI correlations).

## Phase 4: Research Engine (Weeks 13-17)
- Formally reproduce all paper claims using real data.
- Benchmark quantum algorithms against classical baselines (e.g. IDW, robust median, FFT).
- Implement `QuantumBackend` abstraction layer to separate simulator logic.
- Log experiments for reproducibility.

## Phase 5: Real Hardware (Weeks 18-20)
- Integrate `qiskit_ibm_provider` for execution on IBM QPUs.
- Implement job scheduling and rate-limiting to adhere to free QPU access constraints.
- Run hardware vs. simulator vs. classical benchmarking.

## Phase 6: Advanced Platform (Weeks 21-24)
- Frontend redesign for modern, research-grade UX.
- Generate automated PDF reports linking all evidence.
- Final security hardening, performance optimization, and e2e testing.
- Write final Release Readiness audit.
