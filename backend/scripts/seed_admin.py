"""
Seed an admin account.

Usage (local):
    ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret PYTHONPATH=. python scripts/seed_admin.py

Usage (Fly.io):
    fly ssh console --app taagerdash -C \
        "ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret python scripts/seed_admin.py"

The script is idempotent: if a user with ADMIN_EMAIL already exists it prints a
message and exits 0 without modifying anything.
"""

import asyncio
import os
import sys

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "").strip()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "").strip()
ADMIN_NAME = os.environ.get("ADMIN_NAME", "Admin").strip()


async def seed() -> None:
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        print("ERROR: set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.", file=sys.stderr)
        sys.exit(1)

    async with AsyncSessionLocal() as session:
        existing = await session.scalar(select(User).where(User.email == ADMIN_EMAIL))
        if existing:
            print(f"User '{ADMIN_EMAIL}' already exists (role={existing.role.value}). Nothing to do.")
            return

        admin = User(
            email=ADMIN_EMAIL,
            full_name=ADMIN_NAME,
            hashed_password=hash_password(ADMIN_PASSWORD),
            role=UserRole.admin,
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        print(f"Admin account created: {ADMIN_EMAIL}")


if __name__ == "__main__":
    asyncio.run(seed())
