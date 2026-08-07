# Incident Lens

> Turn multi-source body-cam, dashcam, audio and document evidence into a temporal knowledge graph — then ask investigative questions and get answers backed by timestamped clips.

Incident Lens ingests footage and case documents, extracts scenes, events, people, objects and claims with a vision-language pipeline, writes them into a Neo4j incident graph, and answers natural-language questions over any selection of that evidence. Every answer cites the exact video and timecode it came from, and any cited moment can be exported as a clip.

<p align="center">
  <img alt="Python 3.11+" src="https://img.shields.io/badge/python-3.11%2B-3776AB?logo=python&logoColor=white">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white">
  <img alt="Neo4j" src="https://img.shields.io/badge/Neo4j-5.x-008CC1?logo=neo4j&logoColor=white">
  <img alt="Status" src="https://img.shields.io/badge/status-prototype-orange">
</p>

<p align="center">
  <a href="https://drive.google.com/file/d/1erPDYIzdoVPnmUlmZ7DRsjvq0Yf1L5hy/view?usp=sharing">
    <img alt="Watch the demo" src="https://img.shields.io/badge/▶%20Watch%20the%20demo-1a73e8?style=for-the-badge&logo=googledrive&logoColor=white">
  </a>
</p>

---

## How it works

![Incident Lens workflow — a write path ingests evidence, indexes it with TwelveLabs, extracts typed entities with OpenAI and writes them to a Neo4j incident graph; a read path sends questions to a Strands agent that queries the graph and the raw footage, returning answers with timestamped evidence](docs/workflow.png)

The system has two halves that meet at the graph.

**Write path** — evidence goes in as video, audio or PDF. TwelveLabs indexes what is seen, said and written on screen. OpenAI structures that narrative into typed, time-bounded entities. Those land in Neo4j as nodes with a `PRECEDES` chain that makes the incident timeline queryable.

**Read path** — you ask a question scoped to the evidence you selected. A Strands agent picks between two tools per question: `graph_query` for structured recall over the graph, `video_search` for a fresh look at the raw footage. The answer comes back with every statement tied to a video and a timecode you can play or export.

📺 **[Watch the demo video](https://drive.google.com/file/d/1erPDYIzdoVPnmUlmZ7DRsjvq0Yf1L5hy/view?usp=sharing)** — a walkthrough of ingestion, the graph explorer, and evidence-backed Q&A.

---

## Table of contents

- [How it works](#how-it-works)
- [Why](#why)
- [Features](#features)
- [Architecture](#architecture)
- [Graph data model](#graph-data-model)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Why

A single incident is rarely captured by a single camera. Reviewing it means scrubbing through several hours of overlapping footage from different officers and vehicles, cross-referencing what each one saw, and reconciling that against written statements.

Incident Lens treats the incident — not the file — as the unit of work. Footage from every source is fused into one temporal graph, so questions can be asked across sources at once ("did anyone mention a weapon?", "compare what Officer A and Officer B saw on arrival"), and each answer comes back with the evidence attached rather than as an unsourced summary.

## Features

**Evidence ingestion**
- Upload video or audio files directly, or pull them from a URL
- Import a whole case page: paste a case URL and preview every video, audio track and PDF found on it, then bulk-select what to ingest
- PDF statements and reports are downloaded, text-extracted and indexed alongside the media
- Per-item processing status with step-level progress and error surfacing

**Graph construction**
- Videos are indexed and searched with TwelveLabs across visual content, speech, audio and on-screen text
- An LLM pass structures raw chapters and narrative into typed `Scene`, `Event`, `Person` and `Object` nodes with time bounds
- Events are chained with `PRECEDES` so the incident timeline is a first-class part of the graph
- Statements are extracted as `Claim` nodes and automatically assessed against video evidence, producing `SUPPORTS` / `CONTRADICTS` edges

**Investigative Q&A**
- Ask questions scoped to a hand-picked subset of videos and documents within a case
- Cross-case mode compares two or more investigations in a single question
- The agent has two tools — read-only Cypher over the graph, and natural-language video search — and chooses between structured recall and raw-footage lookup per question
- Answers render as markdown with an evidence rail of timestamped citations

**Review workspace**
- Interactive force-directed graph explorer with a full-screen mode
- Video player that seeks straight to a cited timecode
- Claims panel showing each statement's assessment and supporting or contradicting events
- Reports view aggregating every analyzed video, its extracted event count and highlights
- One-click clip export for any cited time range

## Architecture

```
                          ┌──────────────────────────────┐
                          │   Next.js 16 App (frontend)  │
                          │  investigations · graph view │
                          │  ask panel · claims · clips  │
                          └───────────────┬──────────────┘
                                          │  REST / JSON
                          ┌───────────────▼──────────────┐
                          │      FastAPI (backend)       │
                          │  /investigations /videos     │
                          │  /documents /ask /cross-case │
                          └───┬───────────┬───────────┬──┘
                              │           │           │
            ┌─────────────────▼──┐   ┌────▼─────┐   ┌─▼──────────────────┐
            │ Ingestion pipeline │   │  Strands │   │   Neo4j (Aura)     │
            │ index → extract →  │   │  agent   │◄─►│  incident graph    │
            │ structure → write  │   │  loop    │   │  scenes · events   │
            └───┬────────────┬───┘   └────┬─────┘   │  people · claims   │
                │            │            │         └────────────────────┘
        ┌───────▼─────┐  ┌───▼────────┐   │
        │ TwelveLabs  │  │  OpenAI    │◄──┘
        │ video index │  │  structure │
        │ + search    │  │  + reason  │
        └─────────────┘  └────────────┘
```

**Ingestion flow.** An uploaded or downloaded file is registered in the graph, indexed into a per-investigation TwelveLabs index, summarized into chapters and a narrative, structured into typed entities by an OpenAI call against a strict schema, and written to Neo4j. Audio-only sources take a transcript path instead; PDFs take a text-extraction path. Claim assessment reruns after each successful ingestion so new footage can revise earlier verdicts. Failures at any step are recorded on the node rather than discarding partial evidence.

**Query flow.** `POST /ask` resolves the selected videos and documents, builds request-scoped tools closed over exactly that selection, and runs a Strands agent loop. `graph_query` runs read-only Cypher with the allowed IDs pre-bound; `video_search` hits TwelveLabs restricted to the same set. Cited moments are deduplicated and time-sorted into the evidence list.

## Graph data model

**Nodes** — `Investigation`, `Video`, `Document`, `Scene`, `Event`, `Person`, `Object`, `VideoSegment`, `Claim`

**Relationships**

| Edge | Meaning |
|---|---|
| `(:Investigation)-[:HAS_VIDEO]->(:Video)` | Case owns a media source |
| `(:Investigation)-[:HAS_DOCUMENT]->(:Document)` | Case owns a written source |
| `(:Video)-[:CONTAINS]->(:Scene)` | Video decomposes into scenes |
| `(:Scene)-[:CONTAINS]->(:Event)` | Scene contains discrete events |
| `(:Event)-[:PRECEDES]->(:Event)` | Temporal ordering of the incident |
| `(:Event)-[:INVOLVES]->(:Person\|:Object)` | Entity participation |
| `(:Event)-[:FROM_VIDEO]->(:Video)` | Provenance back to the source |
| `(:Claim)-[:MADE_BY]->(:Person)` | Who asserted it |
| `(:Claim)-[:STATED_IN]->(:Document)` | Where it was asserted |
| `(:Event)-[:SUPPORTS\|:CONTRADICTS]->(:Claim)` | Evidence-backed assessment |
| `(:Claim)-[:SUPPORTED_BY]->(:Event)` | Reverse lookup for the claims panel |

Uniqueness constraints exist on every node `id`; lookup indexes cover `investigation_id` and `video_id`. Schema is applied idempotently on app startup — see `backend/app/graph/schema.py`.

## Tech stack

| Layer | Technology |
|---|---|
| Agent runtime | Strands Agents 0.1.x |
| Reasoning / structuring | OpenAI (`gpt-4o-mini` by default) |
| Video understanding | TwelveLabs 1.3 (index, search, summarize) |
| Graph database | Neo4j 5.x (Aura or self-hosted) |
| Backend | Python 3.11+, FastAPI, Pydantic v2, uvicorn |
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4 |
| Visualization | d3-force |
| Media handling | yt-dlp, pypdf, ffmpeg |

## Quick start

### Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer
- `ffmpeg` on your `PATH` (required for clip export)
- A Neo4j 5.x instance — [Neo4j Aura](https://console.neo4j.io) free tier works
- API keys for [TwelveLabs](https://twelvelabs.io) and [OpenAI](https://platform.openai.com)

### 1. Clone

```bash
git clone https://github.com/rukaiya2000/incident-lens.git
cd incident-lens
```

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env      # then fill in credentials — see Configuration
uvicorn app.main:app --reload --port 8001
```

Confirm every dependency is reachable:

```bash
curl http://localhost:8001/health
# {"neo4j":true,"openai":true,"twelvelabs":true}
```

Interactive API docs are at <http://localhost:8001/docs>.

### 3. Frontend

```bash
cd frontend
npm install

echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8001" > .env.local
npm run dev
```

Open <http://localhost:3000>.

> **Port note:** the backend must be served on the port `NEXT_PUBLIC_API_BASE_URL` points at. The examples above use `8001`; if you run uvicorn on its default `8000`, update `.env.local` to match. The backend's CORS allowlist permits `localhost:3000` and `localhost:3001` only — widen it in `backend/app/main.py` if you serve the frontend elsewhere.

## Configuration

All backend settings are read from `backend/.env` (see `backend/.env.example`).

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEO4J_URI` | ✅ | — | Bolt URI, e.g. `neo4j+s://xxxx.databases.neo4j.io` |
| `NEO4J_USERNAME` | ✅ | — | Neo4j user |
| `NEO4J_PASSWORD` | ✅ | — | Neo4j password |
| `TWELVELABS_API_KEY` | ✅ | — | TwelveLabs API key |
| `TWELVELABS_INDEX_NAME_PREFIX` | — | `incidentlens` | Prefix for per-investigation indexes |
| `OPENAI_API_KEY` | ✅ | — | OpenAI API key |
| `OPENAI_MODEL` | — | `gpt-4o-mini` | Model for structuring, assessment and the agent loop |
| `MEDIA_ROOT` | — | `./data/uploads` | Where ingested media is stored and served from |
| `UPLOAD_MAX_MB` | — | `500` | Per-file upload ceiling |

Frontend configuration is a single variable in `frontend/.env.local`:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | Base URL of the FastAPI backend |

> **Security:** `.env`, `.env.local` and everything under `backend/data/` are git-ignored. Never commit credentials or case media. This is a prototype — it ships with no authentication, no authorization and no audit log, so do not expose it publicly or point it at real case material without adding those first.

## Usage

1. **Create an investigation** from the home page — name it after the incident.
2. **Add evidence.** Upload files directly, add a single media URL, or paste a case page URL to preview and bulk-select every video, audio track and PDF it links to.
3. **Wait for processing.** Each item shows step-level status; the graph fills in as items reach `ready`.
4. **Explore the graph.** Open the graph view to see scenes, events, people and objects, or go full-screen for a larger canvas.
5. **Ask questions.** Select the videos and documents to scope the question to, then ask. Answers cite timestamped evidence — click a citation to seek the player, or export it as a clip.
6. **Review claims.** The claims panel lists each extracted statement with its assessment and the events that support or contradict it. Rebuild assessments after adding new footage.
7. **Compare cases.** Select multiple investigations on the home page and open Compare to ask one question across all of them.

### Example questions

```text
Build a timeline of events from the first officer's arrival until the suspect was detained.
Compare what Officer A and Officer B observed when they arrived.
Did anyone mention a weapon across the selected footage?
Does the incident report's account of the traffic stop match the body-cam video?
What happened in the 30 seconds after the vehicle door opened?
```

## API reference

Base URL: `http://localhost:8001`

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Connectivity check for Neo4j, OpenAI and TwelveLabs |

### Investigations

| Method | Path | Description |
|---|---|---|
| `POST` | `/investigations` | Create an investigation |
| `GET` | `/investigations` | List investigations |
| `GET` | `/investigations/{id}` | Investigation detail with videos and documents |
| `GET` | `/investigations/{id}/graph` | Nodes and edges for the graph view |
| `GET` | `/investigations/{id}/claims` | Extracted claims with assessments |
| `POST` | `/investigations/{id}/claims/rebuild` | Re-run claim assessment in the background |

### Evidence

| Method | Path | Description |
|---|---|---|
| `POST` | `/investigations/{id}/videos` | Upload a video or audio file (multipart) |
| `POST` | `/investigations/{id}/videos/from-url` | Ingest media from a URL |
| `POST` | `/investigations/{id}/videos/case-source/preview` | Scrape a case page and preview its media and documents |
| `GET` | `/investigations/{id}/videos` | List media sources |
| `GET` | `/investigations/{id}/videos/{video_id}/status` | Per-step ingestion status |
| `POST` | `/investigations/{id}/documents/from-url` | Ingest a PDF from a URL |
| `GET` | `/investigations/{id}/documents` | List documents |
| `GET` | `/investigations/{id}/documents/{document_id}/status` | Document ingestion status |

### Q&A, clips and reports

| Method | Path | Description |
|---|---|---|
| `POST` | `/investigations/{id}/ask` | Ask a question scoped to selected videos and documents |
| `POST` | `/cross-case/ask` | Ask one question across multiple investigations |
| `GET` | `/videos/{video_id}/clip?start_sec=&end_sec=` | Export a cited time range as a downloadable clip |
| `GET` | `/reports` | Aggregated analysis summaries across all investigations |
| `GET` | `/media/{filename}` | Static media served from `MEDIA_ROOT` |

<details>
<summary>Example: ask a scoped question</summary>

```bash
curl -X POST http://localhost:8001/investigations/$INVESTIGATION_ID/ask \
  -H 'Content-Type: application/json' \
  -d '{
        "question": "What happened after the officer approached the vehicle?",
        "video_ids": ["<video-id-a>", "<video-id-b>"],
        "document_ids": []
      }'
```

```jsonc
{
  "answer": "Officer A approaches the driver-side window at 0:42 …",
  "evidence": [
    {
      "video_id": "…",
      "video_label": "Bodycam A",
      "start_sec": 42.0,
      "end_sec": 58.5,
      "snippet": "Officer requests license and registration"
    }
  ]
}
```

</details>

## Project structure

```
incident-lens/
├── backend/
│   ├── app/
│   │   ├── agent/            # Strands agent: orchestrator, tools, prompts
│   │   ├── api/              # FastAPI routers
│   │   ├── graph/            # Neo4j driver, schema, reader, writer
│   │   ├── ingestion/        # Pipeline + LLM extraction
│   │   ├── models/           # Pydantic request/response and extraction schemas
│   │   ├── services/         # TwelveLabs, OpenAI, scrapers, downloaders, clip export
│   │   ├── config.py         # Settings from .env
│   │   └── main.py           # App entrypoint, CORS, static media mount
│   ├── data/                 # Ingested media and demo clips (git-ignored)
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── components/       # Shared UI
│   │   ├── investigations/[id]/
│   │   │   ├── components/   # Ask panel, graph view, claims, player, evidence cards
│   │   │   └── page.tsx      # Investigation workspace
│   │   ├── compare/          # Cross-case comparison
│   │   ├── reports/          # Aggregated analysis reports
│   │   ├── lib/api.ts        # Typed backend client
│   │   └── page.tsx          # Investigation list
│   └── package.json
├── project-prd.md            # Product concept and design rationale
└── README.md
```

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `/health` reports `neo4j: false` | Check `NEO4J_URI` scheme (`neo4j+s://` for Aura) and that the instance is resumed — Aura free instances pause when idle |
| Frontend shows "Failed to load investigations" | `NEXT_PUBLIC_API_BASE_URL` doesn't match the port uvicorn is on, or the backend isn't running |
| CORS errors in the browser console | Frontend is served from an origin outside the allowlist in `backend/app/main.py` |
| Video stuck in `processing` | TwelveLabs indexing is slow for long files; check the status endpoint's `error` field before retrying |
| Clip export fails | `ffmpeg` is not installed or not on `PATH` |
| URL ingestion fails | Source may block automated download; try uploading the file directly |
| Claims show no assessment | Assessment runs after ingestion — add a document with statements, then `POST .../claims/rebuild` |

## Roadmap

- [ ] Authentication, authorization and an evidence-access audit trail
- [ ] Persistent job queue for ingestion (currently in-process background tasks)
- [ ] Speaker diarization and identity resolution across sources
- [ ] Automated chain-of-custody metadata on every node
- [ ] Exportable case reports (PDF) with embedded clip references
- [ ] Test suite and CI

## Contributing

Issues and pull requests are welcome.

1. Fork and branch from `main`
2. Keep backend changes typed and Pydantic-validated; run `npm run lint` for frontend changes
3. Use conventional-commit subjects (`feat:`, `fix:`, `refactor:`)
4. Describe the behavior change and any new environment variables in the PR

## License

No license file is present yet — all rights reserved by default. Add a `LICENSE` file before distributing or accepting outside contributions.

---

Built for the [Video Agent + Context Graph hackathon](https://luma.com/hack-video-agent-context-graph-jul30-2026) on the Strands Agents + OpenAI + TwelveLabs + Neo4j stack. See `project-prd.md` for the full product concept.
