# Use the process pool or remove it

**Labels:** type:chore, priority:P1, area:quantum

## Problem

`backend/quantum/processor.py` creates a `ProcessPoolExecutor` and shuts it down, but nothing submits work to it. IDW interpolation and circuit simulation run in the request process.

## Acceptance criteria

- [ ] Either IDW interpolation for more than N stations (choose N by measuring) runs through the pool, with a benchmark in `scripts/` showing the effect, or the executor is deleted.
- [ ] The paper and architecture notes match whichever you choose.
- [ ] Existing tests still pass.
