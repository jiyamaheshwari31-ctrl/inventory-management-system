import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///local_dev.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get(
        "JWT_SECRET_KEY", "change-this-secret-in-prod"
    )
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 8

    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {
            "ssl": {
                "ca": "/run/secrets/ca.pem"
            }
        }
    }