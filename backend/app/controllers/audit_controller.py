import json

from flask import jsonify, request
from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint

from app.domain.erd_projection import audit_log_block
from app.models import AuditLog
from app.services import vrams_common as vc

blp = Blueprint("VramsAudit", __name__, url_prefix="/api/vrams")


@blp.route("/audit/logs")
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
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
    result = vc.paginate(q, page, per_page)
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
            "erd": audit_log_block(item),
        }
        for item in result["items"]
    ]
    return jsonify(result)
