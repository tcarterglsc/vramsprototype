from marshmallow import Schema, fields


class LoginRequestSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)


class AuthUserOutSchema(Schema):
    id = fields.Str()
    displayName = fields.Str()
    email = fields.Email()
    role = fields.Str()
    photoURL = fields.Str()
    avatar_initials = fields.Str()
    department = fields.Str(allow_none=True)
    phone = fields.Str(allow_none=True)
    license_number = fields.Str(allow_none=True)
    driver_id_code = fields.Str(allow_none=True)
    version = fields.Int()
    shortcuts = fields.List(fields.Raw())
    loginRedirectUrl = fields.Str()


class LoginResponseSchema(Schema):
    access_token = fields.Str()
    user = fields.Nested(AuthUserOutSchema)


class PatchMeSchema(Schema):
    name = fields.Str()
    department = fields.Str(allow_none=True)
    phone = fields.Str(allow_none=True)
    license_number = fields.Str(allow_none=True)
    driver_id_code = fields.Str(allow_none=True)
    current_password = fields.Str()
    new_password = fields.Str()
    expected_version = fields.Int()
