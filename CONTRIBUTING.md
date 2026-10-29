# Contributing to AetherScan

This is a personal project that I maintain on my own, so reviews are not instant. Small, focused changes get merged fastest.

## Before you start

For anything larger than a typo or a one-line fix, open an issue first using the feature request template. It asks for the problem and the acceptance criteria. That conversation is cheaper than a rejected pull request.

## Local setup

```
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt pytest pytest-asyncio
cd frontend && npm install
```

## Running the tests

```
PYTHONPATH=. python -m pytest backend/tests -c backend/pytest.ini --ignore=backend/tests/probe_cdse.py --ignore=backend/tests/probe_ogd_earthdata.py -q
```

Please run them before you push. CI runs the same command.

## Pull requests

- Branch from the default branch and keep the change to one idea.
- Write commit messages in the imperative: "fix off-by-one in window sizing", not "fixed bug".
- If you change a number quoted in the README or in `docs/`, say where the new number came from.
- Add an entry to `CHANGELOG.md` under Unreleased.

## Reporting security problems

Do not open a public issue. See [SECURITY.md](SECURITY.md).
