from fastapi import APIRouter

from app.graph.neo4j_client import get_driver
from app.models.schemas import HealthResponse
from app.services import openai_client, twelvelabs_client

router = APIRouter()


def _neo4j_ping() -> bool:
    try:
        get_driver().verify_connectivity()
        return True
    except Exception:
        return False


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        neo4j=_neo4j_ping(),
        openai=openai_client.ping(),
        twelvelabs=twelvelabs_client.ping(),
    )
