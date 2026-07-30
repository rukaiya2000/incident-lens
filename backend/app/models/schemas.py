from typing import Literal

from pydantic import BaseModel

VideoStatus = Literal["uploaded", "indexing", "indexed", "extracting", "partial", "ready", "failed"]


class InvestigationCreate(BaseModel):
    name: str
    description: str = ""


class Investigation(BaseModel):
    id: str
    name: str
    description: str = ""
    tl_index_id: str | None = None


class Video(BaseModel):
    id: str
    investigation_id: str
    label: str
    filename: str
    status: VideoStatus
    tl_video_id: str | None = None


class VideoStatusResponse(BaseModel):
    video_id: str
    status: VideoStatus
    steps: dict[str, bool]
    error: str | None = None


class AskRequest(BaseModel):
    question: str
    video_ids: list[str]


class Evidence(BaseModel):
    video_id: str
    video_label: str
    start_sec: float
    end_sec: float
    snippet: str | None = None


class AskResponse(BaseModel):
    answer: str
    evidence: list[Evidence]


class HealthResponse(BaseModel):
    neo4j: bool
    openai: bool
    twelvelabs: bool
