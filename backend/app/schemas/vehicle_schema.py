from marshmallow import Schema, fields
from .user_schema import UserSchema


class VehicleDocumentSchema(Schema):
    id = fields.Int(dump_only=True)
    vehicle_id = fields.Int(dump_only=True)
    doc_type = fields.Str()
    file_url = fields.Str()
    file_name = fields.Str()
    expires_at = fields.Date()
    uploaded_at = fields.DateTime(dump_only=True)


class VehicleSchema(Schema):
    id = fields.Int(dump_only=True)
    plate = fields.Str(required=True)
    vin = fields.Str()
    make = fields.Str(required=True)
    model = fields.Str(required=True)
    year = fields.Int(required=True)
    vehicle_type = fields.Str(required=True)
    fuel_type = fields.Str()
    transmission = fields.Str()
    seating_capacity = fields.Int()
    engine_size = fields.Str()
    color = fields.Str()
    odometer_km = fields.Int()
    status = fields.Str()
    bookable = fields.Bool()
    notes = fields.Str()
    fitness_expiry = fields.Date()
    insurance_expiry = fields.Date()
    next_service_date = fields.Date()
    default_driver = fields.Nested(UserSchema, dump_only=True)
    documents = fields.List(fields.Nested(VehicleDocumentSchema), dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
