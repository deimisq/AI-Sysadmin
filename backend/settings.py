from pydantic_settings import BaseSettings
from desktop_config import DESKTOP_MODE, get_database_url, DESKTOP_SETTINGS
from pydantic import field_validator

class Settings(BaseSettings):
    # Database URL - automatically uses SQLite in desktop mode, PostgreSQL in SaaS mode
    DATABASE_URL: str = get_database_url()
    
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    SSH_KNOWN_HOSTS: str | None = None
    
    # LLM Settings - supports OpenAI and Google Gemini
    LLM_PROVIDER: str = "gemini"  # "openai" or "gemini"
    OPENAI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    AWS_BEARER_TOKEN_BEDROCK: str = ""
    AWS_REGION: str = "us-east-1"
    ANTHROPIC_API_KEY: str = ""
    ENCRYPTION_KEY: str

    @field_validator("SECRET_KEY", "ENCRYPTION_KEY")
    @classmethod
    def validate_secret(cls, value: str) -> str:
        if len(value) < 32 or value.lower().startswith(("change_me", "default-", "supersecret")):
            raise ValueError("Configure a unique secret of at least 32 characters")
        return value
    
    # Desktop mode flag
    DESKTOP_MODE: bool = DESKTOP_MODE
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Print database info
if DESKTOP_MODE:
    print(f"🖥️  Desktop Mode: Using SQLite database at {settings.DATABASE_URL}")
