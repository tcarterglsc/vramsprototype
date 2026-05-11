<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
import random
from datetime import datetime, timezone, date as date_type
from flask import Blueprint, request, jsonify
=======
import os
import secrets
import json
from uuid import uuid4
from datetime import datetime, timezone, date as date_type, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify, current_app, send_from_directory
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py
from flask_jwt_extended import jwt_required, get_jwt_identity
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from sqlalchemy import or_
from sqlalchemy.orm import joinedload
from werkzeug.utils import secure_filename
from app.extensions import db, bcrypt
from app.models import User, Vehicle, VehicleDocument, Request, MaintenanceLog, Dispatch, UserRole, VehicleStatus, AuditLog, VramsNotification, OrganizationSettings
from app.models.request import RequestStatus
from app.models.vehicle import VehicleStatusLog
from app.models.dispatch import DispatchStatus
from app.schemas import (
    UserSchema, VehicleSchema, VehicleDocumentSchema, RequestSchema, MaintenanceLogSchema,
    DispatchSchema, StatusLogSchema, VramsNotificationSchema, OrganizationSettingsSchema
)

vrams_bp = Blueprint("vrams", __name__)

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
        "pages": (total + per_page - 1) // per_page
    }


def _current_user():
    try:
        identity = get_jwt_identity()
    except RuntimeError:
        return None
    if not identity:
        return None
    return User.query.get(int(identity))


def _has_role(user, *roles):
    return user and user.role.value in roles


def require_roles(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = _current_user()
            if not user:
                return jsonify({"message": "Unauthorized"}), 401
            if roles and not _has_role(user, *roles):
                return jsonify({"message": "Forbidden"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def _ensure_json():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, (jsonify({"message": "Invalid JSON payload"}), 400)
    return data, None


def _require_fields(data, fields):
    missing = [f for f in fields if data.get(f) in (None, "")]
    if missing:
        return jsonify({"message": f"Missing required fields: {', '.join(missing)}"}), 400
    return None


def _log_audit(action, entity_type, entity_id=None, details=None):
    details = details or {}
    actor = _current_user()
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
        current_app.logger.exception("failed_to_write_audit action=%s entity=%s entity_id=%s", action, entity_type, entity_id)


def _invite_serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="vrams-invite")


def _active_query(model):
    return model.query.filter(model.deleted_at.is_(None))


def _active_or_404(model, entity_id):
    return _active_query(model).filter_by(id=entity_id).first_or_404()


def _enforce_expected_version(entity, data):
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


def _bump_version(entity):
    entity.version = (entity.version or 0) + 1


def _get_organization():
    o = OrganizationSettings.query.get(1)
    if not o:
        o = OrganizationSettings(id=1, name="GL&SC Fleet")
        db.session.add(o)
        db.session.commit()
    return o


def _notify_user(user_id, title, body, category="general", link=None):
    if not user_id:
        return
    db.session.add(VramsNotification(
        user_id=user_id,
        title=title[:200],
        body=body or "",
        category=category,
        link=(link[:500] if link else None),
    ))


def _notify_fleet_managers(title, body, category="request", link=None):
    managers = _active_query(User).filter(
        User.role.in_([UserRole.fleet_manager, UserRole.admin]),
        User.is_active.is_(True)
    ).all()
    for m in managers:
        _notify_user(m.id, title, body, category, link)


# ── Dashboard ────────────────────────────────────────────────────────────────

@vrams_bp.get("/dashboard")
@jwt_required()
def dashboard():
    today = date_type.today()
    pending = _active_query(Request).filter_by(status="pending").count()
    available = _active_query(Vehicle).filter_by(status=VehicleStatus.available).count()
    total_vehicles = _active_query(Vehicle).count()
    active_dispatches = _active_query(Dispatch).filter_by(status=DispatchStatus.en_route).count()
    overdue = _active_query(MaintenanceLog).filter(
        MaintenanceLog.next_due_date < today
    ).count()
    blocked = _active_query(Vehicle).filter(
        or_(
            Vehicle.fitness_expiry < today,
            Vehicle.insurance_expiry < today
        )
    ).count()
    return jsonify({
        "pending_requests": pending,
        "vehicles_available": available,
        "vehicles_total": total_vehicles,
        "active_dispatches": active_dispatches,
        "overdue_services": overdue,
        "blocked_vehicles": blocked
    })


# ── In-app notifications ─────────────────────────────────────────────────────

@vrams_bp.get("/notifications")
@jwt_required()
def get_notifications():
    user = _current_user()
    q = VramsNotification.query.filter_by(user_id=user.id).order_by(VramsNotification.created_at.desc())
    if request.args.get("unread_only") in ("1", "true", "yes"):
        q = q.filter(VramsNotification.read_at.is_(None))
    page = int(request.args.get("page", 1))
    per_page = min(int(request.args.get("per_page", 20)), 50)
    result = paginate(q, page, per_page)
    result["items"] = notifications_schema.dump(result["items"])
    return jsonify(result)


@vrams_bp.get("/notifications/unread-count")
@jwt_required()
def notifications_unread_count():
    user = _current_user()
    c = VramsNotification.query.filter_by(user_id=user.id).filter(VramsNotification.read_at.is_(None)).count()
    return jsonify({"count": c})


@vrams_bp.patch("/notifications/<int:n_id>/read")
@jwt_required()
def mark_notification_read(n_id):
    user = _current_user()
    n = VramsNotification.query.filter_by(id=n_id, user_id=user.id).first_or_404()
    n.read_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(notification_schema.dump(n))


@vrams_bp.post("/notifications/mark-all-read")
@jwt_required()
def mark_all_notifications_read():
    user = _current_user()
    now = datetime.now(timezone.utc)
    VramsNotification.query.filter_by(user_id=user.id).filter(
        VramsNotification.read_at.is_(None)
    ).update({"read_at": now}, synchronize_session=False)
    db.session.commit()
    return jsonify({"message": "ok"})


# ── Requests ─────────────────────────────────────────────────────────────────

@vrams_bp.get("/requests")
@jwt_required()
def get_requests():
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    query = Request.query
    if status := request.args.get("status"):
        query = query.filter_by(status=status)
    if priority := request.args.get("priority"):
        query = query.filter_by(priority=priority)
=======
    q = _active_query(Request)
    if s := request.args.get("status"):
        q = q.filter_by(status=s)
    if p := request.args.get("priority"):
        q = q.filter_by(priority=p)
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py
    if search := request.args.get("q"):
        query = query.filter(or_(Request.ref.ilike(f"%{search}%"), Request.destination.ilike(f"%{search}%")))
    query = query.order_by(Request.created_at.desc())
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    result = paginate(query, page, per_page)
    result["items"] = requests_schema.dump(result["items"])
    return jsonify(result)


@vrams_bp.get("/requests/<int:req_id>")
@jwt_required()
def get_request(req_id):
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    req = Request.query.get_or_404(req_id)
    return jsonify(request_schema.dump(req))
=======
    r = _active_or_404(Request, req_id)
    return jsonify(request_schema.dump(r))
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py


@vrams_bp.post("/requests")
@jwt_required()
@require_roles("requester", "fleet_manager", "admin")
def create_request():
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    data = request.get_json()
    requester = User.query.filter_by(role=UserRole.requester, is_active=True).first()
    if not requester:
        requester = User.query.first()
=======
    data, error = _ensure_json()
    if error:
        return error
    missing_error = _require_fields(data, ["destination", "departure_at"])
    if missing_error:
        return missing_error
    requester = _current_user()
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py

    ref = f"REQ-{random.randint(8000, 9999)}"
    while _active_query(Request).filter_by(ref=ref).first():
        ref = f"REQ-{random.randint(8000, 9999)}"

    req = Request(
        ref=ref,
        requester_id=requester.id,
        destination=data["destination"],
        purpose=data.get("purpose"),
        booking_type=data.get("booking_type", "fixed"),
        departure_at=datetime.fromisoformat(data["departure_at"]),
        return_at=datetime.fromisoformat(data["return_at"]) if data.get("return_at") else None,
        priority=data.get("priority", "normal"),
        passenger_count=data.get("passenger_count", 1)
    )
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    db.session.add(req)
    db.session.commit()
    return jsonify(request_schema.dump(req)), 201
=======
    db.session.add(r)
    db.session.flush()
    _notify_fleet_managers(
        "New travel request",
        f"{requester.name} submitted {r.ref} to {r.destination} (priority: {r.priority}).",
        "request",
        f"/apps/vrams/requests?open={r.id}",
    )
    db.session.commit()
    _log_audit("request_created", "request", r.id, {"priority": r.priority, "booking_type": r.booking_type})
    return jsonify(request_schema.dump(r)), 201
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py


@vrams_bp.patch("/requests/<int:req_id>/approve")
@jwt_required()
@require_roles("fleet_manager", "admin")
def approve_request(req_id):
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    req = Request.query.get_or_404(req_id)
    fleet_manager = User.query.filter_by(role=UserRole.fleet_manager).first() or User.query.first()
    req.status = RequestStatus.approved
    req.approved_by_id = fleet_manager.id
    req.approved_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(request_schema.dump(req))
=======
    r = _active_or_404(Request, req_id)
    if r.status != RequestStatus.pending:
        return jsonify({"message": "Only pending requests can be approved"}), 409
    admin = _current_user()
    r.status = "approved"
    r.approved_by_id = admin.id
    r.approved_at = datetime.now(timezone.utc)
    _notify_user(
        r.requester_id,
        f"Request {r.ref} approved",
        f"Your trip to {r.destination} was approved. A vehicle can now be assigned.",
        "request",
        f"/apps/vrams/requests?open={r.id}",
    )
    db.session.commit()
    _log_audit("request_approved", "request", r.id)
    return jsonify(request_schema.dump(r))
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py


@vrams_bp.patch("/requests/<int:req_id>")
@jwt_required()
def update_request(req_id):
    r = _active_or_404(Request, req_id)
    user = _current_user()
    if user.role.value not in ("fleet_manager", "admin") and r.requester_id != user.id:
        return jsonify({"message": "Forbidden"}), 403
    if r.status in (RequestStatus.dispatched, RequestStatus.completed):
        return jsonify({"message": "Dispatched or completed requests cannot be edited"}), 409
    data, error = _ensure_json()
    if error:
        return error
    version_error = _enforce_expected_version(r, data)
    if version_error:
        return version_error
    updatable = ["destination", "purpose", "booking_type", "priority", "passenger_count"]
    for field in updatable:
        if field in data:
            setattr(r, field, data[field])
    if "departure_at" in data and data["departure_at"]:
        r.departure_at = datetime.fromisoformat(data["departure_at"])
    if "return_at" in data:
        r.return_at = datetime.fromisoformat(data["return_at"]) if data["return_at"] else None
    _bump_version(r)
    db.session.commit()
    _log_audit("request_updated", "request", r.id, {"fields": list(data.keys())})
    return jsonify(request_schema.dump(r))


@vrams_bp.delete("/requests/<int:req_id>")
@jwt_required()
def delete_request(req_id):
    r = _active_or_404(Request, req_id)
    user = _current_user()
    if user.role.value not in ("fleet_manager", "admin") and r.requester_id != user.id:
        return jsonify({"message": "Forbidden"}), 403
    if r.status not in (RequestStatus.pending, RequestStatus.cancelled, RequestStatus.rejected):
        return jsonify({"message": "Only pending/cancelled/rejected requests can be deleted"}), 409
    r.deleted_at = datetime.now(timezone.utc)
    _bump_version(r)
    db.session.commit()
    _log_audit("request_deleted", "request", r.id)
    return jsonify({"message": "Request deleted"})


@vrams_bp.patch("/requests/<int:req_id>/reject")
@jwt_required()
@require_roles("fleet_manager", "admin")
def reject_request(req_id):
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    req = Request.query.get_or_404(req_id)
    data = request.get_json()
    fleet_manager = User.query.filter_by(role=UserRole.fleet_manager).first() or User.query.first()
    req.status = RequestStatus.rejected
    req.rejection_reason = data.get("reason", "")
    req.rejected_by_id = fleet_manager.id
    req.rejected_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(request_schema.dump(req))
=======
    r = _active_or_404(Request, req_id)
    if r.status != RequestStatus.pending:
        return jsonify({"message": "Only pending requests can be rejected"}), 409
    data, error = _ensure_json()
    if error:
        return error
    admin = _current_user()
    r.status = "rejected"
    r.rejection_reason = data.get("reason", "")
    r.rejected_by_id = admin.id
    r.rejected_at = datetime.now(timezone.utc)
    _bump_version(r)
    reason_txt = (r.rejection_reason or "").strip() or "No reason provided."
    _notify_user(
        r.requester_id,
        f"Request {r.ref} rejected",
        f"Your request to {r.destination} was rejected. Reason: {reason_txt}",
        "request",
        f"/apps/vrams/requests?open={r.id}",
    )
    db.session.commit()
    _log_audit("request_rejected", "request", r.id, {"reason": r.rejection_reason})
    return jsonify(request_schema.dump(r))
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py


# ── Vehicles ─────────────────────────────────────────────────────────────────

@vrams_bp.get("/vehicles")
@jwt_required()
def get_vehicles():
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    query = Vehicle.query
    if status := request.args.get("status"):
        query = query.filter_by(status=status)
    if vehicle_type := request.args.get("vehicle_type"):
        query = query.filter_by(vehicle_type=vehicle_type)
=======
    q = _active_query(Vehicle)
    if s := request.args.get("status"):
        q = q.filter_by(status=s)
    if vt := request.args.get("vehicle_type"):
        q = q.filter_by(vehicle_type=vt)
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py
    if request.args.get("bookable") in ("true", "1"):
        query = query.filter_by(bookable=True)
    if search := request.args.get("q"):
        query = query.filter(or_(Vehicle.plate.ilike(f"%{search}%"), Vehicle.model.ilike(f"%{search}%"), Vehicle.make.ilike(f"%{search}%")))
    query = query.order_by(Vehicle.plate)
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    result = paginate(query, page, per_page)
    result["items"] = vehicles_schema.dump(result["items"])
    return jsonify(result)


<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
@vrams_bp.get("/vehicles/<int:vehicle_id>")
def get_vehicle(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    return jsonify(vehicle_schema.dump(vehicle))
=======
@vrams_bp.get("/vehicles/<int:v_id>")
@jwt_required()
def get_vehicle(v_id):
    v = _active_or_404(Vehicle, v_id)
    return jsonify(vehicle_schema.dump(v))
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py


@vrams_bp.post("/vehicles")
@jwt_required()
@require_roles("fleet_manager", "admin")
def create_vehicle():
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    data = request.get_json()
    vehicle = Vehicle(
=======
    data, error = _ensure_json()
    if error:
        return error
    missing_error = _require_fields(data, ["plate", "make", "model", "year", "vehicle_type"])
    if missing_error:
        return missing_error
    v = Vehicle(
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py
        plate=data["plate"].upper(),
        vin=data.get("vin") or None,
        make=data["make"],
        model=data["model"],
        year=int(data["year"]),
        vehicle_type=data["vehicle_type"],
        fuel_type=data.get("fuel_type"),
        transmission=data.get("transmission"),
        seating_capacity=data.get("seating_capacity"),
        engine_size=data.get("engine_size"),
        color=data.get("color"),
        odometer_km=data.get("odometer_km", 0),
        status=data.get("status", "available"),
        bookable=data.get("bookable", True),
        notes=data.get("notes"),
        fitness_expiry=date_type.fromisoformat(data["fitness_expiry"]) if data.get("fitness_expiry") else None,
        insurance_expiry=date_type.fromisoformat(data["insurance_expiry"]) if data.get("insurance_expiry") else None,
        next_service_date=date_type.fromisoformat(data["next_service_date"]) if data.get("next_service_date") else None,
        default_driver_id=data.get("default_driver_id") or None,
    )
    db.session.add(vehicle)
    db.session.commit()
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    return jsonify(vehicle_schema.dump(vehicle)), 201


@vrams_bp.patch("/vehicles/<int:vehicle_id>")
def update_vehicle(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    data = request.get_json()
=======
    _log_audit("vehicle_created", "vehicle", v.id, {"plate": v.plate})
    return jsonify(vehicle_schema.dump(v)), 201


@vrams_bp.patch("/vehicles/<int:v_id>")
@jwt_required()
@require_roles("fleet_manager", "admin")
def update_vehicle(v_id):
    v = _active_or_404(Vehicle, v_id)
    data, error = _ensure_json()
    if error:
        return error
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py
    for field in ["make", "model", "year", "vehicle_type", "fuel_type", "transmission",
                  "seating_capacity", "engine_size", "color", "odometer_km", "bookable", "notes"]:
        if field in data:
            setattr(vehicle, field, data[field])
    for date_field in ["fitness_expiry", "insurance_expiry", "next_service_date"]:
        if date_field in data and data[date_field]:
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
            setattr(vehicle, date_field, date_type.fromisoformat(data[date_field]))
    db.session.commit()
    return jsonify(vehicle_schema.dump(vehicle))


@vrams_bp.patch("/vehicles/<int:vehicle_id>/status")
def update_vehicle_status(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    data = request.get_json()
    old_status = vehicle.status
    vehicle.status = data["status"]
    status_log = VehicleStatusLog(
        vehicle_id=vehicle.id,
=======
            setattr(v, date_field, date_type.fromisoformat(data[date_field]))
    version_error = _enforce_expected_version(v, data)
    if version_error:
        return version_error
    _bump_version(v)
    db.session.commit()
    _log_audit("vehicle_updated", "vehicle", v.id, {"fields": list(data.keys())})
    return jsonify(vehicle_schema.dump(v))


@vrams_bp.delete("/vehicles/<int:v_id>")
@jwt_required()
@require_roles("fleet_manager", "admin")
def delete_vehicle(v_id):
    v = _active_or_404(Vehicle, v_id)
    v.deleted_at = datetime.now(timezone.utc)
    _bump_version(v)
    db.session.commit()
    _log_audit("vehicle_deleted", "vehicle", v.id, {"plate": v.plate})
    return jsonify({"message": "Vehicle deleted"})


@vrams_bp.patch("/vehicles/<int:v_id>/status")
@jwt_required()
@require_roles("fleet_manager", "admin")
def update_vehicle_status(v_id):
    v = _active_or_404(Vehicle, v_id)
    data, error = _ensure_json()
    if error:
        return error
    if not data.get("status"):
        return jsonify({"message": "status is required"}), 400
    version_error = _enforce_expected_version(v, data)
    if version_error:
        return version_error
    old_status = v.status
    v.status = data["status"]
    log = VehicleStatusLog(
        vehicle_id=v.id,
        changed_by_id=_current_user().id,
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py
        from_status=old_status,
        to_status=data["status"],
        reason=data.get("reason")
    )
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    db.session.add(status_log)
    db.session.commit()
    return jsonify(vehicle_schema.dump(vehicle))


@vrams_bp.get("/vehicles/<int:vehicle_id>/status-logs")
def get_vehicle_status_logs(vehicle_id):
    logs = VehicleStatusLog.query.filter_by(vehicle_id=vehicle_id).order_by(VehicleStatusLog.changed_at.desc()).all()
    return jsonify(status_log_schema.dump(logs))


@vrams_bp.get("/vehicles/<int:vehicle_id>/bookings")
def get_vehicle_bookings(vehicle_id):
    bookings = Request.query.filter_by(vehicle_id=vehicle_id).order_by(Request.departure_at.desc()).all()
    return jsonify(requests_schema.dump(bookings))


@vrams_bp.get("/vehicles/<int:vehicle_id>/maintenance")
def get_vehicle_maintenance(vehicle_id):
    logs = MaintenanceLog.query.filter_by(vehicle_id=vehicle_id).order_by(MaintenanceLog.date_performed.desc()).all()
=======
    db.session.add(log)
    _bump_version(v)
    db.session.commit()
    _log_audit("vehicle_status_changed", "vehicle", v.id, {"from": str(old_status), "to": data["status"]})
    return jsonify(vehicle_schema.dump(v))


@vrams_bp.get("/vehicles/<int:v_id>/status-logs")
@jwt_required()
def get_vehicle_status_logs(v_id):
    logs = VehicleStatusLog.query.filter_by(vehicle_id=v_id).order_by(VehicleStatusLog.changed_at.desc()).all()
    return jsonify(status_log_schema.dump(logs))


@vrams_bp.get("/vehicles/<int:v_id>/bookings")
@jwt_required()
def get_vehicle_bookings(v_id):
    reqs = _active_query(Request).filter_by(vehicle_id=v_id).order_by(Request.departure_at.desc()).all()
    return jsonify(requests_schema.dump(reqs))


@vrams_bp.get("/vehicles/<int:v_id>/maintenance")
@jwt_required()
def get_vehicle_maintenance(v_id):
    logs = _active_query(MaintenanceLog).filter_by(vehicle_id=v_id).order_by(MaintenanceLog.date_performed.desc()).all()
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py
    return jsonify(maintenances_schema.dump(logs))


@vrams_bp.get("/documents")
@jwt_required()
def list_fleet_documents():
    """All vehicle documents fleet-wide, optional search (q) on type, file name, plate, make, model."""
    q = (
        _active_query(VehicleDocument)
        .join(Vehicle, VehicleDocument.vehicle_id == Vehicle.id)
        .filter(Vehicle.deleted_at.is_(None))
        .options(joinedload(VehicleDocument.vehicle))
    )
    if term := (request.args.get("q") or "").strip():
        pat = f"%{term}%"
        q = q.filter(
            or_(
                VehicleDocument.doc_type.ilike(pat),
                VehicleDocument.file_name.ilike(pat),
                Vehicle.plate.ilike(pat),
                Vehicle.make.ilike(pat),
                Vehicle.model.ilike(pat),
            )
        )
    docs = q.order_by(VehicleDocument.uploaded_at.desc()).all()
    schema = VehicleDocumentSchema()
    out = []
    for d in docs:
        row = schema.dump(d)
        v = d.vehicle
        row["vehicle"] = {"id": v.id, "plate": v.plate, "make": v.make, "model": v.model}
        out.append(row)
    return jsonify(out)


@vrams_bp.get("/vehicles/<int:v_id>/documents")
@jwt_required()
def get_vehicle_documents(v_id):
    docs = _active_query(VehicleDocument).filter_by(vehicle_id=v_id).order_by(VehicleDocument.uploaded_at.desc()).all()
    return jsonify(VehicleDocumentSchema(many=True).dump(docs))


@vrams_bp.post("/vehicles/<int:v_id>/documents")
@jwt_required()
@require_roles("fleet_manager", "admin")
def upload_vehicle_document(v_id):
    vehicle = _active_or_404(Vehicle, v_id)
    doc_type = request.form.get("doc_type", "other")
    expires_at = request.form.get("expires_at")
    file = request.files.get("file")

    if not file:
        return jsonify({"message": "File is required"}), 400

    original_name = secure_filename(file.filename or "document")
    ext = os.path.splitext(original_name)[1].lower()
    if ext not in ALLOWED_DOC_EXTENSIONS:
        return jsonify({"message": "Unsupported file type"}), 400
    if file.mimetype not in ALLOWED_DOC_MIMETYPES:
        return jsonify({"message": "Unsupported mime type"}), 400
    saved_name = f"{vehicle.id}_{uuid4().hex}{ext}"
    upload_dir = current_app.config.get("UPLOAD_FOLDER")
    save_path = os.path.join(upload_dir, saved_name)
    file.save(save_path)

    doc = VehicleDocument(
        vehicle_id=vehicle.id,
        doc_type=doc_type,
        file_name=original_name,
        file_url=f"/api/vrams/vehicles/{vehicle.id}/documents/{saved_name}/download",
        expires_at=date_type.fromisoformat(expires_at) if expires_at else None,
        uploaded_by_id=_current_user().id,
    )
    db.session.add(doc)
    db.session.commit()
    _log_audit("vehicle_document_uploaded", "vehicle_document", doc.id, {"vehicle_id": vehicle.id, "doc_type": doc_type})
    return jsonify(VehicleDocumentSchema().dump(doc)), 201


@vrams_bp.get("/vehicles/<int:v_id>/documents/<path:file_name>/download")
@jwt_required()
def download_vehicle_document(v_id, file_name):
    _active_or_404(Vehicle, v_id)
    doc = _active_query(VehicleDocument).filter_by(vehicle_id=v_id).filter(VehicleDocument.file_url.ilike(f"%/{file_name}/download")).first()
    if not doc:
        return jsonify({"message": "Document not found"}), 404
    return send_from_directory(current_app.config.get("UPLOAD_FOLDER"), file_name, as_attachment=True)


# ── Maintenance ───────────────────────────────────────────────────────────────

@vrams_bp.get("/maintenance")
@jwt_required()
def get_maintenance():
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    query = MaintenanceLog.query
    if vehicle_id := request.args.get("vehicle_id"):
        query = query.filter_by(vehicle_id=int(vehicle_id))
    if service_type := request.args.get("service_type"):
        query = query.filter_by(service_type=service_type)
    if date_from := request.args.get("date_from"):
        query = query.filter(MaintenanceLog.date_performed >= date_type.fromisoformat(date_from))
    if date_to := request.args.get("date_to"):
        query = query.filter(MaintenanceLog.date_performed <= date_type.fromisoformat(date_to))
    query = query.order_by(MaintenanceLog.date_performed.desc())
=======
    q = _active_query(MaintenanceLog)
    if vid := request.args.get("vehicle_id"):
        q = q.filter_by(vehicle_id=int(vid))
    if st := request.args.get("service_type"):
        q = q.filter_by(service_type=st)
    if df := request.args.get("date_from"):
        q = q.filter(MaintenanceLog.date_performed >= date_type.fromisoformat(df))
    if dt := request.args.get("date_to"):
        q = q.filter(MaintenanceLog.date_performed <= date_type.fromisoformat(dt))
    q = q.order_by(MaintenanceLog.date_performed.desc())
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    result = paginate(query, page, per_page)
    result["items"] = maintenances_schema.dump(result["items"])
    return jsonify(result)


@vrams_bp.get("/maintenance/<int:m_id>")
@jwt_required()
def get_maintenance_by_id(m_id):
    log = _active_or_404(MaintenanceLog, m_id)
    return jsonify(maintenance_schema.dump(log))


@vrams_bp.post("/maintenance")
@jwt_required()
@require_roles("fleet_manager", "admin")
def create_maintenance():
    data, error = _ensure_json()
    if error:
        return error
    missing_error = _require_fields(data, ["vehicle_id", "service_type", "date_performed", "technician"])
    if missing_error:
        return missing_error
    log = MaintenanceLog(
        vehicle_id=int(data["vehicle_id"]),
        service_type=data["service_type"],
        date_performed=date_type.fromisoformat(data["date_performed"]),
        technician=data["technician"],
        provider_type=data.get("provider_type", "External Provider"),
        cost_kes=data.get("cost_kes"),
        mileage_at_service=data.get("mileage_at_service"),
        next_due_date=date_type.fromisoformat(data["next_due_date"]) if data.get("next_due_date") else None,
        notes=data.get("notes"),
        logged_by_id=_current_user().id
    )
    db.session.add(log)
    if log.next_due_date:
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
        vehicle = Vehicle.query.get(log.vehicle_id)
        if vehicle:
            vehicle.next_service_date = log.next_due_date
=======
        v = _active_query(Vehicle).filter_by(id=log.vehicle_id).first()
        if v:
            v.next_service_date = log.next_due_date
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py
    db.session.commit()
    _log_audit("maintenance_created", "maintenance", log.id, {"vehicle_id": log.vehicle_id})
    return jsonify(maintenance_schema.dump(log)), 201


@vrams_bp.patch("/maintenance/<int:m_id>")
@jwt_required()
@require_roles("fleet_manager", "admin")
def update_maintenance(m_id):
    log = _active_or_404(MaintenanceLog, m_id)
    data, error = _ensure_json()
    if error:
        return error
    version_error = _enforce_expected_version(log, data)
    if version_error:
        return version_error
    if "vehicle_id" in data and data["vehicle_id"]:
        log.vehicle_id = int(data["vehicle_id"])
    for field in ["service_type", "technician", "provider_type", "cost_kes", "mileage_at_service", "notes"]:
        if field in data:
            setattr(log, field, data[field])
    if "date_performed" in data and data["date_performed"]:
        log.date_performed = date_type.fromisoformat(data["date_performed"])
    if "next_due_date" in data:
        log.next_due_date = date_type.fromisoformat(data["next_due_date"]) if data["next_due_date"] else None
    _bump_version(log)
    db.session.commit()
    _log_audit("maintenance_updated", "maintenance", log.id, {"fields": list(data.keys())})
    return jsonify(maintenance_schema.dump(log))


@vrams_bp.delete("/maintenance/<int:m_id>")
@jwt_required()
@require_roles("fleet_manager", "admin")
def delete_maintenance(m_id):
    log = _active_or_404(MaintenanceLog, m_id)
    log.deleted_at = datetime.now(timezone.utc)
    _bump_version(log)
    db.session.commit()
    _log_audit("maintenance_deleted", "maintenance", log.id)
    return jsonify({"message": "Maintenance record deleted"})


# ── Dispatch ──────────────────────────────────────────────────────────────────

@vrams_bp.get("/dispatch/pending")
@jwt_required()
def dispatch_pending():
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    pending_requests = Request.query.filter_by(status=RequestStatus.approved).order_by(Request.departure_at).all()
    return jsonify(requests_schema.dump(pending_requests))
=======
    reqs = _active_query(Request).filter_by(status="approved").order_by(Request.departure_at).all()
    return jsonify(requests_schema.dump(reqs))
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py


@vrams_bp.get("/dispatch/today")
@jwt_required()
def dispatch_today():
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    todays_dispatches = Dispatch.query.filter(Dispatch.created_at >= today_start).order_by(Dispatch.created_at).all()
    return jsonify(dispatches_schema.dump(todays_dispatches))
=======
    dispatches = _active_query(Dispatch).filter(Dispatch.created_at >= today_start).order_by(Dispatch.created_at).all()
    return jsonify(dispatches_schema.dump(dispatches))
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py


@vrams_bp.post("/dispatch/assign")
@jwt_required()
@require_roles("fleet_manager", "admin")
def assign_dispatch():
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    data = request.get_json()
    req = Request.query.get_or_404(int(data["request_id"]))
    vehicle = Vehicle.query.get_or_404(int(data["vehicle_id"]))
    dispatch = Dispatch(
        request_id=req.id,
        vehicle_id=vehicle.id,
        driver_id=int(data["driver_id"]),
        dispatched_at=datetime.now(timezone.utc),
        status=DispatchStatus.en_route
    )
    req.status = RequestStatus.dispatched
    req.vehicle_id = vehicle.id
    vehicle.status = VehicleStatus.dispatched
    db.session.add(dispatch)
    db.session.commit()
    return jsonify(dispatch_schema.dump(dispatch)), 201


@vrams_bp.patch("/dispatch/<int:dispatch_id>/status")
def update_dispatch_status(dispatch_id):
    dispatch = Dispatch.query.get_or_404(dispatch_id)
    data = request.get_json()
    dispatch.status = data["status"]
    if data["status"] == "returned":
        dispatch.returned_at = datetime.now(timezone.utc)
        dispatch.request.status = RequestStatus.completed
        dispatch.vehicle.status = VehicleStatus.available
    if data.get("reason"):
        dispatch.delay_reason = data["reason"]
    db.session.commit()
    return jsonify(dispatch_schema.dump(dispatch))
=======
    data, error = _ensure_json()
    if error:
        return error
    missing_error = _require_fields(data, ["request_id", "vehicle_id", "driver_id"])
    if missing_error:
        return missing_error
    r = _active_or_404(Request, int(data["request_id"]))
    v = _active_or_404(Vehicle, int(data["vehicle_id"]))
    if r.status != RequestStatus.approved:
        return jsonify({"message": "Only approved requests can be dispatched"}), 409
    if r.dispatch:
        return jsonify({"message": "Request already has a dispatch assignment"}), 409
    if v.status != VehicleStatus.available or not v.bookable:
        return jsonify({"message": "Vehicle is not available for dispatch"}), 409
    driver = _active_query(User).filter_by(id=int(data["driver_id"])).first_or_404()
    if driver.role != UserRole.driver or not driver.is_active:
        return jsonify({"message": "Driver must be an active driver user"}), 400
    try:
        d = Dispatch(
            request_id=r.id,
            vehicle_id=v.id,
            driver_id=driver.id,
            dispatched_at=datetime.now(timezone.utc),
            status=DispatchStatus.en_route
        )
        r.status = "dispatched"
        r.vehicle_id = v.id
        v.status = VehicleStatus.dispatched
        db.session.add(d)
        db.session.flush()
        _notify_user(
            r.requester_id,
            "Trip dispatched",
            f"Vehicle {v.plate} is en route for {r.destination} ({r.ref}).",
            "dispatch",
            f"/apps/vrams/requests?open={r.id}",
        )
        _notify_user(
            driver.id,
            "New trip assigned",
            f"{r.ref}: {r.destination} · vehicle {v.plate}",
            "dispatch",
            "/apps/vrams/dispatch",
        )
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"message": "Failed to assign dispatch"}), 500
    _log_audit("dispatch_assigned", "dispatch", d.id, {"request_id": r.id, "vehicle_id": v.id, "driver_id": driver.id})
    return jsonify(dispatch_schema.dump(d)), 201


@vrams_bp.patch("/dispatch/<int:d_id>/status")
@jwt_required()
@require_roles("fleet_manager", "admin")
def update_dispatch_status(d_id):
    d = _active_or_404(Dispatch, d_id)
    data, error = _ensure_json()
    if error:
        return error
    if not data.get("status"):
        return jsonify({"message": "status is required"}), 400
    version_error = _enforce_expected_version(d, data)
    if version_error:
        return version_error
    try:
        new_status = DispatchStatus(data["status"])
    except ValueError:
        return jsonify({"message": "Invalid dispatch status"}), 400
    valid_transitions = {
        DispatchStatus.en_route: {DispatchStatus.delayed, DispatchStatus.returned, DispatchStatus.cancelled},
        DispatchStatus.delayed: {DispatchStatus.returned, DispatchStatus.cancelled},
        DispatchStatus.returned: set(),
        DispatchStatus.cancelled: set(),
    }
    if new_status not in valid_transitions.get(d.status, set()):
        return jsonify({"message": "Invalid dispatch status transition"}), 409
    try:
        d.status = new_status
        if new_status == DispatchStatus.returned:
            d.returned_at = datetime.now(timezone.utc)
            d.request.status = "completed"
            d.vehicle.status = VehicleStatus.available
            req = d.request
            _notify_user(
                req.requester_id,
                f"Trip {req.ref} completed",
                f"Your trip to {req.destination} is marked complete.",
                "dispatch",
                f"/apps/vrams/requests?open={req.id}",
            )
        if new_status == DispatchStatus.cancelled:
            req = d.request
            _notify_user(
                req.requester_id,
                f"Dispatch {req.ref} cancelled",
                "Your scheduled trip dispatch was cancelled. Contact fleet operations if this is unexpected.",
                "dispatch",
                f"/apps/vrams/requests?open={req.id}",
            )
        if new_status == DispatchStatus.delayed and data.get("reason"):
            req = d.request
            _notify_user(
                req.requester_id,
                f"Trip {req.ref} delayed",
                f"Reason: {data.get('reason')}",
                "dispatch",
                f"/apps/vrams/requests?open={req.id}",
            )
        if data.get("reason"):
            d.delay_reason = data["reason"]
        _bump_version(d)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"message": "Failed to update dispatch status"}), 500
    _log_audit("dispatch_status_updated", "dispatch", d.id, {"status": new_status.value, "reason": data.get("reason")})
    return jsonify(dispatch_schema.dump(d))
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py


@vrams_bp.patch("/dispatch/<int:d_id>")
@jwt_required()
@require_roles("fleet_manager", "admin")
def update_dispatch(d_id):
    d = _active_or_404(Dispatch, d_id)
    data, error = _ensure_json()
    if error:
        return error
    version_error = _enforce_expected_version(d, data)
    if version_error:
        return version_error

    old_vehicle = d.vehicle
    try:
        if "vehicle_id" in data:
            new_vehicle = _active_or_404(Vehicle, int(data["vehicle_id"]))
            if new_vehicle.status != VehicleStatus.available or not new_vehicle.bookable:
                return jsonify({"message": "New vehicle is not available for dispatch"}), 409
            d.vehicle_id = new_vehicle.id
            d.request.vehicle_id = new_vehicle.id
            new_vehicle.status = VehicleStatus.dispatched
            if old_vehicle and old_vehicle.id != new_vehicle.id:
                old_vehicle.status = VehicleStatus.available

        if "driver_id" in data:
            driver = _active_query(User).filter_by(id=int(data["driver_id"])).first_or_404()
            if driver.role != UserRole.driver or not driver.is_active:
                return jsonify({"message": "Driver must be an active driver user"}), 400
            d.driver_id = int(data["driver_id"])

        _bump_version(d)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"message": "Failed to update dispatch"}), 500
    _log_audit("dispatch_updated", "dispatch", d.id, {"fields": list(data.keys())})
    return jsonify(dispatch_schema.dump(d))


# ── Settings ──────────────────────────────────────────────────────────────────

@vrams_bp.get("/settings/organization")
@jwt_required()
def get_organization_settings():
    if not _current_user():
        return jsonify({"message": "Unauthorized"}), 401
    o = _get_organization()
    return jsonify(org_settings_schema.dump(o))


@vrams_bp.patch("/settings/organization")
@jwt_required()
@require_roles("fleet_manager", "admin")
def patch_organization_settings():
    o = _get_organization()
    data, error = _ensure_json()
    if error:
        return error
    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"message": "name cannot be empty"}), 400
        o.name = name[:200]
    if "support_email" in data:
        v = data.get("support_email")
        o.support_email = None if v in (None, "") else str(v).strip()[:255]
    if "logo_url" in data:
        v = data.get("logo_url")
        o.logo_url = None if v in (None, "") else str(v).strip()[:500]
    db.session.commit()
    _log_audit("organization_settings_updated", "organization", o.id, {k: data.get(k) for k in ("name", "support_email", "logo_url") if k in data})
    return jsonify(org_settings_schema.dump(o))


# ── Users ─────────────────────────────────────────────────────────────────────

@vrams_bp.get("/reports/summary")
@jwt_required()
@require_roles("fleet_manager", "admin")
def report_summary():
    month = request.args.get("month")
    if month:
        try:
            start = datetime.strptime(month, "%Y-%m").date().replace(day=1)
        except ValueError:
            return jsonify({"message": "month must be YYYY-MM"}), 400
    else:
        today = date_type.today()
        start = today.replace(day=1)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1, day=1)
    else:
        end = start.replace(month=start.month + 1, day=1)

    maintenance_rows = MaintenanceLog.query.filter(
        MaintenanceLog.deleted_at.is_(None),
        MaintenanceLog.date_performed >= start,
        MaintenanceLog.date_performed < end
    ).all()
    dispatch_rows = Dispatch.query.filter(
        Dispatch.deleted_at.is_(None),
        Dispatch.created_at >= datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc),
        Dispatch.created_at < datetime.combine(end, datetime.min.time(), tzinfo=timezone.utc)
    ).all()
    request_rows = Request.query.filter(
        Request.deleted_at.is_(None),
        Request.created_at >= datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc),
        Request.created_at < datetime.combine(end, datetime.min.time(), tzinfo=timezone.utc)
    ).all()

    total_maintenance_cost = float(sum([(row.cost_kes or 0) for row in maintenance_rows]))
    payload = {
        "month": start.strftime("%Y-%m"),
        "request_volume": len(request_rows),
        "requests_completed": len([r for r in request_rows if r.status == RequestStatus.completed]),
        "dispatch_volume": len(dispatch_rows),
        "maintenance_jobs": len(maintenance_rows),
        "maintenance_cost_kes": total_maintenance_cost,
    }
    return jsonify(payload)


@vrams_bp.get("/alerts/operational")
@jwt_required()
@require_roles("fleet_manager", "admin")
def operational_alerts():
    today = date_type.today()
    in_30_days = today + timedelta(days=30)
    overdue_services = _active_query(MaintenanceLog).filter(MaintenanceLog.next_due_date < today).all()
    expiring_docs = _active_query(VehicleDocument).filter(
        VehicleDocument.expires_at.isnot(None),
        VehicleDocument.expires_at <= in_30_days
    ).all()
    blocked_vehicles = _active_query(Vehicle).filter(
        or_(
            Vehicle.fitness_expiry < today,
            Vehicle.insurance_expiry < today
        )
    ).all()
    return jsonify({
        "overdue_services": maintenances_schema.dump(overdue_services),
        "expiring_documents": VehicleDocumentSchema(many=True).dump(expiring_docs),
        "blocked_vehicles": vehicles_schema.dump(blocked_vehicles),
    })

@vrams_bp.get("/users/drivers")
@jwt_required()
@require_roles("fleet_manager", "admin")
def get_drivers():
    drivers = _active_query(User).filter_by(role=UserRole.driver, is_active=True).all()
    return jsonify(users_schema.dump(drivers))


@vrams_bp.get("/users")
@jwt_required()
@require_roles("fleet_manager", "admin")
def get_users():
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    query = User.query
=======
    q = _active_query(User)
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py
    if role := request.args.get("role"):
        query = query.filter_by(role=role)
    query = query.order_by(User.name)
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    result = paginate(query, page, per_page)
    result["items"] = users_schema.dump(result["items"])
    return jsonify(result)


@vrams_bp.post("/users/invite")
@jwt_required()
@require_roles("fleet_manager", "admin")
def invite_user():
    data, error = _ensure_json()
    if error:
        return error
    missing_error = _require_fields(data, ["email", "name"])
    if missing_error:
        return missing_error
    if _active_query(User).filter_by(email=data["email"]).first():
        return jsonify({"message": "Email already registered"}), 409
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    user = User(
=======
    temp_password = secrets.token_urlsafe(14)
    role_raw = data.get("role", "requester")
    try:
        invite_role = UserRole(role_raw)
    except ValueError:
        return jsonify({"message": "Invalid role"}), 400
    u = User(
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py
        name=data["name"],
        email=data["email"],
        password_hash=bcrypt.generate_password_hash(temp_password).decode("utf-8"),
        role=invite_role,
        is_active=True
    )
    db.session.add(user)
    db.session.commit()
<<<<<<< HEAD:backend/app/controllers/vrams_controller.py
    return jsonify(user_schema.dump(user)), 201


@vrams_bp.patch("/users/<int:user_id>")
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    if "role" in data:
        user.role = data["role"]
    if "is_active" in data:
        user.is_active = data["is_active"]
    db.session.commit()
    return jsonify(user_schema.dump(user))
=======
    invite_token = _invite_serializer().dumps({"user_id": u.id, "email": u.email})
    payload = user_schema.dump(u)
    payload["temporary_password"] = temp_password
    payload["invite_token"] = invite_token
    payload["invite_url"] = f"/apps/vrams/accept-invite?token={invite_token}"
    _log_audit("user_invited", "user", u.id, {"role": u.role.value})
    return jsonify(payload), 201


@vrams_bp.patch("/users/<int:u_id>")
@jwt_required()
@require_roles("fleet_manager", "admin")
def update_user(u_id):
    u = _active_or_404(User, u_id)
    data, error = _ensure_json()
    if error:
        return error
    if "role" in data:
        try:
            u.role = UserRole(data["role"])
        except ValueError:
            return jsonify({"message": "Invalid role"}), 400
    if "is_active" in data:
        u.is_active = data["is_active"]
    version_error = _enforce_expected_version(u, data)
    if version_error:
        return version_error
    _bump_version(u)
    db.session.commit()
    _log_audit("user_updated", "user", u.id, {"fields": list(data.keys())})
    return jsonify(user_schema.dump(u))


@vrams_bp.post("/users/accept-invite")
def accept_invite():
    data, error = _ensure_json()
    if error:
        return error
    missing_error = _require_fields(data, ["token", "password"])
    if missing_error:
        return missing_error
    if len(data["password"]) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400

    max_age = int(current_app.config.get("INVITE_TOKEN_EXPIRES_HOURS", 48)) * 3600
    try:
        payload = _invite_serializer().loads(data["token"], max_age=max_age)
    except SignatureExpired:
        return jsonify({"message": "Invite token has expired"}), 400
    except BadSignature:
        return jsonify({"message": "Invalid invite token"}), 400

    user = User.query.get_or_404(int(payload.get("user_id")))
    if user.email != payload.get("email"):
        return jsonify({"message": "Invalid invite token"}), 400

    user.password_hash = bcrypt.generate_password_hash(data["password"]).decode("utf-8")
    _bump_version(user)
    db.session.commit()
    _log_audit("invite_accepted", "user", user.id)
    return jsonify({"message": "Password set successfully"})


@vrams_bp.get("/audit/logs")
@jwt_required()
@require_roles("fleet_manager", "admin")
def get_audit_logs():
    page = int(request.args.get("page", 1))
    per_page = min(int(request.args.get("per_page", 50)), 100)
    q = AuditLog.query.order_by(AuditLog.created_at.desc())
    if action := request.args.get("action"):
        q = q.filter_by(action=action)
    if entity_type := request.args.get("entity_type"):
        q = q.filter_by(entity_type=entity_type)
    if actor_id := request.args.get("actor_id"):
        q = q.filter_by(actor_id=int(actor_id))
    result = paginate(q, page, per_page)
    result["items"] = [
        {
            "id": item.id,
            "action": item.action,
            "entity_type": item.entity_type,
            "entity_id": item.entity_id,
            "actor_id": item.actor_id,
            "actor_role": item.actor_role,
            "details": json.loads(item.details_json or "{}"),
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in result["items"]
    ]
    return jsonify(result)
>>>>>>> afd6c898f19ded5417852c8b6200ff9f7017512b:backend/app/routes/vrams.py
