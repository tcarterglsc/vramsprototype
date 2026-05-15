from marshmallow import Schema, fields


class OrganizationSettingsSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    support_email = fields.Email(allow_none=True)
    logo_url = fields.Str(allow_none=True)
    updated_at = fields.DateTime(dump_only=True)
