# Task Completion Checklist

Run from `backend/`:
```bash
PYTHONPATH=. .venv/bin/python -m pytest tests/ -v
```

Run from `frontend/`:
```bash
npm run typecheck
npm run lint
```

All 46 metrics tests must stay green. Any change to `app/services/metrics.py`
must be reflected in `tests/test_metrics.py` fixtures if formulas change.

After model changes: generate + apply migration before testing API routes.
