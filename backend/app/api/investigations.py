import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.graph import reader, writer
from app.ingestion.pipeline import rebuild_claim_intelligence
from app.models.schemas import ClaimRecord, GraphData, Investigation, InvestigationCreate

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


@router.get("/{investigation_id}/graph", response_model=GraphData)
def get_investigation_graph(investigation_id: str) -> GraphData:
    if reader.get_investigation(investigation_id) is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return GraphData(**reader.get_graph_data(investigation_id))


@router.get("/{investigation_id}/claims", response_model=list[ClaimRecord])
def get_claims(investigation_id: str) -> list[dict]:
    if reader.get_investigation(investigation_id) is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return reader.list_claims(investigation_id)


@router.post("/{investigation_id}/claims/rebuild")
def rebuild_claims(investigation_id: str, background_tasks: BackgroundTasks) -> dict:
    if reader.get_investigation(investigation_id) is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    background_tasks.add_task(rebuild_claim_intelligence, investigation_id)
    return {"started": True}