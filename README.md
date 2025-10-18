# AI Prompt Engineer (demo)

Small demo project that generates AI prompts using frameworks (R.C.C.O, C.A.R.E, T.A.S.K) and optionally refines them via OpenAI.

Getting started (PowerShell)

1. Install dependencies

```powershell
npm install
```

2. Copy `.env.example` to `.env` and set values (optional OPENAI_API_KEY)

```powershell
cp .env.example .env
# then edit .env in your editor
```

3. Start the server

```powershell
npm run start
# or for development with auto-reload
npm run dev
```

4. Open `http://localhost:3000` in your browser. The provided `index.html` in the project root is a minimal frontend.

Notes

- If `OPENAI_API_KEY` is not set the server will return the generated prompt template and a note explaining the API key is missing.
- MongoDB is optional for this demo; if `MONGO_URI` is provided the server will attempt to connect.

Next steps

- Add authentication and prompt history storage in MongoDB.
- Add unit tests and linting.

## CI and tests

This repository uses GitHub Actions to run unit tests on pull requests and pushes to `main`.

- Run tests locally:

```powershell
npm install
npm test
```

## Changelog (recent)

- 2025-10-18: Add theme toggle, design-system, Jest unit tests and CI workflow; update lockfile to fix CI installs.
