# UI tests

This folder contains end-to-end UI tests for the AI Driven Prompt Generator.

Running locally

1. Install dev deps (recommend a venv):

```pwsh
python -m pip install -r tests/pytest_requirements.txt
```

2. Start a local static server from the repo root:

```pwsh
python -m http.server 8000
```

3. Run pytest:

```pwsh
pytest -q tests
```

Notes

- Tests use webdriver-manager to download ChromeDriver at runtime.
- The test fixture creates a temporary Chrome user-data directory and cleans it up after the run.
- Avoid committing runtime artifacts (a .gitignore is included to prevent this).
