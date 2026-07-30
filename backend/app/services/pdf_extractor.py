from pathlib import Path

from pypdf import PdfReader


def extract_text(file_path: Path) -> str:
    reader = PdfReader(file_path)
    pages = [page.extract_text() or "" for page in reader.pages]
    text = "\n\n".join(pages).strip()
    if not text:
        raise RuntimeError("No extractable text found in this PDF (it may be a scanned image).")
    return text
