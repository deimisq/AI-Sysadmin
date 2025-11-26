from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from database import SessionLocal
from models import License
from datetime import datetime

class LicenseCheckMiddleware(BaseHTTPMiddleware):
    """Middleware to check license validity on each request"""
    
    # Paths that don't require license check
    EXEMPT_PATHS = [
        "/",
        "/health",
        "/api/v1/version",
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/config/license",
        "/docs",
        "/openapi.json"
    ]
    
    async def dispatch(self, request: Request, call_next):
        # Skip license check for exempt paths
        if any(request.url.path.startswith(path) for path in self.EXEMPT_PATHS):
            return await call_next(request)
        
        # Check license
        db = SessionLocal()
        try:
            license = db.query(License).first()
            
            if not license:
                raise HTTPException(
                    status_code=403,
                    detail="No valid license found. Please contact support."
                )
            
            # Check if license is expired
            now = datetime.now()
            if license.expiration_date < now:
                # Update status
                if license.status == "ACTIVE":
                    license.status = "EXPIRED"
                    db.commit()
                
                raise HTTPException(
                    status_code=403,
                    detail=f"License expired on {license.expiration_date.strftime('%Y-%m-%d')}. Please renew your license."
                )
            
            # Check if license is active
            if license.status != "ACTIVE":
                raise HTTPException(
                    status_code=403,
                    detail=f"License is {license.status}. Please contact support."
                )
            
        finally:
            db.close()
        
        response = await call_next(request)
        return response
