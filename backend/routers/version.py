"""
Version check API endpoints.
"""
from fastapi import APIRouter, Depends
from typing import Dict, Any

from services.version_service import version_checker
from utils.auth import get_current_user
from models import User

router = APIRouter(prefix="/version", tags=["version"])


@router.get("/check")
async def check_version(
    force: bool = False,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Check for available updates.
    
    - **force**: If true, forces a fresh check even if recently checked.
    
    Returns version status including current version, latest version,
    and whether an update is available.
    """
    return await version_checker.check_for_updates(force=force)


@router.get("/details")
async def get_version_details(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get detailed version information including changelog.
    
    Returns the last 5 versions with their changelogs.
    """
    # First ensure we have data
    await version_checker.check_for_updates()
    
    details = version_checker.get_version_details()
    if not details:
        return {
            "error": "Could not fetch version details",
            "current_version": version_checker._current_version
        }
    
    return details


@router.get("/current")
async def get_current_version() -> Dict[str, str]:
    """
    Get the current installed version.
    This endpoint is public (no auth required).
    """
    return {
        "version": version_checker._current_version or "unknown"
    }
