import enum
from datetime import datetime, timezone
from app.extensions import db


class DispatchStatus(str, enum.Enum):
    en_route = "en_route"
    returned = "returned"
    delayed = "delayed"
    cancelled = "cancelled"


class Dispatch(db.Model):
    __tablename__ = "dispatches"

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("requests.id"), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    dispatched_at = db.Column(db.DateTime)
    returned_at = db.Column(db.DateTime)
    status = db.Column(db.Enum(DispatchStatus), nullable=False, default=DispatchStatus.en_route)
    delay_reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = db.Column(db.DateTime, nullable=True, index=True)
    version = db.Column(db.Integer, nullable=False, default=1)

    request = db.relationship("Request", back_populates="dispatch")
    vehicle = db.relationship("Vehicle", back_populates="dispatches")
    driver = db.relationship("User", foreign_keys=[driver_id], back_populates="dispatches")
