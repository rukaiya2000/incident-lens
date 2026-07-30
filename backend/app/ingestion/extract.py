import json

from app.models.extraction import VideoExtraction
from app.services import openai_client, twelvelabs_client

EXTRACTION_SYSTEM_PROMPT = """You convert a raw narrative description of a video or audio \
recording into strict JSON matching this schema:

{
  "events": [
    {
      "description": "short description of what happens",
      "start_sec": 0.0,
      "end_sec": 0.0,
      "scene_number": 1,
      "people": ["Officer A", "Driver"],
      "objects": ["patrol car", "wallet"]
    }
  ]
}

Rules:
- Every event must have precise start_sec/end_sec in seconds (numbers, not timestamps like mm:ss).
- scene_number should reference the chapter number the event falls within, if determinable, else null.
- people should list distinct people/roles mentioned (e.g. "Officer A", "Driver", "Passenger").
- objects should list distinct physical objects/vehicles mentioned.
- Do not invent events not present in the narrative.
- Return ONLY valid JSON, no prose, no markdown fences.
"""


def structure_narrative_to_events(chapters_context: str, narrative: str) -> VideoExtraction:
    user_prompt = (
        f"Chapters:\n{chapters_context}\n\nNarrative:\n{narrative}\n\n"
        "Produce the JSON described in the system prompt."
    )

    client = openai_client.get_openai_client()
    settings_model = openai_client.get_settings_model()
    response = client.chat.completions.create(
        model=settings_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    raw = response.choices[0].message.content
    data = json.loads(raw)
    return VideoExtraction.model_validate(data)


def extract_video(tl_video_id: str) -> tuple[list[dict], VideoExtraction]:
    chapters = twelvelabs_client.get_chapters(tl_video_id)
    narrative = twelvelabs_client.generate_incident_narrative(tl_video_id)

    chapters_context = "\n".join(
        f"Chapter {c['chapter_number']} ({c['start']}s-{c['end']}s): {c['summary']}" for c in chapters
    )
    extraction = structure_narrative_to_events(chapters_context, narrative)
    return chapters, extraction


def extract_audio_transcript(segments: list[dict]) -> VideoExtraction:
    narrative = "\n".join(f"[{s['start']:.1f}s-{s['end']:.1f}s] {s['text']}" for s in segments)
    return structure_narrative_to_events("(no chapters — audio-only source)", narrative)
