"""Add notify_version_updates to users

Revision ID: notify_version_updates
Revises: 6e3dd2acc36a
Create Date: 2024-12-05

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'notify_version_updates'
down_revision = '89e15d612afb'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('notify_version_updates', sa.Boolean(), server_default='true', nullable=True))


def downgrade():
    op.drop_column('users', 'notify_version_updates')
