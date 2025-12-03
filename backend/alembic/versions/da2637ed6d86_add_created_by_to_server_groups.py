"""add_created_by_to_server_groups

Revision ID: da2637ed6d86
Revises: 4147d415a6dd
Create Date: 2025-11-25 13:41:15.757805

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'da2637ed6d86'
down_revision: Union[str, Sequence[str], None] = '4147d415a6dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('server_groups', sa.Column('created_by', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'server_groups', 'users', ['created_by'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'server_groups', type_='foreignkey')
    op.drop_column('server_groups', 'created_by')
