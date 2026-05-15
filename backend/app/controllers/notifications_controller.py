from datetime import datetime, timezone

from flask import jsonify
from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint
from flask import request

from app.extensions import db
from app.models import VramsNotification
from app.services import vrams_common as vc

blp = Blueprint("VramsNotifications", __name__, url_prefix="/api/vrams")


@blp.route("/notifications")
@jwt_required()
def get_notifications():
    user = vc.current_user()
    q = VramsNotification.query.filter_by(user_id=user.id).order_by(VramsNotification.created_at.desc())
    if request.args.get("unread_only") in ("1", "true", "yes"):
        q = q.filter(VramsNotification.read_at.is_(None))
    page = int(request.args.get("page", 1))
    per_page = min(int(request.args.get("per_page", 20)), 50)
    result = vc.paginate(q, page, per_page)
    result["items"] = vc.notifications_schema.dump(result["items"])
    return jsonify(result)


@blp.route("/notifications/unread-count")
@jwt_required()
def notifications_unread_count():
    user = vc.current_user()
    c = VramsNotification.query.filter_by(user_id=user.id).filter(VramsNotification.read_at.is_(None)).count()
    return jsonify({"count": c})


@blp.route("/notifications/<int:n_id>/read", methods=["PATCH"])
@jwt_required()
def mark_notification_read(n_id):
    user = vc.current_user()
    n = VramsNotification.query.filter_by(id=n_id, user_id=user.id).first_or_404()
    n.read_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(vc.notification_schema.dump(n))


@blp.route("/notifications/mark-all-read", methods=["POST"])
@jwt_required()
def mark_all_notifications_read():
    user = vc.current_user()
    now = datetime.now(timezone.utc)
    VramsNotification.query.filter_by(user_id=user.id).filter(VramsNotification.read_at.is_(None)).update(
        {"read_at": now}, synchronize_session=False
    )
    db.session.commit()
    return jsonify({"message": "ok"})
