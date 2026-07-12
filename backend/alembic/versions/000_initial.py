"""initial schema

Revision ID: 000
Revises:
Create Date: 2026-07-10
"""
from alembic import op
import sqlalchemy as sa

revision = "000"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.Enum("buyer", "admin", name="userrole"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # platform_connections
    op.create_table(
        "platform_connections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("platform", sa.Enum("meta", "tiktok", "snapchat", name="platform"), nullable=False),
        sa.Column("external_account_id", sa.String(length=255), nullable=False),
        sa.Column("encrypted_access_token", sa.String(length=2048), nullable=False),
        sa.Column("encrypted_refresh_token", sa.String(length=2048), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "platform", name="uq_connection_user_platform"),
    )

    # targets
    op.create_table(
        "targets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("scope", sa.Enum("team", "user", name="targetscope"), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("target_ctr", sa.Float(), nullable=True),
        sa.Column("target_roas", sa.Float(), nullable=True),
        sa.Column("cpa_cap", sa.Float(), nullable=True),
        sa.Column("target_confirmation", sa.Float(), nullable=True),
        sa.Column("target_delivery", sa.Float(), nullable=True),
        sa.Column("target_fulfillment", sa.Float(), nullable=True),
        sa.Column("max_rto", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scope", "user_id", name="uq_targets_scope_user"),
    )

    # ad_insights
    op.create_table(
        "ad_insights",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("platform", sa.Enum("meta", "tiktok", "snapchat", name="platform"), nullable=False),
        sa.Column("campaign", sa.String(length=512), nullable=False),
        sa.Column("product", sa.String(length=512), nullable=False),
        sa.Column("creative", sa.String(length=512), nullable=False),
        sa.Column("funnel_type", sa.String(length=64), nullable=False),
        sa.Column("budget", sa.Float(), nullable=True),
        sa.Column("spend", sa.Float(), nullable=False),
        sa.Column("impressions", sa.Integer(), nullable=False),
        sa.Column("reach", sa.Integer(), nullable=True),
        sa.Column("frequency", sa.Float(), nullable=True),
        sa.Column("link_clicks", sa.Integer(), nullable=False),
        sa.Column("three_sec_views", sa.Integer(), nullable=True),
        sa.Column("landing_page_views", sa.Integer(), nullable=True),
        sa.Column("add_to_cart", sa.Integer(), nullable=True),
        sa.Column("initiate_checkout", sa.Integer(), nullable=True),
        sa.Column("purchases", sa.Integer(), nullable=True),
        sa.Column("revenue", sa.Float(), nullable=True),
        sa.Column("leads", sa.Integer(), nullable=True),
        sa.Column("qualified_leads", sa.Integer(), nullable=True),
        sa.Column("results", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "date", "user_id", "platform", "campaign", "product", "creative", "funnel_type",
            name="uq_insight_grain",
        ),
    )
    op.create_index("ix_ad_insights_date", "ad_insights", ["date"])
    op.create_index("ix_ad_insights_user_id", "ad_insights", ["user_id"])
    op.create_index("ix_ad_insights_platform", "ad_insights", ["platform"])

    # order_funnel_entries
    op.create_table(
        "order_funnel_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("store_or_lp", sa.String(length=512), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("placed_orders", sa.Integer(), nullable=False),
        sa.Column("confirmed_orders", sa.Integer(), nullable=True),
        sa.Column("shipped_orders", sa.Integer(), nullable=True),
        sa.Column("delivered_orders", sa.Integer(), nullable=True),
        sa.Column("cancelled_orders", sa.Integer(), nullable=True),
        sa.Column("basket_value", sa.Float(), nullable=True),
        sa.Column("items", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "date", "user_id", "store_or_lp", "source",
            name="uq_funnel_grain",
        ),
    )
    op.create_index("ix_order_funnel_entries_date", "order_funnel_entries", ["date"])
    op.create_index("ix_order_funnel_entries_user_id", "order_funnel_entries", ["user_id"])


def downgrade() -> None:
    op.drop_table("order_funnel_entries")
    op.drop_table("ad_insights")
    op.drop_table("targets")
    op.drop_table("platform_connections")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS platform")
    op.execute("DROP TYPE IF EXISTS targetscope")
