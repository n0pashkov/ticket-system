"""add is_hidden_for_creator column to tickets table

Revision ID: ad123fde4567
Revises: предыдущий_id_ревизии
Create Date: 2023-10-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ad123fde4567'
down_revision = None  # Замените на ID предыдущей миграции, если она существует
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tickets', sa.Column('is_hidden_for_creator', sa.Boolean(), nullable=True, server_default='false'))


def downgrade():
    op.drop_column('tickets', 'is_hidden_for_creator') 