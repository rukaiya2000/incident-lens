from pathlib import Path

from app.graph import writer
from app.ingestion.extract import extract_video
from app.services import twelvelabs_client

# Ordered checklist steps surfaced by the /status endpoint, matching PRD's
# "uploaded -> indexing -> scenes -> entities -> graph written" visual.
STEPS = ["uploaded", "indexed", "scenes", "entities", "ready"]


def get_or_create_index(investigation_id: str, tl_index_id: str | None, name_prefix: str) -> str:
    if tl_index_id:
        return tl_index_id
    index_id = twelvelabs_client.create_index(f"{name_prefix}-{investigation_id[:8]}")
    writer.set_investigation_index_id(investigation_id, index_id)
    return index_id


def run_ingestion(video_id: str, investigation_id: str, tl_index_id: str, file_path: Path) -> None:
    try:
        writer.set_video_status(video_id, "indexing")
        tl_video_id = twelvelabs_client.upload_video(tl_index_id, file_path)
        writer.set_video_tl_id(video_id, tl_video_id)
        writer.set_video_status(video_id, "indexed")

        writer.set_video_status(video_id, "extracting")
        chapters, extraction = extract_video(tl_video_id)
        writer.write_scenes(video_id, chapters)
        writer.write_extraction(video_id, investigation_id, extraction)

        writer.set_video_status(video_id, "ready")
    except Exception as exc:  # noqa: BLE001 - surfaced to the UI, not swallowed silently
        writer.set_video_status(video_id, "partial", error=str(exc))
