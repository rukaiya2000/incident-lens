from pydantic import BaseModel, Field


class ExtractedEvent(BaseModel):
    description: str
    start_sec: float
    end_sec: float
    scene_number: int | None = None
    people: list[str] = Field(default_factory=list)
    objects: list[str] = Field(default_factory=list)


class ExtractedClaim(BaseModel):
    text: str
    speaker: str | None = None
    start_sec: float
    end_sec: float
    scene_number: int | None = None
    claim_type: str = "statement"


class VideoExtraction(BaseModel):
    events: list[ExtractedEvent] = Field(default_factory=list)
    claims: list[ExtractedClaim] = Field(default_factory=list)