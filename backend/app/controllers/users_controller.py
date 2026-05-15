import secrets

from flask import current_app, jsonify, request
from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint
from itsdangerous import BadSignature, SignatureExpired

from app.extensions import db, bcrypt
from app.models import User, UserRole
from app.services import vrams_common as vc

blp = Blueprint("VramsUsers", __name__, url_prefix="/api/vrams")


@blp.route("/users/drivers")
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def get_drivers():
    drivers = vc.active_query(User).filter_by(role=UserRole.driver, is_active=True).all()
    return jsonify(vc.users_schema.dump(drivers))


@blp.route("/users")
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def get_users():
    q = vc.active_query(User)
    if role := request.args.get("role"):
        q = q.filter_by(role=role)
    q = q.order_by(User.name)
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    result = vc.paginate(q, page, per_page)
    result["items"] = vc.users_schema.dump(result["items"])
    return jsonify(result)


@blp.route("/users/invite", methods=["POST"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def invite_user():
    data, error = vc.ensure_json()
    if error:
        return error
    missing_error = vc.require_fields(data, ["email", "name"])
    if missing_error:
        return missing_error
    if vc.active_query(User).filter_by(email=data["email"]).first():
        return jsonify({"message": "Email already registered"}), 409
    temp_password = secrets.token_urlsafe(14)
    role_raw = data.get("role", "requester")
    try:
        invite_role = UserRole(role_raw)
    except ValueError:
        return jsonify({"message": "Invalid role"}), 400
    u = User(
        name=data["name"],
        email=data["email"],
        password_hash=bcrypt.generate_password_hash(temp_password).decode("utf-8"),
        role=invite_role,
        is_active=True,
    )
    db.session.add(u)
    db.session.commit()
    invite_token = vc.invite_serializer().dumps({"user_id": u.id, "email": u.email})
    payload = vc.user_schema.dump(u)
    payload["temporary_password"] = temp_password
    payload["invite_token"] = invite_token
    payload["invite_url"] = f"/apps/vrams/accept-invite?token={invite_token}"
    vc.log_audit("user_invited", "user", u.id, {"role": u.role.value})
    return jsonify(payload), 201


@blp.route("/users/<int:u_id>", methods=["PATCH"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def update_user(u_id):
    u = vc.active_or_404(User, u_id)
    data, error = vc.ensure_json()
    if error:
        return error
    if "role" in data:
        try:
            u.role = UserRole(data["role"])
        except ValueError:
            return jsonify({"message": "Invalid role"}), 400
    if "is_active" in data:
        u.is_active = data["is_active"]
    version_error = vc.enforce_expected_version(u, data)
    if version_error:
        return version_error
    vc.bump_version(u)
    db.session.commit()
    vc.log_audit("user_updated", "user", u.id, {"fields": list(data.keys())})
    return jsonify(vc.user_schema.dump(u))


@blp.route("/users/accept-invite", methods=["POST"])
def accept_invite():
    data, error = vc.ensure_json()
    if error:
        return error
    missing_error = vc.require_fields(data, ["token", "password"])
    if missing_error:
        return missing_error
    if len(data["password"]) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400

    max_age = int(current_app.config.get("INVITE_TOKEN_EXPIRES_HOURS", 48)) * 3600
    try:
        payload = vc.invite_serializer().loads(data["token"], max_age=max_age)
    except SignatureExpired:
        return jsonify({"message": "Invite token has expired"}), 400
    except BadSignature:
        return jsonify({"message": "Invalid invite token"}), 400

    user = User.query.get_or_404(int(payload.get("user_id")))
    if user.email != payload.get("email"):
        return jsonify({"message": "Invalid invite token"}), 400

    user.password_hash = bcrypt.generate_password_hash(data["password"]).decode("utf-8")
    vc.bump_version(user)
    db.session.commit()
    vc.log_audit("invite_accepted", "user", user.id)
    return jsonify({"message": "Password set successfully"})
