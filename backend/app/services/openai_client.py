from functools import lru_cache
from pathlib import Path

from openai import OpenAI

from app.config import get_settings


@lru_cache
def get_openai_client() -> OpenAI:
    settings = get_settings()
    return OpenAI(api_key=settings.openai_api_key)


def get_settings_model() -> str:
    return get_settings().openai_model


def transcribe_audio(file_path: Path) -> list[dict]:
    client = get_openai_client()
    with open(file_path, "rb") as f:
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )
    return [{"start": s.start, "end": s.end, "text": s.text} for s in result.segments]


def ping() -> bool:
    try:
        get_openai_client().models.list()
        return True
    except Exception:
        return False
