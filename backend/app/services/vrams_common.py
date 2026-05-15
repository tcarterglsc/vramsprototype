"""Shared helpers for VRAMS API controllers (pagination, RBAC, audit, notifications)."""

from __future__ import annotations

import json
from functools import wraps

from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity
from itsdangerous import URLSafeTimedSerializer

from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models import AuditLog, Dispatch, MaintenanceLog, OrganizationSettings, Request, User, UserRole, Vehicle, VramsNotification
from app.schemas import (
    DispatchSchema,
    MaintenanceLogSchema,
    OrganizationSettingsSchema,
    RequestSchema,
    StatusLogSchema,
    UserSchema,
    VehicleDocumentSchema,
    VehicleSchema,
    VramsNotificationSchema,
)

user_schema = UserSchema()
users_schema = UserSchema(many=True)
vehicle_schema = VehicleSchema()
vehicles_schema = VehicleSchema(many=True)
request_schema = RequestSchema()
requests_schema = RequestSchema(many=True)
maintenance_schema = MaintenanceLogSchema()
maintenances_schema = MaintenanceLogSchema(many=True)
dispatch_schema = DispatchSchema()
dispatches_schema = DispatchSchema(many=True)
status_log_schema = StatusLogSchema(many=True)
notification_schema = VramsNotificationSchema()
notifications_schema = VramsNotificationSchema(many=True)
org_settings_schema = OrganizationSettingsSchema()

ALLOWED_DOC_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
ALLOWED_DOC_MIMETYPES = {"application/pdf", "image/jpeg", "image/png"}


def paginate(query, page, per_page):
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


def current_user():
    try:
        identity = get_jwt_identity()
    except RuntimeError:
        return None
    if not identity:
        return None
    return User.query.get(int(identity))


def has_role(user, *roles):
    return user and user.role.value in roles


def require_roles(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = current_user()
            if not user:
                return jsonify({"message": "Unauthorized"}), 401
            if roles and not has_role(user, *roles):
                return jsonify({"message": "Forbidden"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def ensure_json():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, (jsonify({"message": "Invalid JSON payload"}), 400)
    return data, None


def require_fields(data, fields):
    missing = [f for f in fields if data.get(f) in (None, "")]
    if missing:
        return jsonify({"message": f"Missing required fields: {', '.join(missing)}"}), 400
    return None


def log_audit(action, entity_type, entity_id=None, details=None):
    details = details or {}
    actor = current_user()
    try:
        log = AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            actor_id=actor.id if actor else None,
            actor_role=actor.role.value if actor else None,
            details_json=json.dumps(details),
        )
        db.session.add(log)
        db.session.commit()
        current_app.logger.info(
            "audit action=%s entity=%s entity_id=%s actor_id=%s actor_role=%s details=%s",
            action,
            entity_type,
            entity_id,
            actor.id if actor else None,
            actor.role.value if actor else None,
            details,
        )
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "failed_to_write_audit action=%s entity=%s entity_id=%s", action, entity_type, entity_id
        )


def invite_serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="vrams-invite")


def active_query(model):
    return model.query.filter(model.deleted_at.is_(None))


def active_or_404(model, entity_id):
    return active_query(model).filter_by(id=entity_id).first_or_404()


def enforce_expected_version(entity, data):
    expected = data.get("expected_version")
    if expected is None:
        return None
    try:
        expected_version = int(expected)
    except (TypeError, ValueError):
        return jsonify({"message": "expected_version must be an integer"}), 400
    if expected_version != entity.version:
        return jsonify({"message": "Conflict: stale entity version", "current_version": entity.version}), 409
    return None


def bump_version(entity):
    entity.version = (entity.version or 0) + 1


def get_organization():
    o = OrganizationSettings.query.get(1)
    if not o:
        o = OrganizationSettings(id=1, name="GL&SC Fleet")
        db.session.add(o)
        db.session.commit()
    return o


def notify_user(user_id, title, body, category="general", link=None):
    if not user_id:
        return
    db.session.add(
        VramsNotification(
            user_id=user_id,
            title=title[:200],
            body=body or "",
            category=category,
            link=(link[:500] if link else None),
        )
    )


def notify_fleet_managers(title, body, category="request", link=None):
    managers = active_query(User).filter(
        User.role.in_([UserRole.fleet_manager, UserRole.admin]),
        User.is_active.is_(True),
    ).all()
    for m in managers:
        notify_user(m.id, title, body, category, link)
