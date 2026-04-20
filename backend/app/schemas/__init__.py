from marshmallow import Schema, fields, validate


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


class MaintenanceLogSchema(Schema):
    id = fields.Int(dump_only=True)
    vehicle_id = fields.Int(required=True)
    vehicle = fields.Nested(VehicleSchema, dump_only=True)
    service_type = fields.Str(required=True)
    date_performed = fields.Date(required=True)
    mileage_at_service = fields.Int()
    technician = fields.Str(required=True)
    provider_type = fields.Str()
    cost_kes = fields.Decimal(as_string=True)
    next_due_date = fields.Date()
    notes = fields.Str()
    logged_by = fields.Nested(UserSchema, dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class StatusLogSchema(Schema):
    id = fields.Int(dump_only=True)
    vehicle_id = fields.Int(dump_only=True)
    changed_by = fields.Nested(UserSchema, dump_only=True)
    from_status = fields.Str(dump_only=True)
    to_status = fields.Str(dump_only=True)
    reason = fields.Str()
    changed_at = fields.DateTime(dump_only=True)


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
