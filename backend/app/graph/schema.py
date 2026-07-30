from app.graph.neo4j_client import get_driver

CONSTRAINTS_AND_INDEXES = [
    "CREATE CONSTRAINT investigation_id IF NOT EXISTS FOR (i:Investigation) REQUIRE i.id IS UNIQUE",
    "CREATE CONSTRAINT video_id IF NOT EXISTS FOR (v:Video) REQUIRE v.id IS UNIQUE",
    "CREATE CONSTRAINT scene_id IF NOT EXISTS FOR (s:Scene) REQUIRE s.id IS UNIQUE",
    "CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE",
    "CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE",
    "CREATE CONSTRAINT object_id IF NOT EXISTS FOR (o:Object) REQUIRE o.id IS UNIQUE",
    "CREATE CONSTRAINT segment_id IF NOT EXISTS FOR (vs:VideoSegment) REQUIRE vs.id IS UNIQUE",
    "CREATE CONSTRAINT document_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE",
    "CREATE CONSTRAINT claim_id IF NOT EXISTS FOR (c:Claim) REQUIRE c.id IS UNIQUE",
    "CREATE INDEX video_investigation_idx IF NOT EXISTS FOR (v:Video) ON (v.investigation_id)",
    "CREATE INDEX document_investigation_idx IF NOT EXISTS FOR (d:Document) ON (d.investigation_id)",
    "CREATE INDEX scene_video_idx IF NOT EXISTS FOR (s:Scene) ON (s.video_id)",
    "CREATE INDEX event_video_idx IF NOT EXISTS FOR (e:Event) ON (e.video_id)",
    "CREATE INDEX segment_video_idx IF NOT EXISTS FOR (vs:VideoSegment) ON (vs.video_id)",
    "CREATE INDEX claim_investigation_idx IF NOT EXISTS FOR (c:Claim) ON (c.investigation_id)",
]


def apply_schema() -> None:
    with get_driver().session() as session:
        for statement in CONSTRAINTS_AND_INDEXES:
            session.run(statement)