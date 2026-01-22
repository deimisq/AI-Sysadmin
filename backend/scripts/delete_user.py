
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, Organization

DATABASE_URL = "postgresql://sysadmin:SecurePasse6ab2dd2@db:5432/sysadmin_db"

try:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    email = "sentra@sentrait.com.uy"
    user = db.query(User).filter(User.email == email).first()

    if user:
        print(f"Deleting user: {user.username} ({user.email}) - OrgID: {user.organization_id}")
        org_id = user.organization_id
        
        # Delete related Audit Logs first
        from models import AuditLog
        logs = db.query(AuditLog).filter(AuditLog.user_id == user.id).delete()
        print(f"Deleted {logs} audit logs.")
        
        # Delete user
        db.delete(user)
        db.commit()
        print("User deleted.")
        
        if org_id:
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if org:
                print(f"Deleting organization: {org.name}")
                db.delete(org)
                db.commit()
                print("Organization deleted.")
            else:
                print("Organization not found (maybe already deleted?).")
    else:
        print(f"User {email} not found.")

except Exception as e:
    print(f"Error: {e}")
    db.rollback()
