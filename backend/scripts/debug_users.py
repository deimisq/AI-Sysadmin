
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models import User, Organization
import os
from utils.auth import verify_password

DATABASE_URL = "postgresql://sysadmin:SecurePasse6ab2dd2@db:5432/sysadmin_db"

try:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("--- Users ---")
    users = db.query(User).all()
    for u in users:
        print(f"ID: {u.id}, Username: {u.username}, Email: {u.email}, Active: {u.is_active}, Role: {u.role}, OrgID: {u.organization_id}")

    print("\n--- Organizations ---")
    orgs = db.query(Organization).all()
    for o in orgs:
        print(f"ID: {o.id}, Name: {o.name}, Slug: {o.slug}")

except Exception as e:
    print(f"Error: {e}")
