# PRD: AetherScan

**Status:** Retrospective PRD, written after the build. An earlier planning document lives in [../PRD.md](../PRD.md); this one records what the product actually is today and where it stops.

## Problem

Public air-quality data comes from many places (ground networks, satellites, fire detections, census layers), and each source has its own licence, rate limit, resolution and delay. Someone who wants to answer "how bad is the air here, and how much should I trust that number?" ends up with a dozen browser tabs and no record of where each figure came from.

## Target user

Primary user: an analyst or student who needs to look at air quality for a place using several public sources at once and wants to see which source each number came from. I have not interviewed any users. The project was built by a team of four as a university project, and I do not claim adoption by anyone outside it. My part was the backend.

## Jobs to be done

- When I look at a city's AQI, I want to see it next to satellite and fire data, so I can tell whether a spike has a visible cause.
- When two sources disagree, I want to see how fresh and how close each one is, so I can decide which to trust.
- When I need to share what I found, I want a report with the data sources named, so someone else can check it.

## Goals

1. One registry that records licence, rate limit, update frequency and provenance for every source (`docs/DATA_SOURCE_REGISTRY.md`).
2. Score every observation for quality and show a confidence for fused values (`backend/core/quality.py`, DQS and FCS).
3. Show stale or missing data as stale or missing, never as a fabricated value.
4. Serve it through a documented API (53 route handlers, see `docs/API.md`) and a map front end with 26 layers.

## Non-goals

- Forecasting.
- Health advice.
- Quantum speed-up. The quantum module runs on a simulator and makes no performance claim.
- Hosted multi-user accounts. User preferences are marked "future".

## User stories and acceptance criteria

| Story | Acceptance criteria |
|---|---|
| As an analyst I can see the AQI for a coordinate. | `GET /aqi/calculate` returns an AQI computed with the CPCB breakpoints; unit tests in `backend/tests/` cover the calculator |
| As an analyst I can tell how much to trust a fused value. | The response carries a DQS per input and an FCS for the fused value; `test_quality.py` covers the formulas |
| As an analyst I see "unavailable" when a source fails. | With no API key, providers return zero rows rather than random values; `TestZeroFakeDataPipelineInvariant` in `test_pipeline_integration.py` checks it |
| As a developer I can find a source's licence and rate limit. | Every source in `backend/data_sources/` has a row in `docs/DATA_SOURCE_REGISTRY.md` |

## Success metrics

No usage data exists, so these are build metrics and a plan.

- North star (proposed): number of analysis sessions in which a user opens a data-quality or provenance panel before exporting a report. Not measured.
- Input metrics that exist: backend tests passing (232 passed, 2 skipped, with mocked APIs), sources documented in the registry (11).
- Guardrail: no fabricated values. Enforced by tests that fail if a pipeline calls a random generator.

See [METRICS.md](METRICS.md).

## Risks and open questions

- **Free-tier hosting.** Render's free tier wipes the filesystem on restart, so SQLite data does not persist. PostgreSQL is the planned fix.
- **Fusion accuracy is unvalidated.** Nobody has compared the fused values against independent ground truth (`docs/LIMITATIONS.md`). Open question: which ground-truth set to use.
- **API dependence.** Providers rate-limit; the app degrades but does not hide it.
- **Older reports overstate the code.** See [../DOC_AUDIT.md](../DOC_AUDIT.md).
