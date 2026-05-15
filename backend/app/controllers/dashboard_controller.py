from datetime import date as date_type

from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint
from sqlalchemy import or_

from app.models import Dispatch, MaintenanceLog, Request, Vehicle, VehicleStatus
from app.models.dispatch import DispatchStatus
from app.schemas.dashboard_schemas import DashboardStatsSchema
from app.services import vrams_common as vc

blp = Blueprint("VramsDashboard", __name__, url_prefix="/api/vrams")


@blp.route("/dashboard")
@jwt_required()
@blp.response(200, DashboardStatsSchema)
def dashboard():
    today = date_type.today()
    pending = vc.active_query(Request).filter_by(status="pending").count()
    available = vc.active_query(Vehicle).filter_by(status=VehicleStatus.available).count()
    total_vehicles = vc.active_query(Vehicle).count()
    active_dispatches = vc.active_query(Dispatch).filter_by(status=DispatchStatus.en_route).count()
    overdue = vc.active_query(MaintenanceLog).filter(MaintenanceLog.next_due_date < today).count()
    blocked = vc.active_query(Vehicle).filter(
        or_(Vehicle.fitness_expiry < today, Vehicle.insurance_expiry < today)
    ).count()
    return {
        "pending_requests": pending,
        "vehicles_available": available,
        "vehicles_total": total_vehicles,
        "active_dispatches": active_dispatches,
        "overdue_services": overdue,
        "blocked_vehicles": blocked,
    }
