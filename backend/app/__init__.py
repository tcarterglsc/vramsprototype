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

    # OpenAPI / Flask-Smorest (nglms-style)
    app.config.setdefault("API_TITLE", "VRAMs API")
    app.config.setdefault("API_VERSION", "1.0.0")
    app.config.setdefault("OPENAPI_VERSION", "3.0.3")
    app.config.setdefault("OPENAPI_URL_PREFIX", "/")
    app.config.setdefault("OPENAPI_JSON_PATH", "openapi.json")
    app.config.setdefault("OPENAPI_SWAGGER_UI_PATH", "/swagger-ui")
    app.config.setdefault(
        "OPENAPI_SWAGGER_UI_URL",
        "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/3.24.2/",
    )
    spec = app.config.setdefault("API_SPEC_OPTIONS", {})
    components = spec.setdefault("components", {})
    security_schemes = components.setdefault("securitySchemes", {})
    security_schemes.setdefault(
        "BearerAuth",
        {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"},
    )

    from flask_smorest import Api

    api = Api(app)
    from .controllers import register_vrams_api

    register_vrams_api(api)

    # Ensure upload folder exists
    os.makedirs(app.config.get("UPLOAD_FOLDER", "uploads"), exist_ok=True)

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
