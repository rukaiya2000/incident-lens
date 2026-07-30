from app.graph.neo4j_client import get_driver
from app.models.extraction import VideoExtraction


def create_investigation(investigation_id: str, name: str, description: str) -> None:
    with get_driver().session() as session:
        session.run(
            """
            CREATE (i:Investigation {id: $id, name: $name, description: $description, tl_index_id: null})
            """,
            id=investigation_id,
            name=name,
            description=description,
        )


def set_investigation_index_id(investigation_id: str, tl_index_id: str) -> None:
    with get_driver().session() as session:
        session.run(
            "MATCH (i:Investigation {id: $id}) SET i.tl_index_id = $tl_index_id",
            id=investigation_id,
            tl_index_id=tl_index_id,
        )


def create_video(
    video_id: str,
    investigation_id: str,
    label: str,
    filename: str,
    initial_status: str = "uploaded",
    source_url: str | None = None,
    media_type: str = "video",
) -> None:
    with get_driver().session() as session:
        session.run(
            """
            MATCH (i:Investigation {id: $investigation_id})
            CREATE (v:Video {
                id: $video_id, investigation_id: $investigation_id,
                label: $label, filename: $filename, status: $initial_status, tl_video_id: null,
                source_url: $source_url, media_type: $media_type
            })
            CREATE (i)-[:HAS_VIDEO]->(v)
            """,
            video_id=video_id,
            investigation_id=investigation_id,
            label=label,
            filename=filename,
            initial_status=initial_status,
            source_url=source_url,
            media_type=media_type,
        )


def create_document(
    document_id: str,
    investigation_id: str,
    label: str,
    filename: str,
    source_url: str | None = None,
    initial_status: str = "downloading",
) -> None:
    with get_driver().session() as session:
        session.run(
            """
            MATCH (i:Investigation {id: $investigation_id})
            CREATE (d:Document {
                id: $document_id, investigation_id: $investigation_id,
                label: $label, filename: $filename, status: $initial_status,
                source_url: $source_url, text: null
            })
            CREATE (i)-[:HAS_DOCUMENT]->(d)
            """,
            document_id=document_id,
            investigation_id=investigation_id,
            label=label,
            filename=filename,
            initial_status=initial_status,
            source_url=source_url,
        )


def set_document_status(document_id: str, status: str, error: str | None = None) -> None:
    with get_driver().session() as session:
        session.run(
            "MATCH (d:Document {id: $id}) SET d.status = $status, d.error = $error",
            id=document_id,
            status=status,
            error=error,
        )


def write_document_text(document_id: str, text: str) -> None:
    with get_driver().session() as session:
        session.run(
            "MATCH (d:Document {id: $id}) SET d.text = $text",
            id=document_id,
            text=text,
        )


def set_video_status(video_id: str, status: str, error: str | None = None) -> None:
    with get_driver().session() as session:
        session.run(
            "MATCH (v:Video {id: $id}) SET v.status = $status, v.error = $error",
            id=video_id,
            status=status,
            error=error,
        )


def set_video_tl_id(video_id: str, tl_video_id: str) -> None:
    with get_driver().session() as session:
        session.run(
            "MATCH (v:Video {id: $id}) SET v.tl_video_id = $tl_video_id",
            id=video_id,
            tl_video_id=tl_video_id,
        )


def write_scenes(video_id: str, chapters: list[dict]) -> None:
    with get_driver().session() as session:
        session.run(
            """
            MATCH (v:Video {id: $video_id})
            UNWIND $chapters AS chapter
            CREATE (s:Scene {
                id: $video_id + '-scene-' + toString(chapter.chapter_number),
                video_id: $video_id,
                chapter_number: chapter.chapter_number,
                start_sec: chapter.start,
                end_sec: chapter.end,
                summary: chapter.summary
            })
            CREATE (v)-[:CONTAINS]->(s)
            WITH collect(s) AS scenes
            UNWIND range(0, size(scenes) - 2) AS i
            WITH scenes[i] AS a, scenes[i + 1] AS b
            CREATE (a)-[:PRECEDES]->(b)
            """,
            video_id=video_id,
            chapters=chapters,
        )


def write_extraction(video_id: str, investigation_id: str, extraction: VideoExtraction) -> None:
    driver = get_driver()
    with driver.session() as session:
        for i, event in enumerate(extraction.events):
            event_id = f"{video_id}-event-{i}"
            segment_id = f"{video_id}-segment-{i}"
            scene_id = (
                f"{video_id}-scene-{event.scene_number}" if event.scene_number is not None else None
            )

            session.run(
                """
                MATCH (v:Video {id: $video_id})
                MERGE (vs:VideoSegment {id: $segment_id})
                SET vs.start_sec = $start_sec, vs.end_sec = $end_sec
                MERGE (vs)-[:FROM_VIDEO]->(v)
                CREATE (e:Event {
                    id: $event_id, video_id: $video_id,
                    description: $description, start_sec: $start_sec, end_sec: $end_sec
                })
                CREATE (e)-[:SUPPORTED_BY]->(vs)
                WITH e
                OPTIONAL MATCH (s:Scene {id: $scene_id})
                FOREACH (_ IN CASE WHEN s IS NOT NULL THEN [1] ELSE [] END |
                    MERGE (s)-[:CONTAINS]->(e)
                )
                """,
                video_id=video_id,
                segment_id=segment_id,
                event_id=event_id,
                scene_id=scene_id,
                description=event.description,
                start_sec=event.start_sec,
                end_sec=event.end_sec,
            )

            for person_name in event.people:
                _merge_person(session, investigation_id, event_id, person_name)

            for object_name in event.objects:
                _merge_object(session, investigation_id, event_id, object_name)


def _merge_person(session, investigation_id: str, event_id: str, name: str) -> None:
    is_officer = "officer" in name.lower()
    label = "Person:Officer" if is_officer else "Person"
    session.run(
        f"""
        MATCH (e:Event {{id: $event_id}})
        MERGE (p:{label} {{investigation_id: $investigation_id, name_key: toLower($name)}})
        ON CREATE SET p.id = randomUUID(), p.name = $name
        MERGE (e)-[:INVOLVES]->(p)
        """,
        event_id=event_id,
        investigation_id=investigation_id,
        name=name,
    )


def _merge_object(session, investigation_id: str, event_id: str, name: str) -> None:
    session.run(
        """
        MATCH (e:Event {id: $event_id})
        MERGE (o:Object {investigation_id: $investigation_id, name_key: toLower($name)})
        ON CREATE SET o.id = randomUUID(), o.name = $name
        MERGE (e)-[:INVOLVES]->(o)
        """,
        event_id=event_id,
        investigation_id=investigation_id,
        name=name,
    )


def write_claims(video_id: str, investigation_id: str, extraction: VideoExtraction) -> None:
    """Persist spoken/communicated assertions as evidence-bound Claim nodes."""
    with get_driver().session() as session:
        for index, claim in enumerate(extraction.claims):
            claim_id = f"{video_id}-claim-{index}"
            segment_id = f"{video_id}-claim-segment-{index}"
            session.run(
                """
                MATCH (v:Video {id: $video_id})
                MERGE (c:Claim {id: $claim_id})
                SET c.investigation_id = $investigation_id,
                    c.video_id = $video_id,
                    c.text = $text,
                    c.speaker = $speaker,
                    c.claim_type = $claim_type,
                    c.start_sec = $start_sec,
                    c.end_sec = $end_sec,
                    c.scene_number = $scene_number,
                    c.status = 'unverified',
                    c.assessment_summary = 'No cross-video assessment has been completed yet.'
                MERGE (vs:VideoSegment {id: $segment_id})
                SET vs.video_id = $video_id, vs.start_sec = $start_sec, vs.end_sec = $end_sec
                MERGE (c)-[:STATED_IN]->(vs)
                MERGE (vs)-[:FROM_VIDEO]->(v)
                """,
                video_id=video_id,
                claim_id=claim_id,
                segment_id=segment_id,
                investigation_id=investigation_id,
                text=claim.text,
                speaker=claim.speaker,
                claim_type=claim.claim_type,
                start_sec=claim.start_sec,
                end_sec=claim.end_sec,
                scene_number=claim.scene_number,
            )
            if claim.speaker:
                session.run(
                    """
                    MATCH (c:Claim {id: $claim_id})
                    MERGE (p:Person {investigation_id: $investigation_id, name_key: toLower($speaker)})
                    ON CREATE SET p.id = randomUUID(), p.name = $speaker
                    MERGE (c)-[:MADE_BY]->(p)
                    """,
                    claim_id=claim_id,
                    investigation_id=investigation_id,
                    speaker=claim.speaker,
                )


def replace_claim_assessments(investigation_id: str, assessments: list[dict]) -> None:
    """Replace derived support/contradiction links for a case without changing source claims."""
    with get_driver().session() as session:
        session.run(
            """
            MATCH (c:Claim {investigation_id: $investigation_id})
            OPTIONAL MATCH (e:Event)-[r:SUPPORTS|CONTRADICTS]->(c)
            DELETE r
            """,
            investigation_id=investigation_id,
        )
        for assessment in assessments:
            session.run(
                """
                MATCH (c:Claim {id: $claim_id, investigation_id: $investigation_id})
                SET c.status = $status, c.assessment_summary = $summary
                """,
                claim_id=assessment["claim_id"],
                investigation_id=investigation_id,
                status=assessment["status"],
                summary=assessment["summary"],
            )
            for event_id in assessment["supporting_event_ids"]:
                session.run(
                    """
                    MATCH (c:Claim {id: $claim_id, investigation_id: $investigation_id})
                    MATCH (e:Event {id: $event_id})
                    MERGE (e)-[:SUPPORTS]->(c)
                    """,
                    claim_id=assessment["claim_id"], investigation_id=investigation_id, event_id=event_id
                )
            for event_id in assessment["contradicting_event_ids"]:
                session.run(
                    """
                    MATCH (c:Claim {id: $claim_id, investigation_id: $investigation_id})
                    MATCH (e:Event {id: $event_id})
                    MERGE (e)-[:CONTRADICTS]->(c)
                    """,
                    claim_id=assessment["claim_id"], investigation_id=investigation_id, event_id=event_id
                )

def delete_claims_for_video(video_id: str) -> None:
    with get_driver().session() as session:
        session.run(
            """
            MATCH (c:Claim {video_id: $video_id})
            DETACH DELETE c
            """, video_id=video_id
        )