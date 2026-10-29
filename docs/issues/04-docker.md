# Commit the Dockerfile and compose file

**Labels:** type:chore, priority:P1, area:backend

## Problem

A `Dockerfile` and `docker-compose.yml` exist in my local working copy but not in the repository, so nobody else can run the stack in one command.

## Acceptance criteria

- [ ] `docker compose up` starts the backend on port 8000 and `GET /health` returns 200.
- [ ] No secrets are baked into the image; keys come from `backend/.env`.
- [ ] The README quick start mentions it.
