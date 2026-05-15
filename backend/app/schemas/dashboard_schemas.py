from marshmallow import Schema, fields


class DashboardStatsSchema(Schema):
    pending_requests = fields.Int()
    vehicles_available = fields.Int()
    vehicles_total = fields.Int()
    active_dispatches = fields.Int()
    overdue_services = fields.Int()
    blocked_vehicles = fields.Int()


class MessageSchema(Schema):
    message = fields.Str()


class UnreadCountSchema(Schema):
    count = fields.Int()
