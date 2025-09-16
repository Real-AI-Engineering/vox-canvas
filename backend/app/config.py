from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    app_name: str = Field(default="AI Workshop Assistant API")
    session_id: str = Field(default="local", env="VOX_SESSION_ID")
    session_title: str = Field(default="AI Workshop", env="VOX_SESSION_TITLE")
    stt_mode: Literal["google", "vosk"] = Field(default="google", env="VOX_STT_MODE")
    stt_language: str = Field(default="ru-RU", env="VOX_LANGUAGE")
    card_mode: Literal["stub", "openai"] = Field(default="stub", env="VOX_CARD_MODE")
    openai_model: str = Field(default="gpt-4o-mini", env="VOX_OPENAI_MODEL")
    logging_config: str = Field(default="logging.json", env="VOX_LOGGING_CONFIG")
    trace_enabled: bool = Field(default=False, env="VOX_TRACE")
    git_sha: str | None = Field(default=None, env="VOX_GIT_SHA")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


__all__ = ["Settings", "get_settings"]
