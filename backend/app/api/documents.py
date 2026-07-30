import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.config import get_settings
from app.graph import reader, writer
from app.ingestion.pipeline import run_document_ingestion
from app.models.schemas import AddDocumentFromUrlRequest, DocumentStatusResponse

router = APIRouter(prefix="/investigations/{investigation_id}/documents")


@router.post("/from-url")
def add_document_from_url(
    investigation_id: str,
    background_tasks: BackgroundTasks,
    payload: AddDocumentFromUrlRequest,
) -> dict:
    investigation = reader.get_investigation(investigation_id)
    if investigation is None:
        raise HTTPException(status_code=404, detail="Investigation not found")

    existing = reader.find_document_by_source_url(investigation_id, payload.source_url)
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail=f"This document was already added as '{existing['label']}' ({existing['status']}).",
        )

    settings = get_settings()
    document_id = str(uuid.uuid4())
    filename = f"{document_id}.pdf"
    dest_path: Path = settings.media_root_path / filename

    writer.create_document(document_id, investigation_id, payload.label, filename, payload.source_url)

    background_tasks.add_task(run_document_ingestion, document_id, investigation_id, payload.source_url, dest_path)

    return {"document_id": document_id, "status": "downloading"}


@router.get("")
def list_documents(investigation_id: str) -> list[dict]:
    investigation = reader.get_investigation(investigation_id)
    if investigation is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return investigation["documents"]


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
def get_document_status(investigation_id: str, document_id: str) -> DocumentStatusResponse:
    document = reader.get_document(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentStatusResponse(
        document_id=document_id,
        status=document["status"],
        error=document.get("error"),
    )
