import os
import sys
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from models import User, UserRole
from database import Base
from settings import settings

# Setup database connection
DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Setup password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_superuser(email, username, password, full_name):
    async with AsyncSessionLocal() as session:
        # Check if user exists
        from sqlalchemy import select
        result = await session.execute(select(User).where((User.email == email) | (User.username == username)))
        existing_user = result.scalars().first()
        
        if existing_user:
            print(f"User with email {email} or username {username} already exists.")
            return

        hashed_password = pwd_context.hash(password)
        
        new_user = User(
            email=email,
            username=username,
            hashed_password=hashed_password,
            full_name=full_name,
            role=UserRole.ADMIN,
            is_active=True
        )
        
        session.add(new_user)
        await session.commit()
        print(f"Superuser {username} created successfully!")

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: python create_superuser.py <email> <username> <password> <full_name>")
        sys.exit(1)
        
    email = sys.argv[1]
    username = sys.argv[2]
    password = sys.argv[3]
    full_name = sys.argv[4]
    
    asyncio.run(create_superuser(email, username, password, full_name))
