from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.extensions import db, bcrypt
from app.models import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/login")
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get("email"), is_active=True).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, data.get("password", "")):
        return jsonify({"message": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role.value})
    return jsonify({
        "access_token": token,
        "user": {
            "id": str(user.id),
            "displayName": user.name,
            "email": user.email,
            "role": user.role.value,
            "photoURL": "",
            "avatar_initials": user.avatar_initials,
            "department": user.department,
            "shortcuts": [],
            "loginRedirectUrl": "/apps/vrams/dashboard"
        }
    })


@auth_bp.post("/logout")
@jwt_required()
def logout():
    return jsonify({"message": "Logged out"})


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get_or_404(int(user_id))
    return jsonify({
        "id": str(user.id),
        "displayName": user.name,
        "email": user.email,
        "role": user.role.value,
        "photoURL": "",
        "avatar_initials": user.avatar_initials,
        "department": user.department,
        "shortcuts": [],
        "loginRedirectUrl": "/apps/vrams/dashboard"
    })
