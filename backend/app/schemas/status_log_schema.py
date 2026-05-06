from marshmallow import Schema, fields
from .user_schema import UserSchema


class StatusLogSchema(Schema):
    id = fields.Int(dump_only=True)
    vehicle_id = fields.Int(dump_only=True)
    changed_by = fields.Nested(UserSchema, dump_only=True)
    from_status = fields.Str(dump_only=True)
    to_status = fields.Str(dump_only=True)
    reason = fields.Str()
    changed_at = fields.DateTime(dump_only=True)
