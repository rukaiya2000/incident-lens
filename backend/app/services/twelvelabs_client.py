import json
from functools import lru_cache
from pathlib import Path

from twelvelabs import TwelveLabs

from app.config import get_settings

# Verified against twelvelabs==1.3.1 (the v1.3 API). This SDK major version
# replaced index/task/generate.summarize with indexes/tasks/analyze — re-check
# if the pin changes again.
MARENGO_ENGINE = "marengo3.0"
PEGASUS_ENGINE = "pegasus1.2"

CHAPTER_SCHEMA = {
    "type": "object",
    "properties": {
        "chapters": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "chapter_number": {"type": "integer"},
                    "start": {"type": "number"},
                    "end": {"type": "number"},
                    "summary": {"type": "string"},
                },
                "required": ["chapter_number", "start", "end", "summary"],
            },
        }
    },
    "required": ["chapters"],
}


@lru_cache
def get_client() -> TwelveLabs:
    settings = get_settings()
    return TwelveLabs(api_key=settings.twelvelabs_api_key)


def ping() -> bool:
    try:
        get_client().indexes.list(page_limit=1)
        return True
    except Exception:
        return False


def create_index(name: str) -> str:
    client = get_client()
    index = client.indexes.create(
        index_name=name,
        models=[
            {"model_name": MARENGO_ENGINE, "model_options": ["visual", "audio"]},
            {"model_name": PEGASUS_ENGINE, "model_options": ["visual", "audio"]},
        ],
    )
    return index.id


def upload_video(index_id: str, file_path: Path) -> str:
    client = get_client()
    with open(file_path, "rb") as f:
        task = client.tasks.create(index_id=index_id, video_file=f)
    result = client.tasks.wait_for_done(task.id, sleep_interval=5.0)
    if result.status != "ready":
        raise RuntimeError(f"TwelveLabs indexing failed with status {result.status}")
    return result.video_id


def get_chapters(video_id: str) -> list[dict]:
    client = get_client()
    result = client.analyze(
        video_id=video_id,
        prompt=(
            "Break this video into chronological chapters. For each chapter give a "
            "1-2 sentence summary and its precise start/end time in seconds."
        ),
        response_format={"type": "json_schema", "json_schema": CHAPTER_SCHEMA},
    )
    data = json.loads(result.data)
    return [
        {
            "chapter_number": c["chapter_number"],
            "start": c["start"],
            "end": c["end"],
            "summary": c["summary"],
        }
        for c in data["chapters"]
    ]


def generate_incident_narrative(video_id: str) -> str:
    client = get_client()
    prompt = (
        "Describe every distinct event in this video in order. For each event, "
        "state precisely who/what is involved (people, vehicles, objects), any "
        "spoken statements, and the exact start and end time in seconds. "
        "Be specific about timestamps."
    )
    result = client.analyze(video_id=video_id, prompt=prompt)
    return result.data


def search(index_id: str, query: str, video_ids: list[str] | None = None) -> list[dict]:
    client = get_client()
    results = client.search.query(
        index_id=index_id,
        search_options=["visual", "audio"],
        query_text=query,
        group_by="clip",
        page_limit=50,
    )
    video_id_set = set(video_ids) if video_ids else None
    return [
        {
            "video_id": r.video_id,
            "start": r.start,
            "end": r.end,
            "score": r.rank,
            "snippet": r.transcription,
        }
        for r in results.items or []
        # Filtered client-side rather than via the server "filter" param: its
        # syntax isn't reliably documented across SDK/API versions, and this
        # guarantees selection scoping regardless.
        if video_id_set is None or r.video_id in video_id_set
    ]
