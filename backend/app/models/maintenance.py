from datetime import datetime, timezone
from app.extensions import db


class MaintenanceLog(db.Model):
    __tablename__ = "maintenance_logs"

    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False)
    service_type = db.Column(db.String(60), nullable=False)
    date_performed = db.Column(db.Date, nullable=False)
    mileage_at_service = db.Column(db.Integer)
    technician = db.Column(db.String(120), nullable=False)
    provider_type = db.Column(db.String(50), default="External Provider")
    cost_kes = db.Column(db.Numeric(12, 2))
    next_due_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    receipt_url = db.Column(db.String(500))
    logged_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    vehicle = db.relationship("Vehicle", back_populates="maintenance_logs")
    logged_by = db.relationship("User", foreign_keys=[logged_by_id])
