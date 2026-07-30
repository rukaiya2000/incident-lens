import uuid

from fastapi import APIRouter, HTTPException

from app.graph import reader, writer
from app.models.schemas import Investigation, InvestigationCreate

router = APIRouter(prefix="/investigations")


@router.post("", response_model=Investigation)
def create_investigation(payload: InvestigationCreate) -> Investigation:
    investigation_id = str(uuid.uuid4())
    writer.create_investigation(investigation_id, payload.name, payload.description)
    return Investigation(id=investigation_id, name=payload.name, description=payload.description)


@router.get("")
def list_investigations() -> list[dict]:
    return reader.list_investigations()


@router.get("/{investigation_id}")
def get_investigation(investigation_id: str) -> dict:
    investigation = reader.get_investigation(investigation_id)
    if investigation is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return investigation
