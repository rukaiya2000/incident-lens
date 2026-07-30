import re
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

import requests

from app.models.schemas import CaseVideoPreview

# Built against Chicago COPA's case-portal template: each video is a Bootstrap modal
# whose iframe src is set on click via inline jQuery, e.g.
#   <h4 class="modal-title" id="label930385500">BWC 1 | Shooting Officer 1</h4>
#   ...
#   jQuery('#link930385500').click(function () {
#       var src = 'https://player.vimeo.com/video/930385500';
# Other case-portal sites using the same template (other agencies' transparency
# pages) should parse the same way; audio-only exhibits (911 calls, ShotSpotter,
# OEMC) embed SoundCloud instead of Vimeo and are intentionally excluded here since
# this app ingests video.
_LABEL_RE = re.compile(r'id="label(\d+)">\s*(.*?)\s*</h4>', re.DOTALL)
_VIMEO_RE = re.compile(r"jQuery\('#link(\d+)'\)\.click\(function \(\) \{\s*var src = '(https://player\.vimeo\.com/video/\d+)'")

_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"


def _fetch_duration(vimeo_url: str) -> tuple[float | None, str | None]:
    try:
        resp = requests.get(
            "https://vimeo.com/api/oembed.json", params={"url": vimeo_url}, timeout=10
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("duration"), data.get("thumbnail_url")
    except Exception:
        return None, None


def fetch_case_videos(case_url: str) -> tuple[str, list[CaseVideoPreview]]:
    resp = requests.get(case_url, headers={"User-Agent": _USER_AGENT}, timeout=20)
    resp.raise_for_status()
    html = resp.text

    labels = dict(_LABEL_RE.findall(html))
    vimeo_links = dict(_VIMEO_RE.findall(html))

    pairs = [(labels.get(modal_id, "").strip(), url) for modal_id, url in vimeo_links.items()]

    with ThreadPoolExecutor(max_workers=8) as pool:
        durations = list(pool.map(lambda p: _fetch_duration(p[1]), pairs))

    videos = [
        CaseVideoPreview(
            label=label or url,
            source_url=url,
            duration_sec=duration,
            thumbnail_url=thumbnail_url,
        )
        for (label, url), (duration, thumbnail_url) in zip(pairs, durations)
    ]

    parsed = urlparse(case_url)
    referer = f"{parsed.scheme}://{parsed.netloc}/"
    return referer, videos
