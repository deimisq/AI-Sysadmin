"""add_license_table

Revision ID: 89e15d612afb
Revises: d4a398536bbc
Create Date: 2025-12-04 20:13:54.312540

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '89e15d612afb'
down_revision: Union[str, Sequence[str], None] = 'd4a398536bbc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('licenses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('license_key', sa.String(), nullable=False),
        sa.Column('license_type', sa.String(), nullable=True),
        sa.Column('company_name', sa.String(), nullable=True),
        sa.Column('contact_email', sa.String(), nullable=True),
        sa.Column('max_servers', sa.Integer(), nullable=True),
        sa.Column('max_users', sa.Integer(), nullable=True),
        sa.Column('issued_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('last_validated', sa.DateTime(timezone=True), nullable=True),
        sa.Column('validation_count', sa.Integer(), nullable=True),
        sa.Column('installation_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_licenses_id'), 'licenses', ['id'], unique=False)
    op.create_index(op.f('ix_licenses_license_key'), 'licenses', ['license_key'], unique=True)
    op.create_index(op.f('ix_licenses_installation_id'), 'licenses', ['installation_id'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_licenses_installation_id'), table_name='licenses')
    op.drop_index(op.f('ix_licenses_license_key'), table_name='licenses')
    op.drop_index(op.f('ix_licenses_id'), table_name='licenses')
    op.drop_table('licenses')
