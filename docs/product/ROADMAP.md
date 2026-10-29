# Roadmap

Scores are my own judgement. RICE = Reach x Impact x Confidence / Effort. Reach is on a 1-10 scale, Impact is 0.25 / 0.5 / 1 / 2 / 3, Confidence is a fraction, Effort is person-weeks. ICE = (Impact + Confidence + Ease) / 3, each out of 10. The longer planning phases are in [../ROADMAP.md](../ROADMAP.md).

## Now

| Item | Why | Score (my judgement) |
|---|---|---|
| Move from SQLite to PostgreSQL (`docs/ISSUES.md` #1) | Render's free tier wipes SQLite on restart, so cached data and any history disappear | RICE: 8 x 2 x 0.8 / 3 = **4.3** |
| Persist the access log to a table | The log is an in-memory list and vanishes on restart; the older reports describe a table that does not exist | RICE: 4 x 1 x 0.9 / 1 = **3.6** |
| Submit IDW work to the existing process pool, or delete the pool | An unused executor is dead weight and a misleading claim | ICE: (4 + 9 + 7) / 3 = **6.7** |
| Commit a `Dockerfile` and `docker-compose.yml` | They exist only in my local working copy | ICE: (6 + 9 + 8) / 3 = **7.7** |

## Next

| Item | Why | Score (my judgement) |
|---|---|---|
| Validate fused values against CPCB readings for one city | The biggest open scientific gap (`docs/LIMITATIONS.md`) | RICE: 6 x 3 x 0.5 / 4 = **2.3** |
| Provider abstraction layer (`docs/ISSUES.md` #2) | New sources currently mean touching business logic | RICE: 3 x 1 x 0.8 / 2 = **1.2** |
| Frontend tests | The frontend has no tests | RICE: 5 x 1 x 0.8 / 2 = **2.0** |

## Later

| Item | Why | Score (my judgement) |
|---|---|---|
| Quantum backend abstraction (`docs/ISSUES.md` #4) | Prepares for real hardware; no performance case yet | ICE: (3 + 4 + 5) / 3 = **4.0** |
| Accounts and saved locations | Marked "future" in the UI design | ICE: (5 + 3 + 3) / 3 = **3.7** |
