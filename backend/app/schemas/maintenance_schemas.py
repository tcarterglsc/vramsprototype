from marshmallow import Schema, fields

from app.schemas.user_schemas import UserSchema
from app.schemas.vehicle_schemas import VehicleSchema


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
    erd = fields.Method("serialize_maintenance_erd", dump_only=True)

    def serialize_maintenance_erd(self, obj):
        from app.domain import erd_projection as ep

        return ep.service_log_block(obj)


class StatusLogSchema(Schema):
    id = fields.Int(dump_only=True)
    vehicle_id = fields.Int(dump_only=True)
    changed_by = fields.Nested(UserSchema, dump_only=True)
    from_status = fields.Function(
        lambda obj: obj.from_status.value
        if getattr(obj, "from_status", None) is not None and hasattr(obj.from_status, "value")
        else obj.from_status,
        dump_only=True,
    )
    to_status = fields.Function(
        lambda obj: obj.to_status.value
        if getattr(obj, "to_status", None) is not None and hasattr(obj.to_status, "value")
        else obj.to_status,
        dump_only=True,
    )
    reason = fields.Str()
    changed_at = fields.DateTime(dump_only=True)
    erd = fields.Method("serialize_status_log_erd", dump_only=True)

    def serialize_status_log_erd(self, obj):
        from app.domain import erd_projection as ep

        return ep.vehicle_status_log_block(obj)
