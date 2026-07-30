from pathlib import Path

import requests

_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"


def download(source_url: str, dest_path: Path) -> None:
    resp = requests.get(source_url, headers={"User-Agent": _USER_AGENT}, timeout=60)
    resp.raise_for_status()
    dest_path.write_bytes(resp.content)
