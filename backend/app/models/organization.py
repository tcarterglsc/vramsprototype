from datetime import datetime, timezone
from app.extensions import db


class OrganizationSettings(db.Model):
    """Single-row fleet branding / contact (id=1)."""

    __tablename__ = "organization_settings"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, default="GL&SC Fleet")
    support_email = db.Column(db.String(255), nullable=True)
    logo_url = db.Column(db.String(500), nullable=True)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
