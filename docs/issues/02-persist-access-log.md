# Persist the database access log

**Labels:** type:feature, priority:P1, area:backend

## Problem

`DatabaseGuard.access_log` is a Python list capped at 1,000 entries. It is lost on restart, and nothing outside the process can read it.

## Acceptance criteria

- [ ] Each validation and violation writes a row (time, route, operation, outcome) to an `access_log` table.
- [ ] Application code only inserts rows; it never updates or deletes them.
- [ ] A unit test shows a blocked token creates a violation row.
- [ ] The in-memory list can stay as a cache but is no longer the source of truth.
