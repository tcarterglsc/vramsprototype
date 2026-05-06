from marshmallow import Schema, fields
from .user_schema import UserSchema
from .vehicle_schema import VehicleSchema


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
    status = fields.Str(dump_only=True)
    rejection_reason = fields.Str(dump_only=True)
    vehicle = fields.Nested(VehicleSchema, dump_only=True)
    approved_by = fields.Nested(UserSchema, dump_only=True)
    approved_at = fields.DateTime(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
