from flask_smorest import Api


def register_vrams_api(api: Api) -> None:
    """Register all Smorest blueprints (VRAMs + auth)."""
    from app.controllers import (
        audit_controller,
        auth_controller,
        dashboard_controller,
        dispatch_controller,
        documents_controller,
        maintenance_controller,
        notifications_controller,
        reports_controller,
        requests_controller,
        settings_controller,
        users_controller,
        vehicles_controller,
    )

    for mod in (
        auth_controller,
        dashboard_controller,
        notifications_controller,
        requests_controller,
        vehicles_controller,
        documents_controller,
        maintenance_controller,
        dispatch_controller,
        settings_controller,
        reports_controller,
        users_controller,
        audit_controller,
    ):
        api.register_blueprint(mod.blp)
