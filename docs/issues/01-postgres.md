# Move the database from SQLite to PostgreSQL

**Labels:** type:feature, priority:P0, area:backend

## Problem

On Render's free tier the filesystem is wiped on restart, so every cached observation and result disappears. SQLite is the only database the code has been run against.

## Acceptance criteria

- [ ] `DATABASE_URL` selects SQLite or PostgreSQL; no code path assumes a local file.
- [ ] `asyncpg` is added to `backend/requirements.txt`.
- [ ] `backend/tests/` passes against both backends (CI runs a PostgreSQL service container for one job).
- [ ] After a restart on the hosting platform, cached data is still there.
- [ ] `README.md` and `docs/ARCHITECTURE.md` stop saying PostgreSQL is planned.
