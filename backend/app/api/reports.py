from fastapi import APIRouter

from app.graph.neo4j_client import get_driver

router = APIRouter(prefix="/reports")


@router.get("")
def list_reports() -> list[dict]:
    """Return a concise, dashboard-friendly view of analyzed video reports."""
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (i:Investigation)-[:HAS_VIDEO]->(v:Video)
            OPTIONAL MATCH (e:Event {video_id: v.id})
            WITH i, v, count(DISTINCT e) AS event_count,
                 collect(DISTINCT e.description)[0..3] AS highlights
            RETURN i.id AS investigation_id, i.name AS investigation_name,
                   v.id AS video_id, v.label AS video_label, v.status AS status,
                   v.error AS error, event_count, highlights
            ORDER BY investigation_name ASC, video_label ASC
            """
        )
        return [dict(record) for record in result]