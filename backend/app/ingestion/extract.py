import json

from app.models.extraction import VideoExtraction
from app.services import openai_client, twelvelabs_client

EXTRACTION_SYSTEM_PROMPT = """You convert a raw narrative description of a video or audio recording into strict JSON matching this schema:

{
  "events": [{"description": "short description", "start_sec": 0.0, "end_sec": 0.0, "scene_number": 1, "people": ["Officer A"], "objects": ["wallet"]}],
  "claims": [{"text": "exact assertion", "speaker": "speaker if known", "start_sec": 0.0, "end_sec": 0.0, "scene_number": 1, "claim_type": "statement"}]
}

Rules:
- Every event and claim must have start_sec/end_sec in seconds.
- scene_number should reference the chapter when determinable, else null.
- Do not invent events or claims not present in the narrative.
- Claims contain only spoken or explicitly communicated factual assertions, allegations, denials, or accounts. Do not turn ordinary visual actions into claims.
- Keep claim text close to what was asserted. Do not decide whether it is true, false, supported, or contradicted.
- Return only valid JSON, with empty arrays where no event or claim exists.
"""


def structure_narrative(chapters_context: str, narrative: str) -> VideoExtraction:
    response = openai_client.get_openai_client().chat.completions.create(
        model=openai_client.get_settings_model(),
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": f"Chapters:\n{chapters_context}\n\nNarrative:\n{narrative}\n\nProduce the JSON described in the system prompt."},
        ],
    )
    return VideoExtraction.model_validate(json.loads(response.choices[0].message.content))


def extract_video(tl_video_id: str) -> tuple[list[dict], VideoExtraction]:
    chapters = twelvelabs_client.get_chapters(tl_video_id)
    narrative = twelvelabs_client.generate_incident_narrative(tl_video_id)
    chapters_context = "\n".join(f"Chapter {item['chapter_number']} ({item['start']}s-{item['end']}s): {item['summary']}" for item in chapters)
    return chapters, structure_narrative(chapters_context, narrative)


def extract_audio_transcript(segments: list[dict]) -> VideoExtraction:
    narrative = "\n".join(f"[{item['start']:.1f}s-{item['end']:.1f}s] {item['text']}" for item in segments)
    return structure_narrative("(no chapters - audio-only source)", narrative)


def extract_claims(tl_video_id: str) -> VideoExtraction:
    """Rebuild claims for already-indexed footage without re-uploading it."""
    narrative = twelvelabs_client.generate_incident_narrative(tl_video_id)
    return structure_narrative("(existing indexed video)", narrative)