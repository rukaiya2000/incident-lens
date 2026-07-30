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
            OPTIONAL MATCH (i)-[:HAS_DOCUMENT]->(d:Document)
            RETURN i.id AS id, i.name AS name, i.description AS description,
                   i.tl_index_id AS tl_index_id,
                   collect(DISTINCT v {.id, .label, .filename, .status, .tl_video_id, .error, .source_url, .media_type}) AS videos,
                   collect(DISTINCT d {.id, .label, .filename, .status, .error, .source_url}) AS documents
            """,
            id=investigation_id,
        )
        record = result.single()
        if record is None:
            return None
        data = dict(record)
        data["videos"] = [v for v in data["videos"] if v.get("id") is not None]
        data["documents"] = [d for d in data["documents"] if d.get("id") is not None]
        return data


def find_video_by_source_url(investigation_id: str, source_url: str) -> dict | None:
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (i:Investigation {id: $investigation_id})-[:HAS_VIDEO]->(v:Video {source_url: $source_url})
            RETURN v {.id, .label, .status} AS video
            """,
            investigation_id=investigation_id,
            source_url=source_url,
        )
        record = result.single()
        return dict(record["video"]) if record else None


def find_document_by_source_url(investigation_id: str, source_url: str) -> dict | None:
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (i:Investigation {id: $investigation_id})-[:HAS_DOCUMENT]->(d:Document {source_url: $source_url})
            RETURN d {.id, .label, .status} AS document
            """,
            investigation_id=investigation_id,
            source_url=source_url,
        )
        record = result.single()
        return dict(record["document"]) if record else None


def get_document(document_id: str) -> dict | None:
    with get_driver().session() as session:
        result = session.run(
            "MATCH (d:Document {id: $id}) RETURN d {.*} AS document",
            id=document_id,
        )
        record = result.single()
        return dict(record["document"]) if record else None


def get_video(video_id: str) -> dict | None:
    with get_driver().session() as session:
        result = session.run(
            "MATCH (v:Video {id: $id}) RETURN v {.*} AS video",
            id=video_id,
        )
        record = result.single()
        return dict(record["video"]) if record else None


def run_read_query(cypher: str, investigation_ids: list[str], video_ids: list[str]) -> list[dict]:
    """Executes agent-authored Cypher, scoped to one or more investigations. Read-only:
    rejects any statement containing a write keyword before it ever reaches the driver."""
    if _WRITE_KEYWORDS.search(cypher):
        raise ValueError("Only read-only Cypher queries are allowed.")

    print(f"[graph_query] cypher={cypher!r}")
    with get_driver().session() as session:
        result = session.run(
            cypher,
            investigation_ids=investigation_ids,
            video_ids=video_ids,
        )
        rows = [dict(record) for record in result]
        print(f"[graph_query] rows={rows[:5]!r}")
        return rows
