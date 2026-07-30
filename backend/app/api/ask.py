from fastapi import APIRouter, HTTPException

from app.agent.orchestrator import ask as run_ask
from app.models.schemas import AskRequest, AskResponse

router = APIRouter(prefix="/investigations/{investigation_id}")


@router.post("/ask", response_model=AskResponse)
def ask(investigation_id: str, payload: AskRequest) -> AskResponse:
    try:
        return run_ask(investigation_id, payload.question, payload.video_ids)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
