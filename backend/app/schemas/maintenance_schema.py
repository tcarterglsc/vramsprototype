from marshmallow import Schema, fields
from .user_schema import UserSchema
from .vehicle_schema import VehicleSchema


class MaintenanceLogSchema(Schema):
    id = fields.Int(dump_only=True)
    vehicle_id = fields.Int(required=True)
    vehicle = fields.Nested(VehicleSchema, dump_only=True)
    service_type = fields.Str(required=True)
    date_performed = fields.Date(required=True)
    mileage_at_service = fields.Int()
    technician = fields.Str(required=True)
    provider_type = fields.Str()
    cost_kes = fields.Decimal(as_string=True)
    next_due_date = fields.Date()
    notes = fields.Str()
    logged_by = fields.Nested(UserSchema, dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    version = fields.Int(dump_only=True)
