"""remove_comments_table

Revision ID: ad123fde4567
Revises: None  # Замените на ID предыдущей миграции, если она существует
Create Date: 2023-10-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import op

# revision identifiers, used by Alembic.
revision = 'ad123fde4567'
down_revision = None  # Замените на ID предыдущей миграции, если она существует
branch_labels = None
depends_on = None


def upgrade():
    # ������� ������� comments
    op.drop_table('comments')


def downgrade():
    # ������� ������� comments ��� ������ ��������
    op.create_table('comments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('author_id', sa.Integer(), nullable=True),
        sa.Column('ticket_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_comments_id'), 'comments', ['id'], unique=False)
