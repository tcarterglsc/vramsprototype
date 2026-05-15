from marshmallow import Schema, fields


class VramsNotificationSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str()
    body = fields.Str()
    category = fields.Str()
    link = fields.Str()
    read_at = fields.DateTime(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
