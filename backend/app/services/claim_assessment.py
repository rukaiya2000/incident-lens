import json

from app.graph import reader, writer
from app.services import openai_client

ASSESSMENT_SYSTEM_PROMPT = """You are a cautious evidence analyst. Assess each claim only against the supplied
case events, which are extracted observations from video. Do not use outside knowledge. A claim is:
- corroborated: one or more events directly support its material assertion and none materially conflict.
- contradicted: one or more events materially conflict and none directly support it.
- mixed: there is material support and material contradiction.
- unverified: the supplied events do not establish it.

Return strict JSON: {"assessments": [{"claim_id": "...", "status": "corroborated|contradicted|mixed|unverified", "summary": "brief evidence-grounded explanation", "supporting_event_ids": ["..."], "contradicting_event_ids": ["..."]}]}
Only use claim IDs and event IDs given in the input. Never treat the claim itself as proof. Keep summaries factual and cautious."""

VALID_STATUSES = {"corroborated", "contradicted", "mixed", "unverified"}


def reassess_investigation(investigation_id: str) -> None:
    claims, events = reader.get_claim_assessment_context(investigation_id)
    if not claims:
        return

    response = openai_client.get_openai_client().chat.completions.create(
        model=openai_client.get_settings_model(),
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": ASSESSMENT_SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps({"claims": claims, "events": events})},
        ],
    )
    data = json.loads(response.choices[0].message.content)
    by_claim_id = {claim["id"]: claim for claim in claims}
    valid_event_ids = {event["id"] for event in events}
    supplied = {item.get("claim_id"): item for item in data.get("assessments", []) if item.get("claim_id") in by_claim_id}
    assessments = []
    for claim_id in by_claim_id:
        item = supplied.get(claim_id, {})
        status = item.get("status") if item.get("status") in VALID_STATUSES else "unverified"
        assessments.append(
            {
                "claim_id": claim_id,
                "status": status,
                "summary": str(item.get("summary") or "The available extracted footage does not establish this claim."),
                "supporting_event_ids": [event_id for event_id in item.get("supporting_event_ids", []) if event_id in valid_event_ids],
                "contradicting_event_ids": [event_id for event_id in item.get("contradicting_event_ids", []) if event_id in valid_event_ids],
            }
        )
    writer.replace_claim_assessments(investigation_id, assessments)