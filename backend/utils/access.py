"""Shared tenant and inventory authorization policy."""
from fastapi import HTTPException
from sqlalchemy import or_
import models


def is_global_admin(user):
    return bool(user.is_superuser or user.role == models.RoleType.SUPERADMIN.value)


def server_query(user, db):
    query = db.query(models.Server)
    if is_global_admin(user):
        return query
    query = query.filter(models.Server.organization_id == user.organization_id)
    if user.role == models.RoleType.ADMIN.value:
        return query
    groups = db.query(models.UserGroupPermission.group_id).join(
        models.ServerGroup, models.ServerGroup.id == models.UserGroupPermission.group_id
    ).filter(
        models.UserGroupPermission.user_id == user.id,
        models.ServerGroup.organization_id == user.organization_id,
    )
    return query.filter(or_(models.Server.created_by == user.id, models.Server.group_id.in_(groups)))


def require_server_access(user, server, db):
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")
    if not server_query(user, db).filter(models.Server.id == server.id).first():
        # Do not reveal whether another tenant's server exists.
        raise HTTPException(status_code=404, detail="Server not found")


def require_group_access(user, group_id, db):
    if group_id is None:
        return
    group = db.query(models.ServerGroup).filter(models.ServerGroup.id == group_id).first()
    if not group or (not is_global_admin(user) and group.organization_id != user.organization_id):
        raise HTTPException(status_code=404, detail="Group not found")
    if is_global_admin(user) or user.role == models.RoleType.ADMIN.value or group.created_by == user.id:
        return
    permission = db.query(models.UserGroupPermission).filter_by(user_id=user.id, group_id=group_id).first()
    if not permission:
        raise HTTPException(status_code=403, detail="Access denied to this group")
