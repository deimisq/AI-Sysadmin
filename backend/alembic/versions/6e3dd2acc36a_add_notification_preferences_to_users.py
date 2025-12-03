"""add_notification_preferences_to_users

Revision ID: 6e3dd2acc36a
Revises: da2637ed6d86
Create Date: 2025-11-25 20:13:18.044506

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e3dd2acc36a'
down_revision: Union[str, Sequence[str], None] = 'da2637ed6d86'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add notification preference columns to users table
    op.add_column('users', sa.Column('notify_new_users', sa.Boolean(), server_default='true', nullable=True))
    op.add_column('users', sa.Column('notify_security_alerts', sa.Boolean(), server_default='true', nullable=True))
    op.add_column('users', sa.Column('notify_new_servers', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('users', sa.Column('notify_system_events', sa.Boolean(), server_default='true', nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'notify_system_events')
    op.drop_column('users', 'notify_new_servers')
    op.drop_column('users', 'notify_security_alerts')
    op.drop_column('users', 'notify_new_users')
