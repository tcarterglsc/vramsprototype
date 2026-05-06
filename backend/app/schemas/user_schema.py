from marshmallow import Schema, fields


class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str()
    email = fields.Email()
    role = fields.Str()
    department = fields.Str()
    phone = fields.Str()
    is_active = fields.Bool()
    avatar_initials = fields.Str(dump_only=True)
    license_number = fields.Str()
    driver_id_code = fields.Str()
    total_trips = fields.Int()
    created_at = fields.DateTime(dump_only=True)
