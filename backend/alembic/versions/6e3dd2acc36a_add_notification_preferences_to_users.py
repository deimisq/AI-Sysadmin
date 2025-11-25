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
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
