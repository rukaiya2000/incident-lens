from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    neo4j_uri: str
    neo4j_username: str
    neo4j_password: str

    twelvelabs_api_key: str
    twelvelabs_index_name_prefix: str = "incidentlens"

    openai_api_key: str
    openai_model: str = "gpt-4o-mini"

    media_root: str = "./data/uploads"
    upload_max_mb: int = 500

    @property
    def media_root_path(self) -> Path:
        path = Path(self.media_root)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()
