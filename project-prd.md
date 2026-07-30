# Hackathon Discussion — Video Agent + Context Graph

https://luma.com/hack-video-agent-context-graph-jul30-2026?tk=eBRBig


The core challenge is **not simply “ask questions about a video.”** They explicitly want a **video agent that turns raw video into a context graph and reasons over the entities, scenes, tags, and relationships it discovers.** The required stack is **Strands Agents + OpenAI + TwelveLabs + Neo4j**.

Your police body-cam idea is actually a **very good domain** for this because body-cam footage naturally contains events, people, vehicles, locations, dialogue, actions, timestamps, and relationships.

But I would change the framing significantly.

# My recommendation: "IncidentGraph"

Instead of:

> Upload/select body-cam videos → ask questions

Build:

> **Upload/select body-cam videos → automatically construct an incident timeline + context graph → ask investigative questions across one or multiple videos → get answers with timestamped visual/audio evidence.**

That makes it much more aligned with the hackathon.

## 1. Your multi-video idea should absolutely stay

This is probably the strongest part of your concept.

Imagine the user has:

- `Officer_A_Bodycam.mp4`
- `Officer_B_Bodycam.mp4`
- `Dashcam_Unit_12.mp4`

And the UI shows:

**Select footage**

☑ Bodycam A  
☑ Bodycam B  
☐ Dashcam Unit 12

Then:

> **"What happened after the officer approached the vehicle?"**

The system searches only the selected videos.

Even better:

> **"Compare what Officer A and Officer B observed when they arrived."**

Or:

> **"Did anyone mention a weapon across the selected footage?"**

Or:

> **"Build a timeline of events from the first officer arrival until the suspect was detained."**

That's much more interesting than ordinary video QA.

TwelveLabs is specifically designed to search video using natural language across visual content, audio, speech and on-screen text, and its indexes can contain multiple related videos.

## 2. The BIG differentiator: don't make Neo4j invisible

This is where I think you can make your project stand out.

Don't just use Neo4j as a backend database.

**Make the graph the product.**

For example, your graph could look conceptually like:

```text
                    ┌──────────────┐
                    │   INCIDENT   │
                    │  Traffic Stop│
                    └───────┬──────┘
                            │
                 OCCURRED_AT│
                            ▼
                       ┌─────────┐
                       │Location │
                       └─────────┘
                            ▲
                            │
                     OBSERVED_AT
                            │
 ┌─────────────┐     ┌──────┴──────┐     ┌─────────────┐
 │  Officer A  │────▶│    Scene    │◀────│  Officer B  │
 └─────────────┘     └──────┬──────┘     └─────────────┘
                             │
                  INVOLVES / OBSERVED
                             │
                       ┌─────▼─────┐
                       │  Vehicle  │
                       └─────┬─────┘
                             │
                          OCCUPANT
                             │
                       ┌─────▼─────┐
                       │  Person   │
                       └───────────┘
```

Neo4j is particularly suited to this because relationships are first-class objects rather than something you reconstruct through joins.

## 3. What should go into your graph?

Don't try to recognize everything.

For a hackathon, I'd use a small but powerful schema.

### Nodes

```text
Video
Scene
Event
Person
Officer
Vehicle
Location
Object
Statement
Action
Time
```

### Relationships

```text
Video ──CONTAINS──> Scene

Scene ──PRECEDES──> Scene

Scene ──CONTAINS──> Event

Person ──PERFORMS──> Action

Person ──SPEAKS──> Statement

Person ──ENTERS──> Vehicle

Officer ──OBSERVES──> Person

Officer ──APPROACHES──> Vehicle

Event ──OCCURS_AT──> Time

Event ──OCCURS_AT──> Location

Event ──SUPPORTED_BY──> VideoSegment
```

And **every important node/event should point back to a timestamped video segment.**

That's crucial.

## 4. The killer feature: Evidence-backed answers

Don't let OpenAI simply answer:

> "The officer approached the vehicle around 2:15."

Instead:

### Answer

**The officer approached the vehicle after it stopped near the intersection.**

**Evidence:**

🎥 `Bodycam A — 02:14–02:28`

> Officer approaches driver's side.

🎥 `Bodycam B — 01:48–02:03`

> Second officer arrives from behind the vehicle.

Then make those timestamps clickable.

That gives you:

**Answer → Graph reasoning → TwelveLabs retrieval → exact video evidence**

This is much stronger technically and in a demo.

TwelveLabs search results can return relevant video segments with time ranges, which fits this evidence model very well.

## 5. Go one step further: "Investigative Mode"

Instead of a generic chatbot, give the user modes:

### 🔎 Ask

> "What did the officer say?"

### 🕐 Timeline

> "Show me everything that happened from 2:00–3:00."

### 🔗 Connections

> "Which people interacted with the suspect?"

### 🔀 Cross-video

> "What did Officer B see that Officer A didn't?"

### 🧩 Investigate

> "Find inconsistencies between the officers' accounts."

That last one is **very demo-worthy**.

## 6. Cross-video contradiction detection

Suppose:

**Bodycam A**

> Officer A says: "The person exited the vehicle after I asked them."

**Bodycam B**

Video visually shows the person exiting **before** Officer A says that.

Your system could respond:

> ⚠️ **Potential discrepancy detected**
>
> Officer A's statement suggests the person exited after the request.
>
> However, Bodycam B shows the person exiting approximately 6 seconds earlier.
>
> **Evidence**
> - Bodycam A — 03:21–03:30
> - Bodycam B — 03:14–03:24

And importantly, phrase it as **"potential discrepancy"**, not "the officer lied."

That distinction matters.

## 7. Your graph makes this even cooler

The graph could represent:

```text
Officer A
   │
   │ SAID
   ▼
"Person exited after request"
   │
   │ CONTRADICTED_BY
   ▼
Video B / Scene 17
   │
   │ SHOWS
   ▼
Person exits vehicle
   │
   │ 6 seconds earlier
   ▼
Video A / Scene 21
```

Now you aren't just doing video retrieval.

You're doing **multimodal reasoning over a temporal knowledge graph.**

That's exactly the kind of thing the hackathon description is pushing toward.

## 8. Agent architecture

You have four major technologies, so give each one a clear job.

```text
                 USER
                   │
                   ▼
             React Frontend
                   │
                   ▼
          ┌─────────────────┐
          │  Strands Agent  │
          │   Orchestrator  │
          └────────┬────────┘
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
   TwelveLabs    Neo4j       OpenAI
       │           │           │
       │           │           │
 video search   graph query   reasoning
       │           │           │
       └───────────┼───────────┘
                   ▼
            Evidence Builder
                   │
                   ▼
          Answer + timestamps
                   │
                   ▼
             Video Player
```

### TwelveLabs

Does:

- speech understanding
- visual understanding
- actions
- objects
- scenes
- video retrieval
- timestamps

### Neo4j

Stores:

- people
- officers
- scenes
- events
- statements
- relationships
- timestamps
- video references

### OpenAI

Does:

- query understanding
- reasoning
- graph interpretation
- multi-video comparison
- answer synthesis
- uncertainty detection

### Strands

Acts as the **agent orchestrator**.

It decides:

```text
User question
     ↓
Do I need video search?
     ↓
Do I need graph traversal?
     ↓
Do I need both?
     ↓
Retrieve evidence
     ↓
Reason
     ↓
Return grounded answer
```

That makes your agent meaningful instead of simply putting an LLM chat box over a database.

## 9. Example: why graph + video is better than just video QA

User selects:

☑ Video A  
☑ Video B  
☑ Video C

Question:

> **"Trace the suspect's movements across all three videos."**

Your agent could produce:

### Movement timeline

**00:12 — Video A**

Suspect exits vehicle.

↓

**02:17 — Video A**

Suspect walks toward intersection.

↓

**04:03 — Video B**

Suspect enters second camera's field of view.

↓

**04:41 — Video B**

Officer approaches suspect.

↓

**06:18 — Video C**

Suspect enters building.

And underneath:

**Graph path**

```text
Person
  ↓
EXITS
  ↓
Vehicle
  ↓
WALKS_TO
  ↓
Intersection
  ↓
OBSERVED_IN
  ↓
Scene B
  ↓
ENTERS
  ↓
Building
```

Every step has a **video evidence link**.

That is a fantastic demo.

## 10. Add a "Graph View" to the UI

This could be your wow moment.

Your frontend could have:

```text
┌──────────────────────────────────────────────────┐
│ IncidentGraph                                    │
├──────────────────────┬───────────────────────────┤
│                      │                           │
│   [Officer A]        │  Ask a question...       │
│       │              │                           │
│       ▼              │  "What happened after    │
│    [Scene 1]─────────│   the vehicle stopped?"  │
│       │              │                           │
│       ▼              │  ──────────────────────   │
│   [Vehicle]          │                           │
│       │              │  Answer                   │
│       ▼              │  ...                      │
│    [Person]          │                           │
│                      │  Evidence                 │
│                      │  ▶ Video A 02:14–02:31   │
│                      │  ▶ Video B 01:53–02:04   │
└──────────────────────┴───────────────────────────┘
```

When the user asks a question, highlight the relevant graph path.

That visually proves you're using Neo4j.

## 11. Ingestion flow

I'd make the app start like:

### Step 1 — Create investigation

```text
New Investigation

Name:
Traffic Stop - July 2026

Description:
Multi-camera incident analysis
```

### Step 2 — Add footage

```text
+ Add Video

Bodycam A
Bodycam B
Dashcam C
```

For your demo, use **publicly available footage that you can realistically obtain and process**, preferably official/public agency releases or footage with clear reuse/access terms. Don't make the demo depend on a fragile YouTube downloader.

### Step 3 — Process

```text
✓ Video uploaded
✓ TwelveLabs indexing
✓ Scene detection
✓ Speech/visual analysis
✓ Entities extracted
✓ Events extracted
✓ Neo4j graph constructed
✓ Evidence links created

Investigation ready.
```

## 12. Video selection

This part of your original idea is **excellent**.

For example:

```text
AVAILABLE FOOTAGE

☑ Officer A — Bodycam
☑ Officer B — Bodycam
☐ Officer C — Bodycam
☐ Dashcam 12
```

Then:

**Search scope: 2 videos**

The agent only reasons over those selected sources.

This is important because it makes your application feel like an actual investigation workspace rather than a toy chatbot.

## 13. Add a "Compare" feature

A button:

### Compare selected footage

User selects:

☑ Officer A  
☑ Officer B

Then asks:

> **"What did each officer observe?"**

Output:

| | Officer A | Officer B |
|---|---|---|
| Person exits vehicle | 02:14 | 01:58 |
| Person moves toward car | 02:31 | 02:10 |
| Officer approaches | 02:47 | 02:24 |
| Mention of weapon | 03:02 | 02:43 |

And then:

### Potential differences

> Bodycam B captures the person approaching the rear of the vehicle before that movement appears in Bodycam A.

This is where your multi-video feature becomes genuinely valuable.

## 14. One thing I would NOT do

Don't build:

> Upload video → "What happened?" → ChatGPT answer

That's too easy to perceive as:

**TwelveLabs + LLM wrapper.**

Your hackathon's differentiator should be:

> **Video → structured context → graph → agentic reasoning → evidence**

That's the story.

## 15. Product name ideas

I think **IncidentGraph** is strong.

Other possibilities:

- **SceneGraph AI**
- **CaseGraph**
- **TraceGraph**
- **EvidenceGraph**
- **IncidentLens**
- **SceneTrace**
- **ContextLens**
- **FrameTrace**
- **CaseLens**
- **VeriScene**

Top 3:

### 🥇 IncidentGraph
Clear and directly communicates your differentiator.

### 🥈 EvidenceGraph
Strong if you focus heavily on evidence and provenance.

### 🥉 IncidentLens
More product-like, less technical.

## 16. Pitch

Your pitch shouldn't be:

> "We built an AI that can ask questions about police videos."

Instead:

> **"IncidentGraph turns hours of body-camera footage into a searchable temporal knowledge graph. Investigators can select one or multiple video sources, ask questions across them, and receive answers grounded in exact video evidence and timestamps."**

Then:

> **"Instead of treating every video as an isolated file, we connect people, events, actions, statements, scenes and locations into a single context graph."**

That is much more compelling.

## 17. MVP vs stretch goals

Since this is a **one-day hackathon**, don't overbuild.

### 🔥 MVP — absolutely finish these

**1. Multiple video ingestion**

```text
Video A
Video B
Video C
```

**2. Video selection**

```text
☑ A
☑ C
```

**3. TwelveLabs retrieval**

Natural language → relevant timestamped clips.

**4. Neo4j context graph**

At minimum:

```text
Video → Scene → Event → Person/Object
```

**5. OpenAI reasoning**

Question → graph + video evidence → answer.

**6. Evidence-backed response**

Every answer contains:

```text
Answer
↓
Source video
↓
Timestamp
↓
Play clip
```

### 🚀 If you have time

Add:

- cross-video comparison
- automatic timeline
- graph visualization
- contradiction detection
- confidence scores
- "Why did you reach this conclusion?"
- evidence trail

### 🧨 Don't waste hackathon time on

- sophisticated authentication
- huge database architecture
- custom ML models
- fine-tuning
- fancy dashboards
- dozens of entity types
- trying to perfectly identify people

## 18. Recommended architecture

Given your existing experience with React/Next.js, Node and AI/RAG, I'd go:

```text
                  React / Next.js
                        │
              ┌─────────┴─────────┐
              │                   │
       Video Selector         Chat UI
              │                   │
              └─────────┬─────────┘
                        │
                     Backend
                        │
                 Strands Agent
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   TwelveLabs        Neo4j           OpenAI
        │               │               │
        ▼               ▼               ▼
Video segments     Context graph    Reasoning
        │               │               │
        └───────────────┼───────────────┘
                        ▼
                Evidence Resolver
                        │
                        ▼
               Answer + timestamps
```

And importantly, **don't use a separate vector DB unless you discover during implementation that you actually need one.** TwelveLabs is already giving you multimodal video retrieval, and Neo4j is your structured relationship layer.

## Core concept in one sentence

**You're not building a police-video chatbot. You're building an AI incident investigator that converts multiple videos into a temporal context graph and lets users reason over the connected evidence.**

The multi-video selection + cross-video reasoning + Neo4j graph + timestamped evidence is the combination that can make this much more competitive than a basic video-Q&A demo.
