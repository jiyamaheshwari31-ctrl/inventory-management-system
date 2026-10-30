import os
from dotenv import load_dotenv
from sqlalchemy.engine import make_url

load_dotenv()

def fix_database_url(url):
    if not url or url == "REDACT":
        return url

    parsed = make_url(url)

    # If URL says mysql:// or mysql+mysqldb://,
    # explicitly use PyMySQL instead.
    if parsed.drivername in ("mysql", "mysql+mysqldb"):
        parsed = parsed.set(drivername="mysql+pymysql")

    return parsed.render_as_string(hide_password=False)

class Config:
    # Cloud database URL, e.g. mysql+pymysql://user:pass@host:3306/dbname
    # Falls back to a local SQLite file ONLY for quick local testing.
    # NOTE: Most managed MySQL hosts give you the full connection string
    # (already including any SSL params it needs) when you create the DB —
    # just paste that whole string in as DATABASE_URL, don't retype it by hand.
    SQLALCHEMY_DATABASE_URI = fix_database_url(os.environ.get(
        "DATABASE_URL", "sqlite:///local_dev.db"
    ))
    # .replace("mysql://", "mysql+pymysql://", 1)

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "change-this-secret-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 8  # 8 hours
