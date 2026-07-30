from functools import lru_cache
from pathlib import Path

from twelvelabs import TwelveLabs

from app.config import get_settings

# Verified against twelvelabs==0.4.5 signatures; re-check if the pin changes.
MARENGO_ENGINE = "marengo3.0"
PEGASUS_ENGINE = "pegasus1.2"


@lru_cache
def get_client() -> TwelveLabs:
    settings = get_settings()
    return TwelveLabs(api_key=settings.twelvelabs_api_key)


def ping() -> bool:
    try:
        get_client().index.list(page_limit=1)
        return True
    except Exception:
        return False


def create_index(name: str) -> str:
    client = get_client()
    index = client.index.create(
        name=name,
        models=[
            {"name": MARENGO_ENGINE, "options": ["visual", "audio"]},
            {"name": PEGASUS_ENGINE, "options": ["visual", "audio"]},
        ],
    )
    return index.id


def upload_video(index_id: str, file_path: Path) -> str:
    client = get_client()
    with open(file_path, "rb") as f:
        task = client.task.create(index_id=index_id, file=f)
    task.wait_for_done(sleep_interval=5.0)
    if task.status != "ready":
        raise RuntimeError(f"TwelveLabs indexing failed with status {task.status}")
    return task.video_id


def get_chapters(video_id: str) -> list[dict]:
    client = get_client()
    result = client.generate.summarize(video_id=video_id, type="chapter")
    return [
        {
            "chapter_number": c.chapter_number,
            "start": c.start,
            "end": c.end,
            "summary": c.chapter_summary,
        }
        for c in result.chapters
    ]


def generate_incident_narrative(video_id: str) -> str:
    client = get_client()
    prompt = (
        "Describe every distinct event in this video in order. For each event, "
        "state precisely who/what is involved (people, vehicles, objects), any "
        "spoken statements, and the exact start and end time in seconds. "
        "Be specific about timestamps."
    )
    result = client.generate.text(video_id=video_id, prompt=prompt)
    return result.data


def search(index_id: str, query: str, video_ids: list[str] | None = None) -> list[dict]:
    client = get_client()
    results = client.search.query(
        index_id=index_id,
        query_text=query,
        options=["visual", "audio"],
        page_limit=50,
    )
    video_id_set = set(video_ids) if video_ids else None
    return [
        {
            "video_id": r.video_id,
            "start": r.start,
            "end": r.end,
            "score": r.score,
            "confidence": getattr(r, "confidence", None),
        }
        for r in results.data
        # Filtered client-side rather than via the server "filter" param: its key
        # name for video-id scoping isn't reliably documented across SDK/API
        # versions, and this guarantees selection scoping regardless.
        if video_id_set is None or r.video_id in video_id_set
    ]
