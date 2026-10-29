# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow semantic versioning.

## [Unreleased]

## [0.2.0] - proposed tag `v0.2.0`

### Changed
- README, architecture notes and the paper now say SQLite is in use and PostgreSQL is planned; that the access log is in memory; and that the process pool is created but unused.
- README no longer quotes latency, "quantum speed-up" or 50-user figures that no script in the repository produces.

### Fixed
- `SQLAlchemy[asyncio]` in `backend/requirements.txt`, so a clean install pulls in `greenlet` and the async tests can run.

### Added
- CI workflow, issue and pull request templates, contributing, security and conduct files.
- Product documents under `docs/product/` and `docs/DOC_AUDIT.md`.

## [0.1.0] - proposed tag `v0.1.0`

First version: source registry, data-quality engine, 26 map layers, 53 API route handlers, simulator-only quantum module, Next.js front end.
