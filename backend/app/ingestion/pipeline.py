from pathlib import Path

from app.graph import reader, writer
from app.ingestion.extract import extract_audio_transcript, extract_claims, extract_video
from app.services import claim_assessment, document_downloader, openai_client, pdf_extractor, twelvelabs_client, video_downloader

STEPS = ["uploaded", "indexed", "scenes", "entities", "ready"]


def get_or_create_index(investigation_id: str, tl_index_id: str | None, name_prefix: str) -> str:
    if tl_index_id:
        return tl_index_id
    index_id = twelvelabs_client.create_index(f"{name_prefix}-{investigation_id[:8]}")
    writer.set_investigation_index_id(investigation_id, index_id)
    return index_id


def _assess_claims(investigation_id: str) -> None:
    try:
        claim_assessment.reassess_investigation(investigation_id)
    except Exception as exc:  # Claim assessment must not discard usable evidence.
        print(f"[claim_assessment] {exc}")


def _index_and_extract(video_id: str, investigation_id: str, tl_index_id: str, file_path: Path) -> None:
    writer.set_video_status(video_id, "indexing")
    tl_video_id = twelvelabs_client.upload_video(tl_index_id, file_path)
    writer.set_video_tl_id(video_id, tl_video_id)
    writer.set_video_status(video_id, "indexed")
    writer.set_video_status(video_id, "extracting")
    chapters, extraction = extract_video(tl_video_id)
    writer.write_scenes(video_id, chapters)
    writer.write_extraction(video_id, investigation_id, extraction)
    writer.write_claims(video_id, investigation_id, extraction)
    _assess_claims(investigation_id)
    writer.set_video_status(video_id, "ready")


def _transcribe_and_extract(video_id: str, investigation_id: str, file_path: Path) -> None:
    writer.set_video_status(video_id, "extracting")
    extraction = extract_audio_transcript(openai_client.transcribe_audio(file_path))
    writer.write_extraction(video_id, investigation_id, extraction)
    writer.write_claims(video_id, investigation_id, extraction)
    _assess_claims(investigation_id)
    writer.set_video_status(video_id, "ready")


def run_ingestion(video_id: str, investigation_id: str, tl_index_id: str, file_path: Path) -> None:
    try:
        _index_and_extract(video_id, investigation_id, tl_index_id, file_path)
    except Exception as exc:
        writer.set_video_status(video_id, "partial", error=str(exc))


def run_ingestion_from_url(video_id: str, investigation_id: str, tl_index_id: str | None, source_url: str, referer: str | None, dest_path: Path, media_type: str = "video") -> None:
    try:
        writer.set_video_status(video_id, "downloading")
        video_downloader.download(source_url, referer, dest_path)
        if media_type == "audio":
            _transcribe_and_extract(video_id, investigation_id, dest_path)
        else:
            if tl_index_id is None:
                raise RuntimeError("Video index is unavailable")
            _index_and_extract(video_id, investigation_id, tl_index_id, dest_path)
    except Exception as exc:
        writer.set_video_status(video_id, "partial", error=str(exc))


def run_document_ingestion(document_id: str, investigation_id: str, source_url: str, dest_path: Path) -> None:
    try:
        writer.set_document_status(document_id, "downloading")
        document_downloader.download(source_url, dest_path)
        writer.set_document_status(document_id, "extracting")
        writer.write_document_text(document_id, pdf_extractor.extract_text(dest_path))
        writer.set_document_status(document_id, "ready")
    except Exception as exc:
        writer.set_document_status(document_id, "partial", error=str(exc))


def rebuild_claim_intelligence(investigation_id: str) -> None:
    rebuilt = False
    for video in reader.list_ready_videos_for_claim_rebuild(investigation_id):
        try:
            extraction = extract_claims(video["tl_video_id"])
            writer.delete_claims_for_video(video["id"])
            writer.write_claims(video["id"], investigation_id, extraction)
            rebuilt = True
        except Exception as exc:
            print(f"[claim_rebuild] video={video['id']} error={exc}")
    if rebuilt:
        _assess_claims(investigation_id)