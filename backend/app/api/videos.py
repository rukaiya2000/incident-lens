import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile

from app.config import get_settings
from app.graph import reader, writer
from app.ingestion.pipeline import get_or_create_index, run_ingestion, run_ingestion_from_url
from app.models.schemas import (
    AddVideoFromUrlRequest,
    CaseSourceRequest,
    CaseSourceResponse,
    VideoStatusResponse,
)
from app.services import case_scraper

router = APIRouter(prefix="/investigations/{investigation_id}/videos")

_STATUS_STEPS = {
    "downloading": {"uploaded": False, "indexed": False, "entities": False, "ready": False},
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


@router.post("/case-source/preview", response_model=CaseSourceResponse)
def preview_case_source(investigation_id: str, payload: CaseSourceRequest) -> CaseSourceResponse:
    try:
        referer, items = case_scraper.fetch_case_videos(payload.url)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read that case page: {exc}") from exc
    return CaseSourceResponse(referer=referer, items=items)


@router.post("/from-url")
def add_video_from_url(
    investigation_id: str,
    background_tasks: BackgroundTasks,
    payload: AddVideoFromUrlRequest,
) -> dict:
    investigation = reader.get_investigation(investigation_id)
    if investigation is None:
        raise HTTPException(status_code=404, detail="Investigation not found")

    existing = reader.find_video_by_source_url(investigation_id, payload.source_url)
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail=f"This video was already added as '{existing['label']}' ({existing['status']}).",
        )

    settings = get_settings()
    video_id = str(uuid.uuid4())
    filename = f"{video_id}.mp4"
    dest_path: Path = settings.media_root_path / filename

    writer.create_video(
        video_id,
        investigation_id,
        payload.label,
        filename,
        initial_status="downloading",
        source_url=payload.source_url,
        media_type=payload.media_type,
    )

    tl_index_id = None
    if payload.media_type == "video":
        tl_index_id = get_or_create_index(
            investigation_id, investigation.get("tl_index_id"), settings.twelvelabs_index_name_prefix
        )
    background_tasks.add_task(
        run_ingestion_from_url,
        video_id,
        investigation_id,
        tl_index_id,
        payload.source_url,
        payload.referer,
        dest_path,
        payload.media_type,
    )

    return {"video_id": video_id, "status": "downloading"}


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
