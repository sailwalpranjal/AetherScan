# Project board

A GitHub Project (board layout) for AetherScan. I have not created it yet; this file is the setup I intend to use.

## Columns

| Column | Meaning | Leaves the column when |
|---|---|---|
| Backlog | Raised, not yet looked at | Triaged and given a priority label |
| Ready | Problem and acceptance criteria are clear enough to start | Someone starts work |
| In progress | A branch exists | A pull request is open |
| In review | Pull request open, waiting on checks or review | Merged, or sent back |
| Done | Merged and noted in `CHANGELOG.md` | n/a |

A card should not sit in Ready unless its acceptance criteria are written down. The drafts in `docs/issues/` follow that rule.

## Labels

Create them with `bash scripts/create-labels.sh`.

| Label | Use |
|---|---|
| `type:bug` | Something is broken |
| `type:feature` | New capability or change in behaviour |
| `type:docs` | Documentation only |
| `type:chore` | Tooling, CI, dependencies |
| `priority:P0` | Do now |
| `priority:P1` | Do next |
| `priority:P2` | Do later |
| `needs-triage` | Not yet reviewed |
| `needs-info` | Waiting for more detail from the reporter |
| `blocked` | Cannot move until something else lands |
| `area:backend` | Touches backend |
| `area:frontend` | Touches frontend |
| `area:data-sources` | Touches data-sources |
| `area:quantum` | Touches quantum |
| `area:docs` | Touches docs |

## Working agreement

- One priority:P0 card at a time.
- New issues start with `needs-triage`. The label comes off when the card has a priority and an area.
- Cards link the roadmap item they come from (see `docs/product/ROADMAP.md`).
