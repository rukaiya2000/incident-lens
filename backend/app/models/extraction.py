from pydantic import BaseModel


class ExtractedEvent(BaseModel):
    description: str
    start_sec: float
    end_sec: float
    scene_number: int | None = None
    people: list[str] = []
    objects: list[str] = []


class VideoExtraction(BaseModel):
    events: list[ExtractedEvent]
