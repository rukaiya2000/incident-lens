const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type VideoStatus =
  | "downloading"
  | "uploaded"
  | "indexing"
  | "indexed"
  | "extracting"
  | "partial"
  | "ready"
  | "failed";

export interface Video {
  id: string;
  label: string;
  filename: string;
  status: VideoStatus;
  tl_video_id: string | null;
  error?: string | null;
  source_url?: string | null;
  media_type?: "video" | "audio";
}

export type DocumentStatus = "downloading" | "extracting" | "partial" | "ready" | "failed";

export interface CaseDocument {
  id: string;
  label: string;
  filename: string;
  status: DocumentStatus;
  source_url?: string | null;
  error?: string | null;
}

export interface Investigation {
  id: string;
  name: string;
  description: string;
  tl_index_id: string | null;
}

export interface InvestigationDetail extends Investigation {
  videos: Video[];
  documents: CaseDocument[];
}

export interface VideoStatusResponse {
  video_id: string;
  status: VideoStatus;
  steps: Record<string, boolean>;
  error: string | null;
}

export interface Evidence {
  video_id: string;
  video_label: string;
  start_sec: number;
  end_sec: number;
  snippet: string | null;
  investigation_name?: string | null;
}

export interface AskResponse {
  answer: string;
  evidence: Evidence[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export function createInvestigation(name: string, description: string) {
  return request<Investigation>("/investigations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
}

export function listInvestigations() {
  return request<Investigation[]>("/investigations");
}

export function getInvestigation(id: string) {
  return request<InvestigationDetail>(`/investigations/${id}`);
}

export async function addVideo(investigationId: string, file: File, label: string) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${API_BASE_URL}/investigations/${investigationId}/videos?label=${encodeURIComponent(label)}`,
    { method: "POST", body: form }
  );
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  }
  return res.json() as Promise<{ video_id: string; status: VideoStatus }>;
}

export function getVideoStatus(investigationId: string, videoId: string) {
  return request<VideoStatusResponse>(
    `/investigations/${investigationId}/videos/${videoId}/status`
  );
}

export interface CaseItemPreview {
  kind: "video" | "audio" | "document";
  label: string;
  source_url: string;
  duration_sec: number | null;
  thumbnail_url: string | null;
}

export interface CaseSourceResponse {
  referer: string;
  items: CaseItemPreview[];
}

export function previewCaseSource(investigationId: string, url: string) {
  return request<CaseSourceResponse>(`/investigations/${investigationId}/videos/case-source/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

export function addVideoFromUrl(
  investigationId: string,
  sourceUrl: string,
  label: string,
  referer?: string,
  mediaType: "video" | "audio" = "video"
) {
  return request<{ video_id: string; status: VideoStatus }>(
    `/investigations/${investigationId}/videos/from-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_url: sourceUrl, label, referer, media_type: mediaType }),
    }
  );
}

export function addDocumentFromUrl(investigationId: string, sourceUrl: string, label: string) {
  return request<{ document_id: string; status: DocumentStatus }>(
    `/investigations/${investigationId}/documents/from-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_url: sourceUrl, label }),
    }
  );
}

export function ask(investigationId: string, question: string, videoIds: string[]) {
  return request<AskResponse>(`/investigations/${investigationId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, video_ids: videoIds }),
  });
}

export function crossCaseAsk(investigationIds: string[], question: string) {
  return request<AskResponse>(`/cross-case/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, investigation_ids: investigationIds }),
  });
}

export type GraphNodeType =
  | "Investigation"
  | "Video"
  | "Scene"
  | "Event"
  | "Person"
  | "Officer"
  | "Object"
  | "Document";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function getGraphData(investigationId: string) {
  return request<GraphData>(`/investigations/${investigationId}/graph`);
}

export function mediaUrl(filename: string) {
  return `${API_BASE_URL}/media/${filename}`;
}

export function clipDownloadUrl(videoId: string, startSec: number, endSec: number) {
  return `${API_BASE_URL}/videos/${videoId}/clip?start_sec=${startSec}&end_sec=${endSec}`;
}

export interface ReportSummary {
  investigation_id: string;
  investigation_name: string;
  video_id: string;
  video_label: string;
  status: VideoStatus;
  error: string | null;
  event_count: number;
  highlights: string[];
}

export function listReports() {
  return request<ReportSummary[]>("/reports");
}
export interface ClaimEvidence {
  event_id: string;
  description: string;
  video_id: string;
  video_label: string;
  start_sec: number;
  end_sec: number;
  relationship: "SUPPORTS" | "CONTRADICTS";
}

export interface ClaimRecord {
  id: string;
  text: string;
  speaker: string | null;
  claim_type: string;
  status: "corroborated" | "contradicted" | "mixed" | "unverified";
  assessment_summary: string;
  start_sec: number;
  end_sec: number;
  video_id: string;
  video_label: string;
  evidence: ClaimEvidence[];
}

export function listClaims(investigationId: string) {
  return request<ClaimRecord[]>(`/investigations/${investigationId}/claims`);
}
export function rebuildClaimIntelligence(investigationId: string) {
  return request<{ started: boolean }>(`/investigations/${investigationId}/claims/rebuild`, { method: "POST" });
}