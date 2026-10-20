"""
One-off migration for Assignment 2: adds the MFA columns to the existing
`users` table (db.create_all() never alters tables that already exist).
Safe to run more than once.   Usage:  python migrate_security.py
"""
from sqlalchemy import inspect, text
from app import create_app
from models import db

app = create_app()

with app.app_context():
    cols = {c["name"] for c in inspect(db.engine).get_columns("users")}
    with db.engine.begin() as conn:
        if "totp_secret" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN totp_secret VARCHAR(32) NULL"))
            print("added users.totp_secret")
        if "mfa_enabled" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN NOT NULL DEFAULT 0"))
            print("added users.mfa_enabled")
    print("users table is up to date")
