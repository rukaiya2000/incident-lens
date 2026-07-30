import re
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from app.config import get_settings
from app.graph import reader
from app.services import clip_exporter

router = APIRouter(prefix="/videos")


def _safe_filename(label: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "_", label).strip("_") or "clip"


@router.get("/{video_id}/clip")
def download_clip(video_id: str, start_sec: float, end_sec: float) -> FileResponse:
    video = reader.get_video(video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    if end_sec <= start_sec:
        raise HTTPException(status_code=400, detail="end_sec must be greater than start_sec")

    settings = get_settings()
    source_path = settings.media_root_path / video["filename"]
    if not source_path.exists():
        raise HTTPException(status_code=404, detail="Source file missing on disk")

    tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    tmp.close()
    dest_path = Path(tmp.name)

    try:
        clip_exporter.trim_clip(source_path, start_sec, end_sec, dest_path)
    except Exception as exc:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to trim clip: {exc}") from exc

    filename = f"{_safe_filename(video['label'])}_{start_sec:.0f}-{end_sec:.0f}s.mp4"
    return FileResponse(
        dest_path,
        media_type="video/mp4",
        filename=filename,
        background=BackgroundTask(dest_path.unlink, missing_ok=True),
    )
