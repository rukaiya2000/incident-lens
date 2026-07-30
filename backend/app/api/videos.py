import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile

from app.config import get_settings
from app.graph import reader, writer
from app.ingestion.pipeline import get_or_create_index, run_ingestion
from app.models.schemas import VideoStatusResponse

router = APIRouter(prefix="/investigations/{investigation_id}/videos")

_STATUS_STEPS = {
    "uploaded": {"uploaded": True, "indexed": False, "entities": False, "ready": False},
    "indexing": {"uploaded": True, "indexed": False, "entities": False, "ready": False},
    "indexed": {"uploaded": True, "indexed": True, "entities": False, "ready": False},
    "extracting": {"uploaded": True, "indexed": True, "entities": False, "ready": False},
    "ready": {"uploaded": True, "indexed": True, "entities": True, "ready": True},
    "partial": {"uploaded": True, "indexed": True, "entities": False, "ready": False},
    "failed": {"uploaded": True, "indexed": False, "entities": False, "ready": False},
}


@router.post("")
async def add_video(
    investigation_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile,
    label: str,
) -> dict:
    investigation = reader.get_investigation(investigation_id)
    if investigation is None:
        raise HTTPException(status_code=404, detail="Investigation not found")

    settings = get_settings()
    video_id = str(uuid.uuid4())
    filename = f"{video_id}.mp4"
    dest_path: Path = settings.media_root_path / filename

    with open(dest_path, "wb") as out_file:
        while chunk := await file.read(1024 * 1024):
            out_file.write(chunk)

    writer.create_video(video_id, investigation_id, label, filename)

    tl_index_id = get_or_create_index(
        investigation_id, investigation.get("tl_index_id"), settings.twelvelabs_index_name_prefix
    )
    background_tasks.add_task(run_ingestion, video_id, investigation_id, tl_index_id, dest_path)

    return {"video_id": video_id, "status": "uploaded"}


@router.get("")
def list_videos(investigation_id: str) -> list[dict]:
    investigation = reader.get_investigation(investigation_id)
    if investigation is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return investigation["videos"]


@router.get("/{video_id}/status", response_model=VideoStatusResponse)
def get_video_status(investigation_id: str, video_id: str) -> VideoStatusResponse:
    video = reader.get_video(video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    status = video["status"]
    return VideoStatusResponse(
        video_id=video_id,
        status=status,
        steps=_STATUS_STEPS.get(status, _STATUS_STEPS["uploaded"]),
        error=video.get("error"),
    )
