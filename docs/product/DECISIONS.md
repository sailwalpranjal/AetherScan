# Decision log

Decisions visible in the code and docs. I did not date them at the time.

## 1. SQLite first, PostgreSQL later

**Context.** The target was zero-cost hosting and a project that a team of four could run on a laptop.
**Options.** PostgreSQL/PostGIS from the start; SQLite with aiosqlite.
**Decision.** SQLite via SQLAlchemy and aiosqlite (`backend/db/database.py`). The progress report says this was chosen to avoid running a database server.
**Consequences.** Easy local setup. On Render's free tier the file is wiped on restart, so the planned migration to PostgreSQL is now item one on the roadmap. `backend/.env.example` already shows a `DATABASE_URL` for PostgreSQL, but nothing has been tested against it.

## 2. A source registry with licence, rate limit and provenance

**Context.** Sources differ in licence (open, non-commercial only, ODbL), rate limit (30 per minute to 10,000 per month) and resolution (375 m to 13x24 km).
**Options.** Hard-code each source in its loader; keep a registry document and write loaders to match.
**Decision.** `docs/DATA_SOURCE_REGISTRY.md` lists every source with those fields, and each loader in `backend/data_sources/` is expected to have a row.
**Consequences.** Anyone can see what they are allowed to do with a number. The cost is that the registry is a document, not code, so it can drift from the loaders.

## 3. A multiplicative quality score with a zero-fake-data rule

**Context.** A fused value is only as good as its worst input. Missing data was being silently replaced by fallbacks.
**Options.** Additive weighted score; product of factors; no score.
**Decision.** DQS is the product of freshness, spatial, sensor and validity factors (`backend/core/quality.py`). A single zero (stale, impossible value) zeros the score. FCS combines DQS with the spread of the inputs. Pipelines return zero rows rather than invent values.
**Consequences.** Failure shows up as "unavailable", which is what I wanted. The weights (for example 0.6 for a low-cost sensor) are my estimates and have not been calibrated.

## 4. Token-guarded database access

**Context.** I wanted database writes to go through API routes only.
**Options.** Rely on convention; connection-level permissions; a token the route must obtain.
**Decision.** `backend/middleware/database_guard.py` issues SHA-256 tokens with a 60-second TTL, validates operation and expiry, and blocks violations.
**Consequences.** Misuse is blocked inside the app. It is not a security boundary against someone with shell access, and its access log is in memory only (last 1,000 entries).

## 5. Quantum circuits on a simulator, with no speed-up claimed

**Context.** The project included a quantum-computing component.
**Options.** Claim advantage; run on hardware; run on a simulator and say so.
**Decision.** Qiskit Aer simulator only. `docs/LIMITATIONS.md` and the paper state that no quantum speed-up occurs. Endpoints are optional and load only if Qiskit installs.
**Consequences.** The claim is defensible. The module is a demonstration of method, not a reason to use the platform.
