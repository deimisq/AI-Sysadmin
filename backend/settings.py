from pydantic_settings import BaseSettings
from desktop_config import DESKTOP_MODE, get_database_url, DESKTOP_SETTINGS

class Settings(BaseSettings):
    # Database URL - automatically uses SQLite in desktop mode, PostgreSQL in SaaS mode
    DATABASE_URL: str = get_database_url()
    
    SECRET_KEY: str = "supersecretkey"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # LLM Settings - supports OpenAI and Google Gemini
    LLM_PROVIDER: str = "gemini"  # "openai" or "gemini"
    OPENAI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    AWS_BEARER_TOKEN_BEDROCK: str = ""
    AWS_REGION: str = "us-east-1"
    ANTHROPIC_API_KEY: str = ""
    ENCRYPTION_KEY: str = "default-encryption-key-change-in-production"
    
    # Desktop mode flag
    DESKTOP_MODE: bool = DESKTOP_MODE
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Print database info
if DESKTOP_MODE:
    print(f"🖥️  Desktop Mode: Using SQLite database at {settings.DATABASE_URL}")
