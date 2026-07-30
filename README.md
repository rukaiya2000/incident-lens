# IncidentLens

Turns multi-source body-cam/dashcam footage into a temporal Neo4j knowledge graph, then answers investigative questions across selected videos with evidence-backed, timestamped answers.

Stack: Strands Agents + OpenAI + TwelveLabs + Neo4j (backend: Python/FastAPI, frontend: Next.js).

See `project-prd.md` for the full concept and `PLAN.md` (or the plan used to scaffold this repo) for architecture details.

## Setup

### 1. Accounts / credentials

1. **Neo4j Aura** — create a free instance at console.neo4j.io, save the credentials shown once.
2. **TwelveLabs** — sign up at twelvelabs.io, generate an API key.
3. **OpenAI** — create an API key at platform.openai.com, add a small billing balance.
4. Copy `backend/.env.example` to `backend/.env` and fill in the values.

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Visit `http://localhost:8000/health` to confirm Neo4j/OpenAI/TwelveLabs connectivity.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`.
