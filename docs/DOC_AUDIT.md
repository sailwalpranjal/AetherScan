# Where the written reports and the code disagree

`progress_report.tex`, `report.tex` and `presentation.tex` were written during the project and are longer than the code can back up. I corrected `README.md`, `docs/ARCHITECTURE.md` and `research_paper.tex`. I have not edited the other three, so they still contain the statements below. Treat the code as the source of truth.

| Statement in the reports | What the code does |
|---|---|
| An `audit_log` table records every database access attempt, with 15 event types | There is no such table. `backend/models/domain.py` defines six tables: `openaq_stations`, `openaq_measurements`, `nasa_firms_fires`, `industries`, `population_data`, `cache_metadata`. The access log is a Python list in `backend/middleware/database_guard.py`, capped at 1,000 entries and lost on restart |
| "Audit-log throughput validated at 4,200 entries per second" | No script in the repository measures this |
| A three-table schema (`aqi_readings`, `audit_log`, `cached_layers`) | The six tables above |
| Per-operation latency table (P50/P95 for queries and inserts) | No benchmark in the repository produces it |
| `GET /audit/log` endpoint | No such route exists in `backend/routes/` |
| "Eight APIs" feeding `aqi_readings` | `docs/DATA_SOURCE_REGISTRY.md` and `backend/data_sources/` list more providers than that |
| `ProcessPoolExecutor` offloads quantum simulation and IDW | The executor is created in `backend/quantum/processor.py` and shut down, but nothing is submitted to it |
| PostgreSQL | Not used. SQLite with aiosqlite. PostgreSQL is planned (`docs/ISSUES.md`) |

The README used to quote "achieved" latencies, a quantum speed-up table and a 50-user test. None of those came from code in this repository, so I removed them.
