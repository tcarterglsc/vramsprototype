from marshmallow import Schema, fields

from app.schemas.user_schemas import UserSchema
from app.schemas.vehicle_schemas import VehicleSchema


class RequestSchema(Schema):
    id = fields.Int(dump_only=True)
    ref = fields.Str(dump_only=True)
    requester_id = fields.Int(load_only=True)
    requester = fields.Nested(UserSchema, dump_only=True)
    destination = fields.Str(required=True)
    purpose = fields.Str()
    booking_type = fields.Str()
    departure_at = fields.DateTime()
    return_at = fields.DateTime()
    priority = fields.Str()
    passenger_count = fields.Int()
    status = fields.Function(
        lambda obj: obj.status.value
        if getattr(obj, "status", None) is not None and hasattr(obj.status, "value")
        else obj.status,
        dump_only=True,
    )
    rejection_reason = fields.Str(dump_only=True)
    vehicle = fields.Nested(VehicleSchema, dump_only=True)
    approved_by = fields.Nested(UserSchema, dump_only=True)
    approved_at = fields.DateTime(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    version = fields.Int(dump_only=True)
    erd = fields.Method("serialize_request_erd", dump_only=True)

    def serialize_request_erd(self, obj):
        from app.domain import erd_projection as ep

        return ep.request_block(obj)
