from datetime import datetime, timezone, date as date_type

from flask import jsonify, request
from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint
from sqlalchemy import or_

from app.extensions import db
from app.models import MaintenanceLog, Request, Vehicle, VehicleStatusLog
from app.models.vehicle import VehicleStatus
from app.services import vrams_common as vc

blp = Blueprint("VramsVehicles", __name__, url_prefix="/api/vrams")


@blp.route("/vehicles")
@jwt_required()
def get_vehicles():
    q = vc.active_query(Vehicle)
    if s := request.args.get("status"):
        q = q.filter_by(status=s)
    if vt := request.args.get("vehicle_type"):
        q = q.filter_by(vehicle_type=vt)
    if request.args.get("bookable") in ("true", "1"):
        q = q.filter_by(bookable=True)
    if search := request.args.get("q"):
        q = q.filter(
            or_(Vehicle.plate.ilike(f"%{search}%"), Vehicle.model.ilike(f"%{search}%"), Vehicle.make.ilike(f"%{search}%"))
        )
    q = q.order_by(Vehicle.plate)
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    result = vc.paginate(q, page, per_page)
    result["items"] = vc.vehicles_schema.dump(result["items"])
    return jsonify(result)


@blp.route("/vehicles/<int:v_id>")
@jwt_required()
def get_vehicle(v_id):
    v = vc.active_or_404(Vehicle, v_id)
    return jsonify(vc.vehicle_schema.dump(v))


@blp.route("/vehicles", methods=["POST"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def create_vehicle():
    data, error = vc.ensure_json()
    if error:
        return error
    missing_error = vc.require_fields(data, ["plate", "make", "model", "year", "vehicle_type"])
    if missing_error:
        return missing_error
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
    vc.log_audit("vehicle_created", "vehicle", v.id, {"plate": v.plate})
    return jsonify(vc.vehicle_schema.dump(v)), 201


@blp.route("/vehicles/<int:v_id>", methods=["PATCH"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def update_vehicle(v_id):
    v = vc.active_or_404(Vehicle, v_id)
    data, error = vc.ensure_json()
    if error:
        return error
    for field in [
        "make",
        "model",
        "year",
        "vehicle_type",
        "fuel_type",
        "transmission",
        "seating_capacity",
        "engine_size",
        "color",
        "odometer_km",
        "bookable",
        "notes",
    ]:
        if field in data:
            setattr(v, field, data[field])
    for date_field in ["fitness_expiry", "insurance_expiry", "next_service_date"]:
        if date_field in data and data[date_field]:
            setattr(v, date_field, date_type.fromisoformat(data[date_field]))
    version_error = vc.enforce_expected_version(v, data)
    if version_error:
        return version_error
    vc.bump_version(v)
    db.session.commit()
    vc.log_audit("vehicle_updated", "vehicle", v.id, {"fields": list(data.keys())})
    return jsonify(vc.vehicle_schema.dump(v))


@blp.route("/vehicles/<int:v_id>", methods=["DELETE"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def delete_vehicle(v_id):
    v = vc.active_or_404(Vehicle, v_id)
    v.deleted_at = datetime.now(timezone.utc)
    vc.bump_version(v)
    db.session.commit()
    vc.log_audit("vehicle_deleted", "vehicle", v.id, {"plate": v.plate})
    return jsonify({"message": "Vehicle deleted"})


@blp.route("/vehicles/<int:v_id>/status", methods=["PATCH"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def update_vehicle_status(v_id):
    v = vc.active_or_404(Vehicle, v_id)
    data, error = vc.ensure_json()
    if error:
        return error
    if not data.get("status"):
        return jsonify({"message": "status is required"}), 400
    version_error = vc.enforce_expected_version(v, data)
    if version_error:
        return version_error
    old_status = v.status
    v.status = data["status"]
    log = VehicleStatusLog(
        vehicle_id=v.id,
        changed_by_id=vc.current_user().id,
        from_status=old_status,
        to_status=data["status"],
        reason=data.get("reason"),
    )
    db.session.add(log)
    vc.bump_version(v)
    db.session.commit()
    vc.log_audit("vehicle_status_changed", "vehicle", v.id, {"from": str(old_status), "to": data["status"]})
    return jsonify(vc.vehicle_schema.dump(v))


@blp.route("/vehicles/<int:v_id>/status-logs")
@jwt_required()
def get_vehicle_status_logs(v_id):
    logs = VehicleStatusLog.query.filter_by(vehicle_id=v_id).order_by(VehicleStatusLog.changed_at.desc()).all()
    return jsonify(vc.status_log_schema.dump(logs))


@blp.route("/vehicles/<int:v_id>/bookings")
@jwt_required()
def get_vehicle_bookings(v_id):
    reqs = vc.active_query(Request).filter_by(vehicle_id=v_id).order_by(Request.departure_at.desc()).all()
    return jsonify(vc.requests_schema.dump(reqs))


@blp.route("/vehicles/<int:v_id>/maintenance")
@jwt_required()
def get_vehicle_maintenance(v_id):
    logs = vc.active_query(MaintenanceLog).filter_by(vehicle_id=v_id).order_by(MaintenanceLog.date_performed.desc()).all()
    return jsonify(vc.maintenances_schema.dump(logs))
