from pathlib import Path

import yt_dlp


def download(source_url: str, referer: str | None, dest_path: Path) -> None:
    """Downloads source_url (e.g. a Vimeo embed) to exactly dest_path, forcing an
    mp4 container regardless of the source's native codecs/format."""
    outtmpl = str(dest_path.with_suffix("")) + ".%(ext)s"
    ydl_opts = {
        "outtmpl": outtmpl,
        # No ext= constraints: HLS sources (e.g. Vimeo) report inconsistent extension
        # metadata on audio-only tracks, so filtering on ext excludes valid streams.
        # merge_output_format below forces the final container to mp4 regardless.
        "format": "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
        "merge_output_format": "mp4",
        "quiet": True,
        "noprogress": True,
    }
    if referer:
        ydl_opts["http_headers"] = {"Referer": referer}

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([source_url])

    if not dest_path.exists():
        raise RuntimeError(f"Download completed but expected output file missing: {dest_path}")
