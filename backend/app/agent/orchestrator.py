from strands import Agent
from strands.models.openai import OpenAIModel

from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools import build_tools
from app.config import get_settings
from app.graph import reader
from app.models.schemas import AskResponse, Evidence


def _dedup_and_sort(evidence_collector: list[dict], video_labels: dict[str, str]) -> list[Evidence]:
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
            )
        )
    evidence.sort(key=lambda e: (e.video_id, e.start_sec))
    return evidence


def ask(investigation_id: str, question: str, video_ids: list[str]) -> AskResponse:
    investigation = reader.get_investigation(investigation_id)
    if investigation is None:
        raise ValueError("Investigation not found")

    videos_by_id = {v["id"]: v for v in investigation["videos"] if v["id"] in video_ids}
    video_labels = {vid: v["label"] for vid, v in videos_by_id.items()}
    tl_video_id_by_video_id = {
        vid: v["tl_video_id"] for vid, v in videos_by_id.items() if v.get("tl_video_id")
    }
    video_id_by_tl_video_id = {tl_id: vid for vid, tl_id in tl_video_id_by_video_id.items()}

    evidence_collector: list[dict] = []
    tools = build_tools(
        investigation_id=investigation_id,
        tl_index_id=investigation.get("tl_index_id"),
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

    evidence = _dedup_and_sort(evidence_collector, video_labels)
    return AskResponse(answer=answer_text, evidence=evidence)
