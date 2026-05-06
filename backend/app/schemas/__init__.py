from .user_schema import UserSchema
from .vehicle_schema import VehicleDocumentSchema, VehicleSchema
from .request_schema import RequestSchema
from .maintenance_schema import MaintenanceLogSchema
from .status_log_schema import StatusLogSchema
from .dispatch_schema import DispatchSchema

__all__ = [
    "UserSchema",
    "VehicleDocumentSchema",
    "VehicleSchema",
    "RequestSchema",
    "MaintenanceLogSchema",
    "StatusLogSchema",
    "DispatchSchema",
]
