from datetime import datetime, timezone, date as date_type

from flask import jsonify, request
from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint

from app.extensions import db
from app.models import MaintenanceLog, Vehicle
from app.services import vrams_common as vc

blp = Blueprint("VramsMaintenance", __name__, url_prefix="/api/vrams")


@blp.route("/maintenance")
@jwt_required()
def get_maintenance():
    q = vc.active_query(MaintenanceLog)
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
    result = vc.paginate(q, page, per_page)
    result["items"] = vc.maintenances_schema.dump(result["items"])
    return jsonify(result)


@blp.route("/maintenance/<int:m_id>")
@jwt_required()
def get_maintenance_by_id(m_id):
    log = vc.active_or_404(MaintenanceLog, m_id)
    return jsonify(vc.maintenance_schema.dump(log))


@blp.route("/maintenance", methods=["POST"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def create_maintenance():
    data, error = vc.ensure_json()
    if error:
        return error
    missing_error = vc.require_fields(data, ["vehicle_id", "service_type", "date_performed", "technician"])
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
        logged_by_id=vc.current_user().id,
    )
    db.session.add(log)
    if log.next_due_date:
        v = vc.active_query(Vehicle).filter_by(id=log.vehicle_id).first()
        if v:
            v.next_service_date = log.next_due_date
    db.session.commit()
    vc.log_audit("maintenance_created", "maintenance", log.id, {"vehicle_id": log.vehicle_id})
    return jsonify(vc.maintenance_schema.dump(log)), 201


@blp.route("/maintenance/<int:m_id>", methods=["PATCH"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def update_maintenance(m_id):
    log = vc.active_or_404(MaintenanceLog, m_id)
    data, error = vc.ensure_json()
    if error:
        return error
    version_error = vc.enforce_expected_version(log, data)
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
    vc.bump_version(log)
    db.session.commit()
    vc.log_audit("maintenance_updated", "maintenance", log.id, {"fields": list(data.keys())})
    return jsonify(vc.maintenance_schema.dump(log))


@blp.route("/maintenance/<int:m_id>", methods=["DELETE"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def delete_maintenance(m_id):
    log = vc.active_or_404(MaintenanceLog, m_id)
    log.deleted_at = datetime.now(timezone.utc)
    vc.bump_version(log)
    db.session.commit()
    vc.log_audit("maintenance_deleted", "maintenance", log.id)
    return jsonify({"message": "Maintenance record deleted"})
