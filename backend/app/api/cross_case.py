from fastapi import APIRouter, HTTPException

from app.agent.orchestrator import ask as run_ask
from app.models.schemas import AskResponse, CrossCaseAskRequest

router = APIRouter(prefix="/cross-case")


@router.post("/ask", response_model=AskResponse)
def cross_case_ask(payload: CrossCaseAskRequest) -> AskResponse:
    if len(payload.investigation_ids) < 2:
        raise HTTPException(status_code=400, detail="Select at least 2 investigations to compare.")
    try:
        return run_ask(payload.investigation_ids, payload.question)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
