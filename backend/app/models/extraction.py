from typing import Any

from pydantic import BaseModel, Field, model_validator

# The LLM occasionally omits end_sec (e.g. a brief interjection with no clear duration) —
# rather than fail the whole extraction over one missing timestamp, default it to start_sec
# so every event/claim keeps a guaranteed, non-null [start_sec, end_sec] range downstream.
_DEFAULT_DURATION_SEC = 1.0


def _coerce_end_sec(data: Any) -> Any:
    if not isinstance(data, dict):
        return data
    start_sec = data.get("start_sec")
    end_sec = data.get("end_sec")
    if start_sec is None:
        return data
    if end_sec is None or end_sec < start_sec:
        data["end_sec"] = start_sec + _DEFAULT_DURATION_SEC
    return data


class ExtractedEvent(BaseModel):
    description: str
    start_sec: float
    end_sec: float
    scene_number: int | None = None
    people: list[str] = Field(default_factory=list)
    objects: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def _default_end_sec(cls, data: Any) -> Any:
        return _coerce_end_sec(data)


class ExtractedClaim(BaseModel):
    text: str
    speaker: str | None = None
    start_sec: float
    end_sec: float
    scene_number: int | None = None
    claim_type: str = "statement"

    @model_validator(mode="before")
    @classmethod
    def _default_end_sec(cls, data: Any) -> Any:
        return _coerce_end_sec(data)


class VideoExtraction(BaseModel):
    events: list[ExtractedEvent] = Field(default_factory=list)
    claims: list[ExtractedClaim] = Field(default_factory=list)
