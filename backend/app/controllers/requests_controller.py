import random
from datetime import datetime, timezone

from flask import jsonify, request
from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint
from sqlalchemy import or_

from app.extensions import db
from app.models import Request, UserRole
from app.models.request import RequestStatus
from app.services import vrams_common as vc

blp = Blueprint("VramsRequests", __name__, url_prefix="/api/vrams")


@blp.route("/requests")
@jwt_required()
def get_requests():
    q = vc.active_query(Request)
    if s := request.args.get("status"):
        q = q.filter_by(status=s)
    if p := request.args.get("priority"):
        q = q.filter_by(priority=p)
    if search := request.args.get("q"):
        q = q.filter(or_(Request.ref.ilike(f"%{search}%"), Request.destination.ilike(f"%{search}%")))
    q = q.order_by(Request.created_at.desc())
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    result = vc.paginate(q, page, per_page)
    result["items"] = vc.requests_schema.dump(result["items"])
    return jsonify(result)


@blp.route("/requests/<int:req_id>")
@jwt_required()
def get_request(req_id):
    r = vc.active_or_404(Request, req_id)
    return jsonify(vc.request_schema.dump(r))


@blp.route("/requests", methods=["POST"])
@jwt_required()
@vc.require_roles("requester", "fleet_manager", "admin")
def create_request():
    data, error = vc.ensure_json()
    if error:
        return error
    missing_error = vc.require_fields(data, ["destination", "departure_at"])
    if missing_error:
        return missing_error
    requester = vc.current_user()

    ref = f"REQ-{random.randint(8000, 9999)}"
    while vc.active_query(Request).filter_by(ref=ref).first():
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
        passenger_count=data.get("passenger_count", 1),
    )
    db.session.add(r)
    db.session.flush()
    vc.notify_fleet_managers(
        "New travel request",
        f"{requester.name} submitted {r.ref} to {r.destination} (priority: {r.priority}).",
        "request",
        f"/apps/vrams/requests?open={r.id}",
    )
    db.session.commit()
    vc.log_audit("request_created", "request", r.id, {"priority": r.priority, "booking_type": r.booking_type})
    return jsonify(vc.request_schema.dump(r)), 201


@blp.route("/requests/<int:req_id>/approve", methods=["PATCH"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def approve_request(req_id):
    r = vc.active_or_404(Request, req_id)
    if r.status != RequestStatus.pending:
        return jsonify({"message": "Only pending requests can be approved"}), 409
    admin = vc.current_user()
    r.status = "approved"
    r.approved_by_id = admin.id
    r.approved_at = datetime.now(timezone.utc)
    vc.notify_user(
        r.requester_id,
        f"Request {r.ref} approved",
        f"Your trip to {r.destination} was approved. A vehicle can now be assigned.",
        "request",
        f"/apps/vrams/requests?open={r.id}",
    )
    db.session.commit()
    vc.log_audit("request_approved", "request", r.id)
    return jsonify(vc.request_schema.dump(r))


@blp.route("/requests/<int:req_id>", methods=["PATCH"])
@jwt_required()
def update_request(req_id):
    r = vc.active_or_404(Request, req_id)
    user = vc.current_user()
    if user.role.value not in ("fleet_manager", "admin") and r.requester_id != user.id:
        return jsonify({"message": "Forbidden"}), 403
    if r.status in (RequestStatus.dispatched, RequestStatus.completed):
        return jsonify({"message": "Dispatched or completed requests cannot be edited"}), 409
    data, error = vc.ensure_json()
    if error:
        return error
    version_error = vc.enforce_expected_version(r, data)
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
    vc.bump_version(r)
    db.session.commit()
    vc.log_audit("request_updated", "request", r.id, {"fields": list(data.keys())})
    return jsonify(vc.request_schema.dump(r))


@blp.route("/requests/<int:req_id>", methods=["DELETE"])
@jwt_required()
def delete_request(req_id):
    r = vc.active_or_404(Request, req_id)
    user = vc.current_user()
    if user.role.value not in ("fleet_manager", "admin") and r.requester_id != user.id:
        return jsonify({"message": "Forbidden"}), 403
    if r.status not in (RequestStatus.pending, RequestStatus.cancelled, RequestStatus.rejected):
        return jsonify({"message": "Only pending/cancelled/rejected requests can be deleted"}), 409
    r.deleted_at = datetime.now(timezone.utc)
    vc.bump_version(r)
    db.session.commit()
    vc.log_audit("request_deleted", "request", r.id)
    return jsonify({"message": "Request deleted"})


@blp.route("/requests/<int:req_id>/reject", methods=["PATCH"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def reject_request(req_id):
    r = vc.active_or_404(Request, req_id)
    if r.status != RequestStatus.pending:
        return jsonify({"message": "Only pending requests can be rejected"}), 409
    data, error = vc.ensure_json()
    if error:
        return error
    admin = vc.current_user()
    r.status = "rejected"
    r.rejection_reason = data.get("reason", "")
    r.rejected_by_id = admin.id
    r.rejected_at = datetime.now(timezone.utc)
    vc.bump_version(r)
    reason_txt = (r.rejection_reason or "").strip() or "No reason provided."
    vc.notify_user(
        r.requester_id,
        f"Request {r.ref} rejected",
        f"Your request to {r.destination} was rejected. Reason: {reason_txt}",
        "request",
        f"/apps/vrams/requests?open={r.id}",
    )
    db.session.commit()
    vc.log_audit("request_rejected", "request", r.id, {"reason": r.rejection_reason})
    return jsonify(vc.request_schema.dump(r))
