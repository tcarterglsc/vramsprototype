"""Marshmallow schemas — split by domain; re-exported for backward compatibility."""

from app.schemas.auth_schemas import (
    AuthUserOutSchema,
    LoginRequestSchema,
    LoginResponseSchema,
    PatchMeSchema,
)
from app.schemas.dashboard_schemas import DashboardStatsSchema, MessageSchema, UnreadCountSchema
from app.schemas.dispatch_schemas import DispatchSchema
from app.schemas.maintenance_schemas import MaintenanceLogSchema, StatusLogSchema
from app.schemas.notification_schemas import VramsNotificationSchema
from app.schemas.organization_schemas import OrganizationSettingsSchema
from app.schemas.request_schemas import RequestSchema
from app.schemas.user_schemas import UserSchema
from app.schemas.vehicle_schemas import VehicleDocumentSchema, VehicleSchema

__all__ = [
    "AuthUserOutSchema",
    "LoginRequestSchema",
    "LoginResponseSchema",
    "PatchMeSchema",
    "DashboardStatsSchema",
    "MessageSchema",
    "UnreadCountSchema",
    "DispatchSchema",
    "MaintenanceLogSchema",
    "StatusLogSchema",
    "VramsNotificationSchema",
    "OrganizationSettingsSchema",
    "RequestSchema",
    "UserSchema",
    "VehicleDocumentSchema",
    "VehicleSchema",
]
