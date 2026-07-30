from strands import Agent
from strands.models.openai import OpenAIModel

from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools import build_tools
from app.config import get_settings
from app.graph import reader
from app.models.schemas import AskResponse, Evidence


def _dedup_and_sort(
    evidence_collector: list[dict],
    video_labels: dict[str, str],
    video_investigation_name: dict[str, str],
) -> list[Evidence]:
    seen = set()
    evidence = []
    for item in evidence_collector:
        video_id = item.get("video_id")
        if video_id is None:
            continue
        key = (video_id, round(item["start_sec"], 1), round(item["end_sec"], 1))
        if key in seen:
            continue
        seen.add(key)
        evidence.append(
            Evidence(
                video_id=video_id,
                video_label=video_labels.get(video_id, video_id),
                start_sec=item["start_sec"],
                end_sec=item["end_sec"],
                snippet=item.get("snippet"),
                investigation_name=video_investigation_name.get(video_id),
            )
        )
    evidence.sort(key=lambda e: (e.video_id, e.start_sec))
    return evidence


def ask(investigation_ids: list[str], question: str, video_ids: list[str] | None = None) -> AskResponse:
    """Answers a question scoped to one or more investigations. Pass explicit video_ids to
    scope to a hand-picked selection within a single case (the normal in-case Ask flow); omit
    it to auto-scope to every ready video across all of investigation_ids (cross-case compare)."""
    investigations = [inv for inv in (reader.get_investigation(iid) for iid in investigation_ids) if inv is not None]
    if not investigations:
        raise ValueError("No matching investigations found")

    videos_by_id: dict[str, dict] = {}
    video_investigation_name: dict[str, str] = {}
    for inv in investigations:
        for v in inv["videos"]:
            videos_by_id[v["id"]] = v
            video_investigation_name[v["id"]] = inv["name"]

    if video_ids is None:
        video_ids = [vid for vid, v in videos_by_id.items() if v["status"] == "ready"]
    videos_by_id = {vid: v for vid, v in videos_by_id.items() if vid in video_ids}

    video_labels = {vid: v["label"] for vid, v in videos_by_id.items()}
    tl_video_id_by_video_id = {
        vid: v["tl_video_id"] for vid, v in videos_by_id.items() if v.get("tl_video_id")
    }
    video_id_by_tl_video_id = {tl_id: vid for vid, tl_id in tl_video_id_by_video_id.items()}
    tl_index_ids = list({inv["tl_index_id"] for inv in investigations if inv.get("tl_index_id")})

    evidence_collector: list[dict] = []
    tools = build_tools(
        investigation_ids=investigation_ids,
        tl_index_ids=tl_index_ids,
        video_ids=video_ids,
        tl_video_id_by_video_id=tl_video_id_by_video_id,
        video_id_by_tl_video_id=video_id_by_tl_video_id,
        evidence_collector=evidence_collector,
    )

    settings = get_settings()
    model = OpenAIModel(client_args={"api_key": settings.openai_api_key}, model_id=settings.openai_model)
    agent = Agent(model=model, tools=tools, system_prompt=SYSTEM_PROMPT)

    result = agent(question)
    answer_text = str(result)

    evidence = _dedup_and_sort(evidence_collector, video_labels, video_investigation_name)
    return AskResponse(answer=answer_text, evidence=evidence)
