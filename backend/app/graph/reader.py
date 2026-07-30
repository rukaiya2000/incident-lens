import re

from app.graph.neo4j_client import get_driver

_WRITE_KEYWORDS = re.compile(r"\b(CREATE|MERGE|DELETE|SET|REMOVE|DROP|DETACH)\b", re.IGNORECASE)


def list_investigations() -> list[dict]:
    with get_driver().session() as session:
        result = session.run(
            "MATCH (i:Investigation) RETURN i.id AS id, i.name AS name, "
            "i.description AS description, i.tl_index_id AS tl_index_id"
        )
        return [dict(record) for record in result]


def get_investigation(investigation_id: str) -> dict | None:
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (i:Investigation {id: $id})
            OPTIONAL MATCH (i)-[:HAS_VIDEO]->(v:Video)
            RETURN i.id AS id, i.name AS name, i.description AS description,
                   i.tl_index_id AS tl_index_id,
                   collect(v {.id, .label, .filename, .status, .tl_video_id, .error}) AS videos
            """,
            id=investigation_id,
        )
        record = result.single()
        if record is None:
            return None
        data = dict(record)
        data["videos"] = [v for v in data["videos"] if v.get("id") is not None]
        return data


def get_video(video_id: str) -> dict | None:
    with get_driver().session() as session:
        result = session.run(
            "MATCH (v:Video {id: $id}) RETURN v {.*} AS video",
            id=video_id,
        )
        record = result.single()
        return dict(record["video"]) if record else None


def run_read_query(cypher: str, investigation_id: str, video_ids: list[str]) -> list[dict]:
    """Executes agent-authored Cypher, scoped to an investigation. Read-only: rejects
    any statement containing a write keyword before it ever reaches the driver."""
    if _WRITE_KEYWORDS.search(cypher):
        raise ValueError("Only read-only Cypher queries are allowed.")

    with get_driver().session() as session:
        result = session.run(
            cypher,
            investigation_id=investigation_id,
            video_ids=video_ids,
        )
        return [dict(record) for record in result]
