from flask import jsonify, request
from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint

from app.extensions import db
from app.services import vrams_common as vc

blp = Blueprint("VramsSettings", __name__, url_prefix="/api/vrams")


@blp.route("/settings/organization")
@jwt_required()
def get_organization_settings():
    if not vc.current_user():
        return jsonify({"message": "Unauthorized"}), 401
    o = vc.get_organization()
    return jsonify(vc.org_settings_schema.dump(o))


@blp.route("/settings/organization", methods=["PATCH"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def patch_organization_settings():
    o = vc.get_organization()
    data, error = vc.ensure_json()
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
    vc.log_audit(
        "organization_settings_updated",
        "organization",
        o.id,
        {k: data.get(k) for k in ("name", "support_email", "logo_url") if k in data},
    )
    return jsonify(vc.org_settings_schema.dump(o))
