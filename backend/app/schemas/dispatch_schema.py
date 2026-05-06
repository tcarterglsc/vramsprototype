from marshmallow import Schema, fields
from .user_schema import UserSchema
from .vehicle_schema import VehicleSchema
from .request_schema import RequestSchema


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
    status = fields.Str(dump_only=True)
    delay_reason = fields.Str()
    created_at = fields.DateTime(dump_only=True)
