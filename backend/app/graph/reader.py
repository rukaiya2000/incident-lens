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


def get_graph_data(investigation_id: str) -> dict:
    """Assembles a renderable node/edge graph for one investigation: Investigation is the
    root, fanning out to Video/Document, then Video -> Scene -> Event -> Person/Object.
    Events without a Scene parent (e.g. audio-derived events, which skip scene detection)
    connect directly to their Video so nothing is orphaned in the visualization."""
    with get_driver().session() as session:
        videos = [
            dict(r)
            for r in session.run(
                "MATCH (i:Investigation {id: $id})-[:HAS_VIDEO]->(v:Video) "
                "RETURN v.id AS id, v.label AS label, v.media_type AS media_type",
                id=investigation_id,
            )
        ]
        video_ids = [v["id"] for v in videos]

        documents = [
            dict(r)
            for r in session.run(
                "MATCH (i:Investigation {id: $id})-[:HAS_DOCUMENT]->(d:Document) "
                "RETURN d.id AS id, d.label AS label",
                id=investigation_id,
            )
        ]

        scenes = [
            dict(r)
            for r in session.run(
                "MATCH (s:Scene) WHERE s.video_id IN $video_ids "
                "RETURN s.id AS id, s.video_id AS video_id, s.chapter_number AS chapter_number",
                video_ids=video_ids,
            )
        ]
        scene_ids = {s["id"] for s in scenes}

        events = [
            dict(r)
            for r in session.run(
                "MATCH (e:Event) WHERE e.video_id IN $video_ids "
                "RETURN e.id AS id, e.video_id AS video_id, e.description AS description, "
                "e.start_sec AS start_sec, e.end_sec AS end_sec",
                video_ids=video_ids,
            )
        ]

        scene_contains_event = [
            dict(r)
            for r in session.run(
                "MATCH (s:Scene)-[:CONTAINS]->(e:Event) WHERE s.video_id IN $video_ids "
                "RETURN s.id AS scene_id, e.id AS event_id",
                video_ids=video_ids,
            )
        ]
        events_with_scene = {row["event_id"] for row in scene_contains_event}

        involves = [
            dict(r)
            for r in session.run(
                "MATCH (e:Event)-[:INVOLVES]->(n) WHERE e.video_id IN $video_ids "
                "RETURN e.id AS event_id, n.id AS node_id, labels(n) AS node_labels, n.name AS name",
                video_ids=video_ids,
            )
        ]

    nodes: dict[str, dict] = {
        investigation_id: {"id": investigation_id, "type": "Investigation", "label": "Case"}
    }
    edges: list[dict] = []

    for v in videos:
        nodes[v["id"]] = {"id": v["id"], "type": "Video", "label": v["label"]}
        edges.append({"source": investigation_id, "target": v["id"], "type": "HAS_VIDEO"})

    for d in documents:
        nodes[d["id"]] = {"id": d["id"], "type": "Document", "label": d["label"]}
        edges.append({"source": investigation_id, "target": d["id"], "type": "HAS_DOCUMENT"})

    for s in scenes:
        nodes[s["id"]] = {"id": s["id"], "type": "Scene", "label": f"Scene {s['chapter_number']}"}
        edges.append({"source": s["video_id"], "target": s["id"], "type": "CONTAINS"})

    for e in events:
        label = (e["description"] or "")[:60]
        nodes[e["id"]] = {"id": e["id"], "type": "Event", "label": label}
        if e["id"] in events_with_scene:
            continue  # edge added below from scene_contains_event
        edges.append({"source": e["video_id"], "target": e["id"], "type": "CONTAINS"})

    for row in scene_contains_event:
        if row["scene_id"] in scene_ids:
            edges.append({"source": row["scene_id"], "target": row["event_id"], "type": "CONTAINS"})

    for row in involves:
        node_labels = row["node_labels"] or []
        node_type = "Officer" if "Officer" in node_labels else ("Person" if "Person" in node_labels else "Object")
        if row["node_id"] not in nodes:
            nodes[row["node_id"]] = {"id": row["node_id"], "type": node_type, "label": row["name"]}
        edges.append({"source": row["event_id"], "target": row["node_id"], "type": "INVOLVES"})

    return {"nodes": list(nodes.values()), "edges": edges}


def run_read_query(
    cypher: str, investigation_ids: list[str], video_ids: list[str], document_ids: list[str]
) -> list[dict]:
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
            document_ids=document_ids,
        )
        rows = [dict(record) for record in result]
        print(f"[graph_query] rows={rows[:5]!r}")
        return rows


def get_claim_assessment_context(investigation_id: str) -> tuple[list[dict], list[dict]]:
    """Return the limited, case-scoped facts used by the claim assessor."""
    with get_driver().session() as session:
        claims = [dict(record) for record in session.run(
            """
            MATCH (c:Claim {investigation_id: $investigation_id})
            RETURN c.id AS id, c.text AS text, c.speaker AS speaker,
                   c.claim_type AS claim_type, c.start_sec AS start_sec, c.end_sec AS end_sec
            ORDER BY c.start_sec
            """, investigation_id=investigation_id
        )]
        events = [dict(record) for record in session.run(
            """
            MATCH (i:Investigation {id: $investigation_id})-[:HAS_VIDEO]->(:Video)<-[:FROM_VIDEO]-(vs:VideoSegment)<-[:SUPPORTED_BY]-(e:Event)
            RETURN DISTINCT e.id AS id, e.description AS description, e.video_id AS video_id,
                            e.start_sec AS start_sec, e.end_sec AS end_sec
            ORDER BY e.start_sec
            """, investigation_id=investigation_id
        )]
    return claims, events


def list_claims(investigation_id: str) -> list[dict]:
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (i:Investigation {id: $investigation_id})-[:HAS_VIDEO]->(v:Video)
            MATCH (c:Claim {investigation_id: $investigation_id, video_id: v.id})
            OPTIONAL MATCH (e:Event)-[relation:SUPPORTS|CONTRADICTS]->(c)
            OPTIONAL MATCH (support_video:Video {id: e.video_id})
            RETURN c.id AS id, c.text AS text, c.speaker AS speaker, c.claim_type AS claim_type,
                   c.status AS status, c.assessment_summary AS assessment_summary,
                   c.start_sec AS start_sec, c.end_sec AS end_sec,
                   v.id AS video_id, v.label AS video_label,
                   collect({event_id: e.id, description: e.description, video_id: e.video_id,
                            video_label: support_video.label, start_sec: e.start_sec,
                            end_sec: e.end_sec, relationship: type(relation)}) AS evidence
            ORDER BY c.start_sec
            """, investigation_id=investigation_id
        )
        claims = []
        for record in result:
            data = dict(record)
            data["evidence"] = [item for item in data["evidence"] if item["event_id"] is not None]
            claims.append(data)
        return claims

def list_ready_videos_for_claim_rebuild(investigation_id: str) -> list[dict]:
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (:Investigation {id: $investigation_id})-[:HAS_VIDEO]->(v:Video)
            WHERE v.status = 'ready' AND v.tl_video_id IS NOT NULL
            RETURN v.id AS id, v.tl_video_id AS tl_video_id
            """, investigation_id=investigation_id
        )
        return [dict(record) for record in result]