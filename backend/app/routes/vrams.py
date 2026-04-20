from datetime import datetime, timezone, date as date_type
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from app.extensions import db, bcrypt
from app.models import User, Vehicle, Request, MaintenanceLog, Dispatch, UserRole, VehicleStatus, RequestStatus
from app.models.vehicle import VehicleStatusLog
from app.models.dispatch import DispatchStatus
from app.schemas import (
    UserSchema, VehicleSchema, RequestSchema, MaintenanceLogSchema,
    DispatchSchema, StatusLogSchema
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


# ── Dashboard ────────────────────────────────────────────────────────────────

@vrams_bp.get("/dashboard")
def dashboard():
    today = date_type.today()
    pending = Request.query.filter_by(status=RequestStatus.pending).count()
    available = Vehicle.query.filter_by(status=VehicleStatus.available).count()
    total_vehicles = Vehicle.query.count()
    active_dispatches = Dispatch.query.filter_by(status=DispatchStatus.en_route).count()
    overdue = MaintenanceLog.query.filter(
        MaintenanceLog.next_due_date < today
    ).count()
    blocked = Vehicle.query.filter(
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


# ── Requests ─────────────────────────────────────────────────────────────────

@vrams_bp.get("/requests")
def get_requests():
    q = Request.query
    if s := request.args.get("status"):
        q = q.filter_by(status=s)
    if p := request.args.get("priority"):
        q = q.filter_by(priority=p)
    if search := request.args.get("q"):
        q = q.filter(or_(Request.ref.ilike(f"%{search}%"), Request.destination.ilike(f"%{search}%")))
    q = q.order_by(Request.created_at.desc())
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    result = paginate(q, page, per_page)
    result["items"] = requests_schema.dump(result["items"])
    return jsonify(result)


@vrams_bp.get("/requests/<int:req_id>")
def get_request(req_id):
    r = Request.query.get_or_404(req_id)
    return jsonify(request_schema.dump(r))


@vrams_bp.post("/requests")
def create_request():
    data = request.get_json()
    # Auto-assign requester: use first requester user for demo
    requester = User.query.filter_by(role=UserRole.requester, is_active=True).first()
    if not requester:
        requester = User.query.first()

    import random
    ref = f"REQ-{random.randint(8000, 9999)}"
    while Request.query.filter_by(ref=ref).first():
        ref = f"REQ-{random.randint(8000, 9999)}"

    r = Request(
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
    db.session.add(r)
    db.session.commit()
    return jsonify(request_schema.dump(r)), 201


@vrams_bp.patch("/requests/<int:req_id>/approve")
def approve_request(req_id):
    r = Request.query.get_or_404(req_id)
    admin = User.query.filter_by(role=UserRole.fleet_manager).first() or User.query.first()
    r.status = RequestStatus.approved
    r.approved_by_id = admin.id
    r.approved_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(request_schema.dump(r))


@vrams_bp.patch("/requests/<int:req_id>/reject")
def reject_request(req_id):
    r = Request.query.get_or_404(req_id)
    data = request.get_json()
    admin = User.query.filter_by(role=UserRole.fleet_manager).first() or User.query.first()
    r.status = RequestStatus.rejected
    r.rejection_reason = data.get("reason", "")
    r.rejected_by_id = admin.id
    r.rejected_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(request_schema.dump(r))


# ── Vehicles ─────────────────────────────────────────────────────────────────

@vrams_bp.get("/vehicles")
def get_vehicles():
    q = Vehicle.query
    if s := request.args.get("status"):
        q = q.filter_by(status=s)
    if vt := request.args.get("vehicle_type"):
        q = q.filter_by(vehicle_type=vt)
    if request.args.get("bookable") in ("true", "1"):
        q = q.filter_by(bookable=True)
    if search := request.args.get("q"):
        q = q.filter(or_(Vehicle.plate.ilike(f"%{search}%"), Vehicle.model.ilike(f"%{search}%"), Vehicle.make.ilike(f"%{search}%")))
    q = q.order_by(Vehicle.plate)
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    result = paginate(q, page, per_page)
    result["items"] = vehicles_schema.dump(result["items"])
    return jsonify(result)


@vrams_bp.get("/vehicles/<int:v_id>")
def get_vehicle(v_id):
    v = Vehicle.query.get_or_404(v_id)
    return jsonify(vehicle_schema.dump(v))


@vrams_bp.post("/vehicles")
def create_vehicle():
    data = request.get_json()
    v = Vehicle(
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
    db.session.add(v)
    db.session.commit()
    return jsonify(vehicle_schema.dump(v)), 201


@vrams_bp.patch("/vehicles/<int:v_id>")
def update_vehicle(v_id):
    v = Vehicle.query.get_or_404(v_id)
    data = request.get_json()
    for field in ["make", "model", "year", "vehicle_type", "fuel_type", "transmission",
                  "seating_capacity", "engine_size", "color", "odometer_km", "bookable", "notes"]:
        if field in data:
            setattr(v, field, data[field])
    for date_field in ["fitness_expiry", "insurance_expiry", "next_service_date"]:
        if date_field in data and data[date_field]:
            setattr(v, date_field, date_type.fromisoformat(data[date_field]))
    db.session.commit()
    return jsonify(vehicle_schema.dump(v))


@vrams_bp.patch("/vehicles/<int:v_id>/status")
def update_vehicle_status(v_id):
    v = Vehicle.query.get_or_404(v_id)
    data = request.get_json()
    old_status = v.status
    v.status = data["status"]
    log = VehicleStatusLog(
        vehicle_id=v.id,
        from_status=old_status,
        to_status=data["status"],
        reason=data.get("reason")
    )
    db.session.add(log)
    db.session.commit()
    return jsonify(vehicle_schema.dump(v))


@vrams_bp.get("/vehicles/<int:v_id>/status-logs")
def get_vehicle_status_logs(v_id):
    logs = VehicleStatusLog.query.filter_by(vehicle_id=v_id).order_by(VehicleStatusLog.changed_at.desc()).all()
    return jsonify(status_log_schema.dump(logs))


@vrams_bp.get("/vehicles/<int:v_id>/bookings")
def get_vehicle_bookings(v_id):
    reqs = Request.query.filter_by(vehicle_id=v_id).order_by(Request.departure_at.desc()).all()
    return jsonify(requests_schema.dump(reqs))


@vrams_bp.get("/vehicles/<int:v_id>/maintenance")
def get_vehicle_maintenance(v_id):
    logs = MaintenanceLog.query.filter_by(vehicle_id=v_id).order_by(MaintenanceLog.date_performed.desc()).all()
    return jsonify(maintenances_schema.dump(logs))


# ── Maintenance ───────────────────────────────────────────────────────────────

@vrams_bp.get("/maintenance")
def get_maintenance():
    q = MaintenanceLog.query
    if vid := request.args.get("vehicle_id"):
        q = q.filter_by(vehicle_id=int(vid))
    if st := request.args.get("service_type"):
        q = q.filter_by(service_type=st)
    if df := request.args.get("date_from"):
        q = q.filter(MaintenanceLog.date_performed >= date_type.fromisoformat(df))
    if dt := request.args.get("date_to"):
        q = q.filter(MaintenanceLog.date_performed <= date_type.fromisoformat(dt))
    q = q.order_by(MaintenanceLog.date_performed.desc())
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    result = paginate(q, page, per_page)
    result["items"] = maintenances_schema.dump(result["items"])
    return jsonify(result)


@vrams_bp.post("/maintenance")
def create_maintenance():
    data = request.get_json()
    log = MaintenanceLog(
        vehicle_id=int(data["vehicle_id"]),
        service_type=data["service_type"],
        date_performed=date_type.fromisoformat(data["date_performed"]),
        technician=data["technician"],
        provider_type=data.get("provider_type", "External Provider"),
        cost_kes=data.get("cost_kes"),
        mileage_at_service=data.get("mileage_at_service"),
        next_due_date=date_type.fromisoformat(data["next_due_date"]) if data.get("next_due_date") else None,
        notes=data.get("notes")
    )
    db.session.add(log)
    # Update vehicle's next_service_date
    if log.next_due_date:
        v = Vehicle.query.get(log.vehicle_id)
        if v:
            v.next_service_date = log.next_due_date
    db.session.commit()
    return jsonify(maintenance_schema.dump(log)), 201


# ── Dispatch ──────────────────────────────────────────────────────────────────

@vrams_bp.get("/dispatch/pending")
def dispatch_pending():
    reqs = Request.query.filter_by(status=RequestStatus.approved).order_by(Request.departure_at).all()
    return jsonify(requests_schema.dump(reqs))


@vrams_bp.get("/dispatch/today")
def dispatch_today():
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    dispatches = Dispatch.query.filter(Dispatch.created_at >= today_start).order_by(Dispatch.created_at).all()
    return jsonify(dispatches_schema.dump(dispatches))


@vrams_bp.post("/dispatch/assign")
def assign_dispatch():
    data = request.get_json()
    r = Request.query.get_or_404(int(data["request_id"]))
    v = Vehicle.query.get_or_404(int(data["vehicle_id"]))
    d = Dispatch(
        request_id=r.id,
        vehicle_id=v.id,
        driver_id=int(data["driver_id"]),
        dispatched_at=datetime.now(timezone.utc),
        status=DispatchStatus.en_route
    )
    r.status = RequestStatus.dispatched
    r.vehicle_id = v.id
    v.status = VehicleStatus.dispatched
    db.session.add(d)
    db.session.commit()
    return jsonify(dispatch_schema.dump(d)), 201


@vrams_bp.patch("/dispatch/<int:d_id>/status")
def update_dispatch_status(d_id):
    d = Dispatch.query.get_or_404(d_id)
    data = request.get_json()
    d.status = data["status"]
    if data["status"] == "returned":
        d.returned_at = datetime.now(timezone.utc)
        d.request.status = RequestStatus.completed
        d.vehicle.status = VehicleStatus.available
    if data.get("reason"):
        d.delay_reason = data["reason"]
    db.session.commit()
    return jsonify(dispatch_schema.dump(d))


# ── Users ─────────────────────────────────────────────────────────────────────

@vrams_bp.get("/users/drivers")
def get_drivers():
    drivers = User.query.filter_by(role=UserRole.driver, is_active=True).all()
    return jsonify(users_schema.dump(drivers))


@vrams_bp.get("/users")
def get_users():
    q = User.query
    if role := request.args.get("role"):
        q = q.filter_by(role=role)
    q = q.order_by(User.name)
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    result = paginate(q, page, per_page)
    result["items"] = users_schema.dump(result["items"])
    return jsonify(result)


@vrams_bp.post("/users/invite")
def invite_user():
    data = request.get_json()
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"message": "Email already registered"}), 409
    u = User(
        name=data["name"],
        email=data["email"],
        password_hash=bcrypt.generate_password_hash("Welcome123!").decode("utf-8"),
        role=data.get("role", "requester"),
        is_active=True
    )
    db.session.add(u)
    db.session.commit()
    return jsonify(user_schema.dump(u)), 201


@vrams_bp.patch("/users/<int:u_id>")
def update_user(u_id):
    u = User.query.get_or_404(u_id)
    data = request.get_json()
    if "role" in data:
        u.role = data["role"]
    if "is_active" in data:
        u.is_active = data["is_active"]
    db.session.commit()
    return jsonify(user_schema.dump(u))
