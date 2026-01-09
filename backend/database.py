from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from settings import settings

# Use async engine in production, but sync for MVP simplicity with pgvector for now
# or we can use asyncpg. Let's stick to standard sync for initial setup stability
# unless we need high concurrency immediately.
# Actually, let's use standard sync engine for now to avoid async complexity with Alembic initially.

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Different configurations for SQLite vs PostgreSQL
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # SQLite configuration
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},  # Needed for SQLite
        pool_pre_ping=True,
    )
else:
    # PostgreSQL configuration
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=20,  # Increased from default 5
        max_overflow=40,  # Increased from default 10
        pool_pre_ping=True,  # Test connections before using
        pool_recycle=3600  # Recycle connections after 1 hour
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
