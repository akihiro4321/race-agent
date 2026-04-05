# Race Agent POC (Coach-first)

Minimal POC to validate LLM behavior for coach planning with mock domain logic.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

Set `OPENROUTER_API_KEY` in `.env`.

## Run evaluation

```bash
npm run eval
```

Artifacts are written to `reports/`:

- `runs.json`: raw run results
- `summary.json`: model-level metrics
- `report.md`: markdown summary
- `manual-quality-template.json`: fill 1-5 manual quality scores

## Notes

- This POC intentionally uses mock VDOT/feasibility logic.
- Scope is limited to `goal-validity`, `roadmap`, and `cycle`.
