import enum
from datetime import datetime, timezone
from app.extensions import db


class RequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    dispatched = "dispatched"
    rejected = "rejected"
    completed = "completed"
    cancelled = "cancelled"


class Request(db.Model):
    __tablename__ = "requests"

    id = db.Column(db.Integer, primary_key=True)
    ref = db.Column(db.String(20), unique=True, nullable=False, index=True)
    requester_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    destination = db.Column(db.String(255), nullable=False)
    purpose = db.Column(db.Text)
    booking_type = db.Column(db.String(20), nullable=False, default="fixed")
    departure_at = db.Column(db.DateTime, nullable=False)
    return_at = db.Column(db.DateTime)
    priority = db.Column(db.String(20), nullable=False, default="normal")
    passenger_count = db.Column(db.Integer, default=1)
    status = db.Column(db.Enum(RequestStatus), nullable=False, default=RequestStatus.pending)
    rejection_reason = db.Column(db.Text)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=True)
    approved_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    approved_at = db.Column(db.DateTime)
    rejected_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    rejected_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    requester = db.relationship("User", foreign_keys=[requester_id], back_populates="requests")
    vehicle = db.relationship("Vehicle", back_populates="requests")
    approved_by = db.relationship("User", foreign_keys=[approved_by_id])
    rejected_by = db.relationship("User", foreign_keys=[rejected_by_id])
    dispatch = db.relationship("Dispatch", back_populates="request", uselist=False)
