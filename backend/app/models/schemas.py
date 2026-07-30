from typing import Literal

from pydantic import BaseModel

VideoStatus = Literal[
    "downloading", "uploaded", "indexing", "indexed", "extracting", "partial", "ready", "failed"
]


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
    media_type: Literal["video", "audio"] = "video"
    source_url: str | None = None


class VideoStatusResponse(BaseModel):
    video_id: str
    status: VideoStatus
    steps: dict[str, bool]
    error: str | None = None


DocumentStatus = Literal["downloading", "extracting", "partial", "ready", "failed"]


class Document(BaseModel):
    id: str
    investigation_id: str
    label: str
    filename: str
    status: DocumentStatus
    source_url: str | None = None
    error: str | None = None


class DocumentStatusResponse(BaseModel):
    document_id: str
    status: DocumentStatus
    error: str | None = None


class AskRequest(BaseModel):
    question: str
    video_ids: list[str]


class CrossCaseAskRequest(BaseModel):
    question: str
    investigation_ids: list[str]


class Evidence(BaseModel):
    video_id: str
    video_label: str
    start_sec: float
    end_sec: float
    snippet: str | None = None
    investigation_name: str | None = None


class AskResponse(BaseModel):
    answer: str
    evidence: list[Evidence]


class HealthResponse(BaseModel):
    neo4j: bool
    openai: bool
    twelvelabs: bool


class CaseSourceRequest(BaseModel):
    url: str


class CaseItemPreview(BaseModel):
    kind: Literal["video", "audio", "document"]
    label: str
    source_url: str
    duration_sec: float | None = None
    thumbnail_url: str | None = None


class CaseSourceResponse(BaseModel):
    referer: str
    items: list[CaseItemPreview]


class AddVideoFromUrlRequest(BaseModel):
    source_url: str
    label: str
    referer: str | None = None
    media_type: Literal["video", "audio"] = "video"


class AddDocumentFromUrlRequest(BaseModel):
    source_url: str
    label: str


class GraphNode(BaseModel):
    id: str
    type: Literal["Investigation", "Video", "Scene", "Event", "Person", "Officer", "Object", "Document"]
    label: str


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str


class GraphData(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
