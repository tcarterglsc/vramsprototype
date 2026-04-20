import enum
from datetime import datetime, timezone
from app.extensions import db


class UserRole(str, enum.Enum):
    admin = "admin"
    fleet_manager = "fleet_manager"
    requester = "requester"
    driver = "driver"


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.requester)
    department = db.Column(db.String(100))
    phone = db.Column(db.String(30))
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    license_number = db.Column(db.String(50))
    driver_id_code = db.Column(db.String(20))
    total_trips = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    requests = db.relationship("Request", foreign_keys="Request.requester_id", back_populates="requester", lazy="dynamic")
    dispatches = db.relationship("Dispatch", foreign_keys="Dispatch.driver_id", back_populates="driver", lazy="dynamic")

    @property
    def avatar_initials(self):
        parts = self.name.split()
        return (parts[0][0] + parts[-1][0]).upper() if len(parts) >= 2 else self.name[:2].upper()
