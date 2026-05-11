import enum
from datetime import datetime, timezone
from app.extensions import db


class VehicleStatus(str, enum.Enum):
    available = "available"
    in_service = "in_service"
    out_of_service = "out_of_service"
    dispatched = "dispatched"


class Vehicle(db.Model):
    __tablename__ = "vehicles"

    id = db.Column(db.Integer, primary_key=True)
    plate = db.Column(db.String(20), unique=True, nullable=False, index=True)
    vin = db.Column(db.String(17), unique=True)
    make = db.Column(db.String(80), nullable=False)
    model = db.Column(db.String(80), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    vehicle_type = db.Column(db.String(20), nullable=False)
    fuel_type = db.Column(db.String(20))
    transmission = db.Column(db.String(20))
    seating_capacity = db.Column(db.Integer)
    engine_size = db.Column(db.String(30))
    color = db.Column(db.String(30))
    odometer_km = db.Column(db.Integer, default=0)
    status = db.Column(db.Enum(VehicleStatus), nullable=False, default=VehicleStatus.available)
    bookable = db.Column(db.Boolean, default=True, nullable=False)
    notes = db.Column(db.Text)
    fitness_expiry = db.Column(db.Date)
    insurance_expiry = db.Column(db.Date)
    next_service_date = db.Column(db.Date)
    default_driver_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = db.Column(db.DateTime, nullable=True, index=True)
    version = db.Column(db.Integer, nullable=False, default=1)

    default_driver = db.relationship("User", foreign_keys=[default_driver_id])
    documents = db.relationship("VehicleDocument", back_populates="vehicle", cascade="all, delete-orphan")
    maintenance_logs = db.relationship("MaintenanceLog", back_populates="vehicle", lazy="dynamic")
    dispatches = db.relationship("Dispatch", back_populates="vehicle", lazy="dynamic")
    requests = db.relationship("Request", back_populates="vehicle", lazy="dynamic")
    status_logs = db.relationship("VehicleStatusLog", back_populates="vehicle", lazy="dynamic")


class VehicleDocument(db.Model):
    __tablename__ = "vehicle_documents"

    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False)
    doc_type = db.Column(db.String(40), nullable=False)
    file_url = db.Column(db.String(500))
    file_name = db.Column(db.String(255))
    expires_at = db.Column(db.Date)
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    deleted_at = db.Column(db.DateTime, nullable=True, index=True)
    version = db.Column(db.Integer, nullable=False, default=1)

    vehicle = db.relationship("Vehicle", back_populates="documents")
    uploaded_by = db.relationship("User", foreign_keys=[uploaded_by_id])


class VehicleStatusLog(db.Model):
    __tablename__ = "vehicle_status_logs"

    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False)
    changed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    from_status = db.Column(db.Enum(VehicleStatus))
    to_status = db.Column(db.Enum(VehicleStatus), nullable=False)
    reason = db.Column(db.Text)
    changed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    vehicle = db.relationship("Vehicle", back_populates="status_logs")
    changed_by = db.relationship("User", foreign_keys=[changed_by_id])
