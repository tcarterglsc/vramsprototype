import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

# Backend package root (directory containing this file). Used so SQLite is not cwd-dependent.
BACKEND_DIR = os.path.abspath(os.path.dirname(__file__))
INSTANCE_DIR = os.path.join(BACKEND_DIR, "instance")


def _default_sqlite_uri() -> str:
    path = os.path.join(INSTANCE_DIR, "vrams.db")
    abs_norm = os.path.abspath(path).replace("\\", "/")
    return f"sqlite:///{abs_norm}"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    INVITE_TOKEN_EXPIRES_HOURS = int(os.getenv("INVITE_TOKEN_EXPIRES_HOURS", "48"))

    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL") or _default_sqlite_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
