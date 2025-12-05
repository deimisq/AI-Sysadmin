"""
Version checking service for AI Sysadmin Agent.
Periodically checks for new versions and notifies administrators.
"""
import asyncio
import httpx
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)

VERSION_CHECK_URL = "https://agent.sentrait.com.uy/versions.json"
CHECK_INTERVAL_HOURS = 24  # Check every 24 hours


class VersionChecker:
    _instance = None
    _last_check: Optional[datetime] = None
    _latest_version: Optional[str] = None
    _current_version: Optional[str] = None
    _update_available: bool = False
    _version_info: Optional[Dict[str, Any]] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, '_initialized'):
            self._initialized = True
            self._load_current_version()
    
    def _load_current_version(self):
        """Load current version from VERSION.json"""
        try:
            version_file = Path(__file__).parent.parent / "VERSION.json"
            if not version_file.exists():
                version_file = Path("/app/VERSION.json")
            
            if version_file.exists():
                with open(version_file, 'r') as f:
                    data = json.load(f)
                    # Use fullVersion if available, otherwise construct from version + build
                    full_version = data.get('fullVersion')
                    if not full_version:
                        version = data.get('version', 'unknown')
                        build = data.get('build', '')
                        full_version = f"{version}{build}" if build else version
                    self._current_version = full_version
                    logger.info(f"Current version: {self._current_version}")
            else:
                self._current_version = "unknown"
                logger.warning("VERSION.json not found")
        except Exception as e:
            logger.error(f"Error loading version: {e}")
            self._current_version = "unknown"
    
    async def check_for_updates(self, force: bool = False) -> Dict[str, Any]:
        """
        Check for available updates.
        Returns version info and update status.
        """
        # Skip if checked recently (unless forced)
        if not force and self._last_check:
            time_since_check = datetime.now() - self._last_check
            if time_since_check < timedelta(hours=CHECK_INTERVAL_HOURS):
                return self._get_status()
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(VERSION_CHECK_URL)
                response.raise_for_status()
                
                data = response.json()
                self._version_info = data
                self._latest_version = data.get('latest')
                self._last_check = datetime.now()
                
                # Compare versions
                self._update_available = self._is_newer_version(
                    self._latest_version,
                    self._current_version
                )
                
                logger.info(
                    f"Version check complete. "
                    f"Current: {self._current_version}, "
                    f"Latest: {self._latest_version}, "
                    f"Update available: {self._update_available}"
                )
                
        except Exception as e:
            logger.error(f"Failed to check for updates: {e}")
        
        return self._get_status()
    
    def _is_newer_version(self, latest: str, current: str) -> bool:
        """Compare version strings to determine if update is available."""
        if not latest or not current or current == "unknown":
            return False
        
        try:
            # Parse versions (format: X.Y.Z-suffix)
            def parse_version(v: str):
                # Remove suffix (beta, rc, etc)
                base = v.split('-')[0]
                parts = base.split('.')
                return [int(p) for p in parts]
            
            latest_parts = parse_version(latest)
            current_parts = parse_version(current)
            
            # Compare major.minor.patch
            for l, c in zip(latest_parts, current_parts):
                if l > c:
                    return True
                elif l < c:
                    return False
            
            # If base versions are equal, check suffixes
            # beta < rc < stable (no suffix)
            latest_suffix = latest.split('-')[1] if '-' in latest else ''
            current_suffix = current.split('-')[1] if '-' in current else ''
            
            if current_suffix and not latest_suffix:
                return True  # Stable is newer than any suffix
            
            # Compare beta versions (beta.8 > beta.7 or beta8 > beta7)
            if 'beta' in latest and 'beta' in current_suffix:
                import re
                def get_beta_number(v: str) -> int:
                    match = re.search(r'beta\.?(\d+)', v)
                    return int(match.group(1)) if match else 0
                
                latest_beta = get_beta_number(latest)
                current_beta = get_beta_number(current)
                return latest_beta > current_beta
            
            return False
            
        except Exception as e:
            logger.error(f"Error comparing versions: {e}")
            return False
    
    def _get_status(self) -> Dict[str, Any]:
        """Get current version status."""
        return {
            "current_version": self._current_version,
            "latest_version": self._latest_version,
            "update_available": self._update_available,
            "last_check": self._last_check.isoformat() if self._last_check else None,
            "download_url": self._version_info.get('downloadUrl') if self._version_info else None,
            "changelog_url": self._version_info.get('changelogUrl') if self._version_info else None,
            "release_date": self._version_info.get('releaseDate') if self._version_info else None,
        }
    
    def get_version_details(self) -> Optional[Dict[str, Any]]:
        """Get full version details including changelog."""
        if not self._version_info:
            return None
        
        versions = self._version_info.get('versions', [])
        latest_details = versions[0] if versions else None
        
        return {
            **self._get_status(),
            "latest_details": latest_details,
            "all_versions": versions[:5]  # Last 5 versions
        }


# Global instance
version_checker = VersionChecker()


async def start_version_check_loop():
    """Background loop that periodically checks for updates."""
    logger.info("Starting version check background loop")
    
    # Initial check after 5 minutes
    await asyncio.sleep(300)
    
    while True:
        try:
            await version_checker.check_for_updates()
        except Exception as e:
            logger.error(f"Error in version check loop: {e}")
        
        # Wait for next check interval
        await asyncio.sleep(CHECK_INTERVAL_HOURS * 3600)
