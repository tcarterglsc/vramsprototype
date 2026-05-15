from flask import jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_smorest import Blueprint
from sqlalchemy import func

from app.extensions import db, bcrypt
from app.models import User
from app.models.user import UserRole
from app.schemas.auth_schemas import LoginResponseSchema

blp = Blueprint("VramsAuth", __name__, url_prefix="/api/auth")


def _auth_user_payload(user: User):
    return {
        "id": str(user.id),
        "displayName": user.name,
        "email": user.email,
        "role": user.role.value,
        "photoURL": "",
        "avatar_initials": user.avatar_initials,
        "department": user.department,
        "phone": user.phone,
        "license_number": user.license_number,
        "driver_id_code": user.driver_id_code,
        "version": user.version,
        "shortcuts": [],
        "loginRedirectUrl": "/apps/vrams/dashboard",
    }


@blp.route("/login", methods=["POST"])
@blp.response(200, LoginResponseSchema)
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email:
        return jsonify({"message": "Invalid credentials"}), 401

    user = (
        User.query.filter(
            func.lower(User.email) == email,
            User.is_active.is_(True),
            User.deleted_at.is_(None),
        ).first()
    )
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"message": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role.value})
    return {"access_token": token, "user": _auth_user_payload(user)}


@blp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    return jsonify({"message": "Logged out"})


@blp.route("/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.filter(User.deleted_at.is_(None)).filter_by(id=int(user_id)).first_or_404()
    return jsonify(_auth_user_payload(user))


@blp.route("/me", methods=["PATCH"])
@jwt_required()
def patch_me():
    user = User.query.filter(User.deleted_at.is_(None)).filter_by(id=int(get_jwt_identity())).first_or_404()
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"message": "Invalid JSON payload"}), 400

    allowed_profile = {"name", "department", "phone", "license_number", "driver_id_code"}
    profile_keys = allowed_profile.intersection(data.keys())
    has_profile = bool(profile_keys)
    pwd_cur = data.get("current_password")
    pwd_new = data.get("new_password")
    has_password = pwd_cur is not None or pwd_new is not None

    if not has_profile and not has_password:
        return jsonify({"message": "No valid fields to update"}), 400

    exp = data.get("expected_version")
    if exp is not None:
        try:
            if int(exp) != user.version:
                return jsonify({"message": "Conflict: stale entity version", "current_version": user.version}), 409
        except (TypeError, ValueError):
            return jsonify({"message": "expected_version must be an integer"}), 400

    if has_password:
        if not pwd_cur or not pwd_new:
            return jsonify({"message": "current_password and new_password are required together"}), 400
        if len(pwd_new) < 8:
            return jsonify({"message": "new_password must be at least 8 characters"}), 400
        if not bcrypt.check_password_hash(user.password_hash, pwd_cur):
            return jsonify({"message": "Current password is incorrect"}), 401
        user.password_hash = bcrypt.generate_password_hash(pwd_new).decode("utf-8")

    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            return jsonify({"message": "name cannot be empty"}), 400
        user.name = name[:120]
    if "department" in data:
        v = data["department"]
        user.department = None if v in (None, "") else str(v).strip()[:100]
    if "phone" in data:
        v = data["phone"]
        user.phone = None if v in (None, "") else str(v).strip()[:30]

    if user.role == UserRole.driver:
        if "license_number" in data:
            v = data["license_number"]
            user.license_number = None if v in (None, "") else str(v).strip()[:50]
        if "driver_id_code" in data:
            v = data["driver_id_code"]
            user.driver_id_code = None if v in (None, "") else str(v).strip()[:20]

    user.version = (user.version or 0) + 1
    db.session.commit()
    return jsonify(_auth_user_payload(user))
