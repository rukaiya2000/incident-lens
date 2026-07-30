from strands import tool

from app.graph import reader
from app.services import twelvelabs_client


def build_tools(
    investigation_ids: list[str],
    tl_index_ids: list[str],
    video_ids: list[str],
    document_ids: list[str],
    tl_video_id_by_video_id: dict[str, str],
    video_id_by_tl_video_id: dict[str, str],
    evidence_collector: list[dict],
) -> list:
    """Builds request-scoped tool instances closed over the selected investigation(s)/videos,
    so every tool call is automatically constrained to the user's selection and every result
    is captured for the Evidence[] response independent of the agent's prose. Supports more
    than one investigation at once for cross-case comparison questions."""

    @tool
    def graph_query(cypher: str) -> list[dict]:
        """Run a read-only Cypher query against the incident graph, scoped to the selected
        investigation(s), videos, and documents. $investigation_ids, $video_ids, and
        $document_ids are pre-bound."""
        rows = reader.run_read_query(cypher, investigation_ids, video_ids, document_ids)
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
        enriched = []
        # Each investigation has its own TwelveLabs index, so a cross-case search has to
        # query each index separately and merge the results.
        for index_id in tl_index_ids:
            results = twelvelabs_client.search(index_id, query, video_ids=tl_ids)
            for r in results:
                internal_video_id = video_id_by_tl_video_id.get(r["video_id"])
                if internal_video_id is None:
                    continue
                entry = {
                    "video_id": internal_video_id,
                    "start_sec": r["start"],
                    "end_sec": r["end"],
                    "score": r["score"],
                    "snippet": r["snippet"],
                }
                enriched.append(entry)
                evidence_collector.append(
                    {
                        "video_id": internal_video_id,
                        "start_sec": r["start"],
                        "end_sec": r["end"],
                        "snippet": r["snippet"],
                    }
                )
        return enriched

    return [graph_query, video_search]
