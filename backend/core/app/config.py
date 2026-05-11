from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "KRATOS Core"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://kratos:kratos@localhost:5432/kratos"
    redis_url: str = "redis://localhost:6379/0"
    weaviate_url: str = "http://localhost:8080"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    model_providers: dict = {
        "openai": {"api_key": "", "base_url": "https://api.openai.com/v1"},
        "anthropic": {"api_key": "", "base_url": "https://api.anthropic.com/v1"},
        "groq": {"api_key": "", "base_url": "https://api.groq.com/openai/v1"},
        "openrouter": {"api_key": "", "base_url": "https://openrouter.ai/api/v1"},
        "deepseek": {"api_key": "", "base_url": "https://api.deepseek.com/v1"},
        "ollama": {"api_key": "", "base_url": "http://localhost:11434/v1"},
    }

    model_routing: dict = {
        "coding": {"primary": "claude-sonnet-4-20250514", "fallback": ["gpt-4o", "deepseek-chat"]},
        "reasoning": {"primary": "o3-mini", "fallback": ["claude-sonnet-4-20250514"]},
        "planning": {"primary": "o3-mini", "fallback": ["claude-sonnet-4-20250514"]},
        "summarization": {"primary": "gpt-4.1-nano", "fallback": ["llama3.2:3b"]},
        "conversation": {"primary": "claude-sonnet-4-20250514", "fallback": ["gpt-4o"]},
    }

    sandbox_image: str = "kratos/sandbox:latest"
    sandbox_timeout_seconds: int = 300
    max_agent_iterations: int = 25

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
