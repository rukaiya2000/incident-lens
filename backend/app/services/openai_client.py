from functools import lru_cache

from openai import OpenAI

from app.config import get_settings


@lru_cache
def get_openai_client() -> OpenAI:
    settings = get_settings()
    return OpenAI(api_key=settings.openai_api_key)


def get_settings_model() -> str:
    return get_settings().openai_model


def ping() -> bool:
    try:
        get_openai_client().models.list()
        return True
    except Exception:
        return False
