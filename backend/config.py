import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Cloud database URL, e.g. mysql+pymysql://user:pass@host:3306/dbname
    # Falls back to a local SQLite file ONLY for quick local testing.
    # NOTE: Most managed MySQL hosts give you the full connection string
    # (already including any SSL params it needs) when you create the DB —
    # just paste that whole string in as DATABASE_URL, don't retype it by hand.
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///local_dev.db"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "change-this-secret-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 8  # 8 hours
