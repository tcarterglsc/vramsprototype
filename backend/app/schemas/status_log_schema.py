from marshmallow import Schema, fields
from .user_schema import UserSchema


class StatusLogSchema(Schema):
    id = fields.Int(dump_only=True)
    vehicle_id = fields.Int(dump_only=True)
    changed_by = fields.Nested(UserSchema, dump_only=True)
    from_status = fields.Function(lambda obj: obj.from_status.value if getattr(obj, "from_status", None) is not None and hasattr(obj.from_status, "value") else obj.from_status, dump_only=True)
    to_status = fields.Function(lambda obj: obj.to_status.value if getattr(obj, "to_status", None) is not None and hasattr(obj.to_status, "value") else obj.to_status, dump_only=True)
    reason = fields.Str()
    changed_at = fields.DateTime(dump_only=True)
