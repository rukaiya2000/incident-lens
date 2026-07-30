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
    video_id: str, investigation_id: str, label: str, filename: str, initial_status: str = "uploaded"
) -> None:
    with get_driver().session() as session:
        session.run(
            """
            MATCH (i:Investigation {id: $investigation_id})
            CREATE (v:Video {
                id: $video_id, investigation_id: $investigation_id,
                label: $label, filename: $filename, status: $initial_status, tl_video_id: null
            })
            CREATE (i)-[:HAS_VIDEO]->(v)
            """,
            video_id=video_id,
            investigation_id=investigation_id,
            label=label,
            filename=filename,
            initial_status=initial_status,
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
