import re
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import unquote, urlparse

import requests
import yt_dlp

from app.models.schemas import CaseItemPreview

# Built against Chicago COPA's case-portal template: each exhibit is a Bootstrap
# modal whose iframe src is set on click via inline jQuery, e.g.
#   <h4 class="modal-title" id="label930385500">BWC 1 | Shooting Officer 1</h4>
#   ...
#   jQuery('#link930385500').click(function () {
#       var src = 'https://player.vimeo.com/video/930385500';
# Audio exhibits (911 calls, ShotSpotter, OEMC) use the same modal/label pattern
# but embed a SoundCloud player instead of Vimeo. Documents are plain PDF anchors.
# Other case-portal sites using the same template should parse the same way.
_LABEL_RE = re.compile(r'id="label(\d+)">\s*(.*?)\s*</h4>', re.DOTALL)
_VIMEO_RE = re.compile(r"jQuery\('#link(\d+)'\)\.click\(function \(\) \{\s*var src = '(https://player\.vimeo\.com/video/\d+)'")
_SOUNDCLOUD_RE = re.compile(
    r"jQuery\('#link(\d+)'\)\.click\(function \(\) \{\s*var src = '[^']*url=([^&']+)"
)
_PDF_RE = re.compile(
    r'<a href="(https://[^"]+\.pdf)"[^>]*class="large-icon">\s*<span class="fa fa-file-pdf-o"></span>\s*(.*?)\s*</a>',
    re.DOTALL,
)

_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"


def _fetch_vimeo_duration(vimeo_url: str) -> tuple[float | None, str | None]:
    try:
        resp = requests.get(
            "https://vimeo.com/api/oembed.json", params={"url": vimeo_url}, timeout=10
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("duration"), data.get("thumbnail_url")
    except Exception:
        return None, None


def _fetch_audio_duration(track_url: str) -> float | None:
    try:
        with yt_dlp.YoutubeDL({"quiet": True, "skip_download": True, "noplaylist": True}) as ydl:
            info = ydl.extract_info(track_url, download=False)
        return info.get("duration")
    except Exception:
        return None


def fetch_case_videos(case_url: str) -> tuple[str, list[CaseItemPreview]]:
    resp = requests.get(case_url, headers={"User-Agent": _USER_AGENT}, timeout=20)
    resp.raise_for_status()
    html = resp.text

    labels = dict(_LABEL_RE.findall(html))

    video_pairs = [(labels.get(mid, "").strip(), url) for mid, url in _VIMEO_RE.findall(html)]
    audio_pairs = [
        (labels.get(mid, "").strip(), unquote(url)) for mid, url in _SOUNDCLOUD_RE.findall(html)
    ]
    doc_pairs = [(label.strip(), url) for url, label in _PDF_RE.findall(html)]

    with ThreadPoolExecutor(max_workers=8) as pool:
        video_meta = list(pool.map(lambda p: _fetch_vimeo_duration(p[1]), video_pairs))
        audio_durations = list(pool.map(lambda p: _fetch_audio_duration(p[1]), audio_pairs))

    items: list[CaseItemPreview] = []
    for (label, url), (duration, thumbnail_url) in zip(video_pairs, video_meta):
        items.append(
            CaseItemPreview(
                kind="video", label=label or url, source_url=url,
                duration_sec=duration, thumbnail_url=thumbnail_url,
            )
        )
    for (label, url), duration in zip(audio_pairs, audio_durations):
        items.append(
            CaseItemPreview(
                kind="audio", label=label or url, source_url=url,
                duration_sec=duration, thumbnail_url=None,
            )
        )
    for label, url in doc_pairs:
        items.append(
            CaseItemPreview(
                kind="document", label=label or url, source_url=url,
                duration_sec=None, thumbnail_url=None,
            )
        )

    parsed = urlparse(case_url)
    referer = f"{parsed.scheme}://{parsed.netloc}/"
    return referer, items
