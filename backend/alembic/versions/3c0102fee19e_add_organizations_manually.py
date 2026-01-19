"""add organizations manually

Revision ID: 3c0102fee19e
Revises: 8b7980c677a8
Create Date: 2026-01-19 20:09:20.712527

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c0102fee19e'
down_revision: Union[str, Sequence[str], None] = '8b7980c677a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Organizations table - only create if doesn't exist
    if 'organizations' not in inspector.get_table_names():
        op.create_table('organizations',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('slug', sa.String(), nullable=False),
            sa.Column('subscription_tier', sa.String(), nullable=True, server_default='free'),
            sa.Column('max_users', sa.Integer(), nullable=True, server_default='1'),
            sa.Column('stripe_customer_id', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_organizations_id'), 'organizations', ['id'], unique=False)
        op.create_index(op.f('ix_organizations_name'), 'organizations', ['name'], unique=True)
        op.create_index(op.f('ix_organizations_slug'), 'organizations', ['slug'], unique=True)

    # Add organization_id to users if not exists
    users_columns = [c['name'] for c in inspector.get_columns('users')]
    if 'organization_id' not in users_columns:
        with op.batch_alter_table('users') as batch_op:
            batch_op.add_column(sa.Column('organization_id', sa.Integer(), nullable=True))
            batch_op.create_foreign_key('fk_users_org', 'organizations', ['organization_id'], ['id'])

    # Add organization_id to servers if not exists
    servers_columns = [c['name'] for c in inspector.get_columns('servers')]
    if 'organization_id' not in servers_columns:
        with op.batch_alter_table('servers') as batch_op:
            batch_op.add_column(sa.Column('organization_id', sa.Integer(), nullable=True))
            batch_op.create_foreign_key('fk_servers_org', 'organizations', ['organization_id'], ['id'])

    # Add organization_id to server_groups if not exists
    groups_columns = [c['name'] for c in inspector.get_columns('server_groups')]
    if 'organization_id' not in groups_columns:
        with op.batch_alter_table('server_groups') as batch_op:
            batch_op.add_column(sa.Column('organization_id', sa.Integer(), nullable=True))
            batch_op.create_foreign_key('fk_groups_org', 'organizations', ['organization_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'server_groups', type_='foreignkey')
    op.drop_column('server_groups', 'organization_id')

    op.drop_constraint(None, 'servers', type_='foreignkey')
    op.drop_column('servers', 'organization_id')

    op.drop_constraint(None, 'users', type_='foreignkey')
    op.drop_column('users', 'organization_id')

    op.drop_index(op.f('ix_organizations_slug'), table_name='organizations')
    op.drop_index(op.f('ix_organizations_name'), table_name='organizations')
    op.drop_index(op.f('ix_organizations_id'), table_name='organizations')
    op.drop_table('organizations')
