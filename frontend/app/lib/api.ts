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
}

export interface Investigation {
  id: string;
  name: string;
  description: string;
  tl_index_id: string | null;
}

export interface InvestigationDetail extends Investigation {
  videos: Video[];
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

export interface CaseVideoPreview {
  label: string;
  source_url: string;
  duration_sec: number | null;
  thumbnail_url: string | null;
}

export interface CaseSourceResponse {
  referer: string;
  videos: CaseVideoPreview[];
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
  referer?: string
) {
  return request<{ video_id: string; status: VideoStatus }>(
    `/investigations/${investigationId}/videos/from-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_url: sourceUrl, label, referer }),
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

export function mediaUrl(filename: string) {
  return `${API_BASE_URL}/media/${filename}`;
}
