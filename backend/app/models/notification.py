from datetime import datetime, timezone
from app.extensions import db


class VramsNotification(db.Model):
    __tablename__ = "vrams_notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(40), nullable=False, default="general", index=True)
    link = db.Column(db.String(500))
    read_at = db.Column(db.DateTime, nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    user = db.relationship("User", foreign_keys=[user_id])
