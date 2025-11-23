# Tools

## Agent Log Dashboard
- Output lives in `logs/AGENT_DASHBOARD.md`
- Per-agent summaries live in `logs/agents/`

## Progress Reporter
- Appends pipeline summaries to `PROGRESS.md`
- Timestamped logs in `logs/progress/`

## Rollback
- Git snapshots tagged: `x402-snapshot-<timestamp>`
- Full backups in `backups/<timestamp>/`
- To restore, run the x402Rollback agent and select snapshot.
