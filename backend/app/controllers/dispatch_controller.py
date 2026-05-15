from datetime import datetime, timezone, date as date_type

from flask import jsonify, request
from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint

from app.extensions import db
from app.models import Dispatch, Request, User, UserRole, Vehicle, VehicleStatus
from app.models.dispatch import DispatchStatus
from app.models.request import RequestStatus
from app.services import vrams_common as vc

blp = Blueprint("VramsDispatch", __name__, url_prefix="/api/vrams")


@blp.route("/dispatch/pending")
@jwt_required()
def dispatch_pending():
    reqs = vc.active_query(Request).filter_by(status="approved").order_by(Request.departure_at).all()
    return jsonify(vc.requests_schema.dump(reqs))


@blp.route("/dispatch/today")
@jwt_required()
def dispatch_today():
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    dispatches = vc.active_query(Dispatch).filter(Dispatch.created_at >= today_start).order_by(Dispatch.created_at).all()
    return jsonify(vc.dispatches_schema.dump(dispatches))


@blp.route("/dispatch/assign", methods=["POST"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def assign_dispatch():
    data, error = vc.ensure_json()
    if error:
        return error
    missing_error = vc.require_fields(data, ["request_id", "vehicle_id", "driver_id"])
    if missing_error:
        return missing_error
    r = vc.active_or_404(Request, int(data["request_id"]))
    v = vc.active_or_404(Vehicle, int(data["vehicle_id"]))
    if r.status != RequestStatus.approved:
        return jsonify({"message": "Only approved requests can be dispatched"}), 409
    if r.dispatch:
        return jsonify({"message": "Request already has a dispatch assignment"}), 409
    if v.status != VehicleStatus.available or not v.bookable:
        return jsonify({"message": "Vehicle is not available for dispatch"}), 409
    driver = vc.active_query(User).filter_by(id=int(data["driver_id"])).first_or_404()
    if driver.role != UserRole.driver or not driver.is_active:
        return jsonify({"message": "Driver must be an active driver user"}), 400
    try:
        d = Dispatch(
            request_id=r.id,
            vehicle_id=v.id,
            driver_id=driver.id,
            dispatched_at=datetime.now(timezone.utc),
            status=DispatchStatus.en_route,
        )
        r.status = "dispatched"
        r.vehicle_id = v.id
        v.status = VehicleStatus.dispatched
        db.session.add(d)
        db.session.flush()
        vc.notify_user(
            r.requester_id,
            "Trip dispatched",
            f"Vehicle {v.plate} is en route for {r.destination} ({r.ref}).",
            "dispatch",
            f"/apps/vrams/requests?open={r.id}",
        )
        vc.notify_user(
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
    vc.log_audit("dispatch_assigned", "dispatch", d.id, {"request_id": r.id, "vehicle_id": v.id, "driver_id": driver.id})
    return jsonify(vc.dispatch_schema.dump(d)), 201


@blp.route("/dispatch/<int:d_id>/status", methods=["PATCH"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def update_dispatch_status(d_id):
    d = vc.active_or_404(Dispatch, d_id)
    data, error = vc.ensure_json()
    if error:
        return error
    if not data.get("status"):
        return jsonify({"message": "status is required"}), 400
    version_error = vc.enforce_expected_version(d, data)
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
            vc.notify_user(
                req.requester_id,
                f"Trip {req.ref} completed",
                f"Your trip to {req.destination} is marked complete.",
                "dispatch",
                f"/apps/vrams/requests?open={req.id}",
            )
        if new_status == DispatchStatus.cancelled:
            req = d.request
            vc.notify_user(
                req.requester_id,
                f"Dispatch {req.ref} cancelled",
                "Your scheduled trip dispatch was cancelled. Contact fleet operations if this is unexpected.",
                "dispatch",
                f"/apps/vrams/requests?open={req.id}",
            )
        if new_status == DispatchStatus.delayed and data.get("reason"):
            req = d.request
            vc.notify_user(
                req.requester_id,
                f"Trip {req.ref} delayed",
                f"Reason: {data.get('reason')}",
                "dispatch",
                f"/apps/vrams/requests?open={req.id}",
            )
        if data.get("reason"):
            d.delay_reason = data["reason"]
        vc.bump_version(d)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"message": "Failed to update dispatch status"}), 500
    vc.log_audit("dispatch_status_updated", "dispatch", d.id, {"status": new_status.value, "reason": data.get("reason")})
    return jsonify(vc.dispatch_schema.dump(d))


@blp.route("/dispatch/<int:d_id>", methods=["PATCH"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def update_dispatch(d_id):
    d = vc.active_or_404(Dispatch, d_id)
    data, error = vc.ensure_json()
    if error:
        return error
    version_error = vc.enforce_expected_version(d, data)
    if version_error:
        return version_error

    old_vehicle = d.vehicle
    try:
        if "vehicle_id" in data:
            new_vehicle = vc.active_or_404(Vehicle, int(data["vehicle_id"]))
            if new_vehicle.status != VehicleStatus.available or not new_vehicle.bookable:
                return jsonify({"message": "New vehicle is not available for dispatch"}), 409
            d.vehicle_id = new_vehicle.id
            d.request.vehicle_id = new_vehicle.id
            new_vehicle.status = VehicleStatus.dispatched
            if old_vehicle and old_vehicle.id != new_vehicle.id:
                old_vehicle.status = VehicleStatus.available

        if "driver_id" in data:
            driver = vc.active_query(User).filter_by(id=int(data["driver_id"])).first_or_404()
            if driver.role != UserRole.driver or not driver.is_active:
                return jsonify({"message": "Driver must be an active driver user"}), 400
            d.driver_id = int(data["driver_id"])

        vc.bump_version(d)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"message": "Failed to update dispatch"}), 500
    vc.log_audit("dispatch_updated", "dispatch", d.id, {"fields": list(data.keys())})
    return jsonify(vc.dispatch_schema.dump(d))
