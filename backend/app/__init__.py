import os
from flask import Flask
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

    return app
