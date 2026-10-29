# Security policy

## Supported versions

Only the latest commit on the default branch.

## Reporting a vulnerability

Please email pranjalsailwal09@gmail.com with the subject line "AetherScan security". Include what you found, how to reproduce it, and the version or commit.

I will reply within a week to confirm I have seen it. This is a one-person project, so I cannot promise a fix timeline, but I will tell you where it stands. Please do not open a public issue until we have talked.

## Scope

The FastAPI backend, including the database access guard in `backend/middleware/`, and the frontend. API keys for the data providers belong in `backend/.env`, which is git-ignored; if you find a committed key, tell me privately.
