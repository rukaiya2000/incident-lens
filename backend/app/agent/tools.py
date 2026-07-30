from strands import tool

from app.graph import reader
from app.services import twelvelabs_client


def build_tools(
    investigation_id: str,
    tl_index_id: str,
    video_ids: list[str],
    tl_video_id_by_video_id: dict[str, str],
    video_id_by_tl_video_id: dict[str, str],
    evidence_collector: list[dict],
) -> list:
    """Builds request-scoped tool instances closed over the selected investigation/videos,
    so every tool call is automatically constrained to the user's video selection and every
    result is captured for the Evidence[] response independent of the agent's prose."""

    @tool
    def graph_query(cypher: str) -> list[dict]:
        """Run a read-only Cypher query against the incident graph, scoped to the current
        investigation and selected videos. $investigation_id and $video_ids are pre-bound."""
        rows = reader.run_read_query(cypher, investigation_id, video_ids)
        for row in rows:
            if "start_sec" in row and "end_sec" in row:
                evidence_collector.append(
                    {
                        "video_id": row.get("video_id") or (video_ids[0] if len(video_ids) == 1 else None),
                        "start_sec": row["start_sec"],
                        "end_sec": row["end_sec"],
                        "snippet": row.get("description"),
                    }
                )
        return rows

    @tool
    def video_search(query: str) -> list[dict]:
        """Search the raw audio/visual content of the selected videos for a natural-language
        description of a moment. Returns timestamped clip candidates."""
        tl_ids = list(tl_video_id_by_video_id.values())
        results = twelvelabs_client.search(tl_index_id, query, video_ids=tl_ids)
        enriched = []
        for r in results:
            internal_video_id = video_id_by_tl_video_id.get(r["video_id"])
            entry = {
                "video_id": internal_video_id,
                "start_sec": r["start"],
                "end_sec": r["end"],
                "score": r["score"],
            }
            enriched.append(entry)
            evidence_collector.append(
                {
                    "video_id": internal_video_id,
                    "start_sec": r["start"],
                    "end_sec": r["end"],
                    "snippet": None,
                }
            )
        return enriched

    return [graph_query, video_search]
