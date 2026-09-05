# AetherScan GitHub Issues

*Note: GitHub CLI authentication is currently failing. These issues should be created in the repository once authentication is restored.*

## Phase 1: Foundation

### Issue 1: Migrate Ephemeral Storage to Persistent Database
- **Problem**: Render's free tier uses an ephemeral filesystem. SQLite data is lost on every deploy/restart.
- **User Story**: As a platform user, my generated reports, location preferences, and historical data cache must persist across backend restarts.
- **Technical Design**: Migrate from local SQLite to a remote PostgreSQL database (e.g., Supabase or Neon). Use SQLAlchemy/GeoAlchemy for spatial queries.
- **Acceptance Criteria**: Database connection strings use env variables; no data is written to the local filesystem permanently; tests pass.

### Issue 2: Establish Provider Abstraction Layer
- **Problem**: API clients (AQICN, OpenAQ) are tightly coupled with domain services.
- **User Story**: As a developer, I can add a new data provider without modifying core business logic.
- **Technical Design**: Create a BaseProvider interface. Implement rate-limiting and circuit breakers inside the provider classes.
- **Acceptance Criteria**: `aqicn_service.py` and `openaq_service.py` inherit from BaseProvider; fallback logic is handled centrally.

## Phase 2: Trustworthy Data

### Issue 3: Data Quality Engine & Zero-Fake-Data Enforcement
- **Problem**: Missing or stale data can currently crash the app or be silently ignored. We need a formalized Data Quality Score (DQS).
- **User Story**: As a researcher, I want to see explicit confidence intervals and "Stale/Unavailable" states instead of fake fallback data.
- **Technical Design**: Implement the DQS formula (freshness * spatial * sensor * valid). Enforce strict null checks on the frontend.
- **Acceptance Criteria**: Hardcoded fallbacks removed; Frontend displays "Unavailable" for failed APIs; DQS is calculated and exposed in API responses.

## Phase 4: Quantum Research Engine

### Issue 4: Quantum Backend Abstraction
- **Problem**: Qiskit Aer simulator is hardcoded into the processor logic, preventing future IBM QPU execution.
- **User Story**: As a quantum researcher, I can toggle between Simulator and Hardware execution via configuration.
- **Technical Design**: Implement `QuantumBackend`, `SimulatorBackend`, and `IBMHardwareBackend`.
- **Acceptance Criteria**: `processor.py` takes a generic `backend` object; no hardcoded `AerSimulator()` calls in the core algorithm functions.
