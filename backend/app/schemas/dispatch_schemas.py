from marshmallow import Schema, fields

from app.schemas.request_schemas import RequestSchema
from app.schemas.user_schemas import UserSchema
from app.schemas.vehicle_schemas import VehicleSchema


class DispatchSchema(Schema):
    id = fields.Int(dump_only=True)
    request_id = fields.Int()
    request = fields.Nested(RequestSchema, dump_only=True)
    vehicle_id = fields.Int()
    vehicle = fields.Nested(VehicleSchema, dump_only=True)
    driver_id = fields.Int()
    driver = fields.Nested(UserSchema, dump_only=True)
    dispatched_at = fields.DateTime(dump_only=True)
    returned_at = fields.DateTime(dump_only=True)
    status = fields.Function(
        lambda obj: obj.status.value
        if getattr(obj, "status", None) is not None and hasattr(obj.status, "value")
        else obj.status,
        dump_only=True,
    )
    delay_reason = fields.Str()
    created_at = fields.DateTime(dump_only=True)
    version = fields.Int(dump_only=True)
    erd = fields.Method("serialize_dispatch_erd", dump_only=True)

    def serialize_dispatch_erd(self, obj):
        from app.domain import erd_projection as ep

        return ep.booking_block(obj)
