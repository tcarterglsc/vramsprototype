from datetime import datetime, timedelta, timezone, date as date_type

from flask import jsonify, request
from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint
from sqlalchemy import or_

from app.models import Dispatch, MaintenanceLog, Request, Vehicle, VehicleDocument
from app.models.request import RequestStatus
from app.schemas import VehicleDocumentSchema
from app.services import vrams_common as vc

blp = Blueprint("VramsReports", __name__, url_prefix="/api/vrams")


@blp.route("/reports/summary")
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
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
        MaintenanceLog.date_performed < end,
    ).all()
    dispatch_rows = Dispatch.query.filter(
        Dispatch.deleted_at.is_(None),
        Dispatch.created_at >= datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc),
        Dispatch.created_at < datetime.combine(end, datetime.min.time(), tzinfo=timezone.utc),
    ).all()
    request_rows = Request.query.filter(
        Request.deleted_at.is_(None),
        Request.created_at >= datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc),
        Request.created_at < datetime.combine(end, datetime.min.time(), tzinfo=timezone.utc),
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


@blp.route("/alerts/operational")
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def operational_alerts():
    today = date_type.today()
    in_30_days = today + timedelta(days=30)
    overdue_services = vc.active_query(MaintenanceLog).filter(MaintenanceLog.next_due_date < today).all()
    expiring_docs = vc.active_query(VehicleDocument).filter(
        VehicleDocument.expires_at.isnot(None),
        VehicleDocument.expires_at <= in_30_days,
    ).all()
    blocked_vehicles = vc.active_query(Vehicle).filter(
        or_(Vehicle.fitness_expiry < today, Vehicle.insurance_expiry < today)
    ).all()
    return jsonify(
        {
            "overdue_services": vc.maintenances_schema.dump(overdue_services),
            "expiring_documents": VehicleDocumentSchema(many=True).dump(expiring_docs),
            "blocked_vehicles": vc.vehicles_schema.dump(blocked_vehicles),
        }
    )
