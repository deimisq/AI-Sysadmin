from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://sysadmin_agent:secure_password_dev@localhost:5432/sysadmin_agent_db"
    SECRET_KEY: str = "supersecretkey"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # LLM Settings - supports OpenAI and Google Gemini
    LLM_PROVIDER: str = "gemini"  # "openai" or "gemini"
    OPENAI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    AWS_BEARER_TOKEN_BEDROCK: str = ""
    AWS_REGION: str = "us-east-1"
    
    class Config:
        env_file = ".env"

settings = Settings()
