import os
from pathlib import Path
from uuid import uuid4
from flask import Flask, g, request
from flask_cors import CORS
from .extensions import db, migrate, jwt, bcrypt
from config import config_map


def create_app(config_name: str = None) -> Flask:
    config_name = config_name or os.getenv("FLASK_ENV", "development")
    app = Flask(__name__)
    app.config.from_object(config_map.get(config_name, config_map["default"]))

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    CORS(app, origins="*", supports_credentials=False)

    # Ensure upload folder exists
    os.makedirs(app.config.get("UPLOAD_FOLDER", "uploads"), exist_ok=True)

    # Register blueprints
    from .controllers.auth_controller import auth_bp
    from .controllers.vrams_controller import vrams_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(vrams_bp, url_prefix="/api/vrams")

    # Create any missing tables (e.g. after adding models) without wiping data.
    # For SQLite schema changes to existing tables, use migrations or re-seed.
    with app.app_context():
        uri = app.config.get("SQLALCHEMY_DATABASE_URI") or ""
        if uri.startswith("sqlite"):
            path_part = uri.removeprefix("sqlite:///")
            db_path = Path(path_part).expanduser()
            db_path.parent.mkdir(parents=True, exist_ok=True)
        from . import models  # noqa: F401 — register metadata
        db.create_all()

    @app.before_request
    def attach_request_id():
        g.request_id = request.headers.get("X-Request-ID") or uuid4().hex

    @app.after_request
    def add_request_metadata(response):
        response.headers["X-Request-ID"] = getattr(g, "request_id", "")
        app.logger.info(
            "request_id=%s method=%s path=%s status=%s",
            getattr(g, "request_id", "-"),
            request.method,
            request.path,
            response.status_code,
        )
        return response

    return app
