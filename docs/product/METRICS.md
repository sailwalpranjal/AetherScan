# Metrics

AetherScan has no recorded usage, so this is a plan. Nothing here has been measured.

## Questions

1. Do people look at the quality and provenance panels, or just the map?
2. Which layers are used?
3. How often does a provider fail, and does the UI say so?

## Events to add

| Event | Where | Properties |
|---|---|---|
| `layer_toggled` | frontend | `layer`, `on` |
| `quality_panel_opened` | frontend | `source` |
| `report_exported` | frontend | `layers_active`, `sources_listed` |
| `provider_call` | backend | `provider`, `status`, `latency_ms`, `rows_returned` |
| `fused_value_served` | backend | `fcs_bucket`, `n_sources` |

On the backend, write `provider_call` and `fused_value_served` to a table (SQLite today), not to the in-memory access log.

## Queries

```sql
-- provider reliability, last 7 days
SELECT provider,
       COUNT(*) AS calls,
       AVG(status = 'ok') AS success_rate,
       AVG(latency_ms) AS mean_latency_ms
FROM provider_call
WHERE ts >= datetime('now', '-7 day')
GROUP BY provider;

-- share of fused values by confidence bucket
SELECT fcs_bucket, COUNT(*) * 1.0 / SUM(COUNT(*)) OVER () AS share
FROM fused_value_served
GROUP BY fcs_bucket;
```

## Guardrail that exists today

`TestZeroFakeDataPipelineInvariant` in `backend/tests/test_pipeline_integration.py` fails if a pipeline calls a random generator or invents rows when a key is missing.
