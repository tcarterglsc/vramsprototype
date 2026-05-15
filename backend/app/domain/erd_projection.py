"""
Serialize ORM objects into ERD-shaped dicts (field names from the fleet diagram).

Exposed under JSON key ``erd`` alongside existing API fields so clients can
depend on either shape during migration.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from app.domain import erd_codes


def _iso_date(d: Optional[date]) -> Optional[str]:
    if d is None:
        return None
    return d.isoformat()


def _iso_dt(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    return dt.isoformat()


def _guid(n: int) -> str:
    """Stable string id stand-in for ERD ``*_guid`` fields (int PK today)."""
    return str(n)


def vehicle_block(v: Any) -> dict[str, Any]:
    """ERD: Vehicle"""
    return {
        "UniqueID": _guid(v.id),
        "plate_number": v.plate,
        "fitness_expiry_date": _iso_date(getattr(v, "fitness_expiry", None)),
        "insurance_expiry_date": _iso_date(getattr(v, "insurance_expiry", None)),
        "status_int": erd_codes.vehicle_status_int(v.status),
        "notes": v.notes,
        "vehicle_type_int": erd_codes.vehicle_type_int(getattr(v, "vehicle_type", None)),
        "is_bookable": bool(v.bookable),
        # Extra columns in prototype (not on diagram) — kept for traceability
        "extension": {
            "vin": v.vin,
            "make": v.make,
            "model": v.model,
            "year": v.year,
            "odometer_km": v.odometer_km,
            "default_driver_id": v.default_driver_id,
        },
    }


def vehicle_attachment_block(doc: Any) -> dict[str, Any]:
    """ERD: VehicleAttachment (+ monolithic SourceDocument = same row)."""
    uploaded = getattr(doc, "uploaded_at", None)
    dt_from = uploaded.date() if isinstance(uploaded, datetime) else None
    return {
        "UniqueID": _guid(doc.id),
        "source_document_id": _guid(doc.id),
        "dt_from_date": _iso_date(dt_from),
        "dt_to_date": _iso_date(getattr(doc, "expires_at", None)),
        "vehicle_id_guid": _guid(doc.vehicle_id),
        "doc_type": getattr(doc, "doc_type", None),
        "file_name": getattr(doc, "file_name", None),
        "file_url": getattr(doc, "file_url", None),
    }


def next_gen_source_document_block(doc: Any) -> dict[str, Any]:
    """ERD: NextGenSourceDocument (stored inline in prototype)."""
    return {
        "UniqueID": _guid(doc.id),
        "original_file_name": getattr(doc, "file_name", None),
        "stored_url": getattr(doc, "file_url", None),
        "uploaded_at": _iso_dt(getattr(doc, "uploaded_at", None)),
    }


def document_aggregate_erd(doc: Any) -> dict[str, Any]:
    """VehicleAttachment + NextGenSourceDocument as in ERD."""
    return {
        "VehicleAttachment": vehicle_attachment_block(doc),
        "NextGenSourceDocument": next_gen_source_document_block(doc),
    }


def request_block(r: Any) -> dict[str, Any]:
    """ERD: Request (subset — location is text, not Gazetteer id)."""
    bt = getattr(r, "booking_type", None) or "fixed"
    flexible = str(bt).lower() == "flexible"
    return {
        "UniqueID": _guid(r.id),
        "requesting_user_guid": _guid(r.requester_id),
        "priority_level_int": erd_codes.request_priority_int(getattr(r, "priority", None)),
        "reason": getattr(r, "purpose", None),
        "is_flexible_bool": flexible,
        "start_time": _iso_dt(getattr(r, "departure_at", None)),
        "end_time": _iso_dt(getattr(r, "return_at", None)),
        "request_state_int": erd_codes.request_state_int(r.status),
        "number_of_people": getattr(r, "passenger_count", None),
        "location_id_guid": None,
        "destination_text": getattr(r, "destination", None),
        "elevate_to_manager_boolean": False,
        "elevate_to_manager_reason": None,
        "min_hours_int": None,
        "max_hours_int": None,
        "estimated_hours": None,
        "extension": {"ref": getattr(r, "ref", None), "booking_type": bt},
    }


def booking_block(d: Any, request: Any = None) -> dict[str, Any]:
    """ERD: Booking (implemented as Dispatch in prototype)."""
    req = request if request is not None else getattr(d, "request", None)
    approving = None
    if req is not None and getattr(req, "approved_by_id", None):
        approving = _guid(req.approved_by_id)
    return {
        "UniqueID": _guid(d.id),
        "driver_id_guid": _guid(d.driver_id),
        "vehicle_id_guid": _guid(d.vehicle_id),
        "request_id_guid": _guid(d.request_id),
        "approving_user_guid": approving,
        "booking_status_int": erd_codes.booking_state_int(d.status),
        "extension": {
            "dispatched_at": _iso_dt(getattr(d, "dispatched_at", None)),
            "returned_at": _iso_dt(getattr(d, "returned_at", None)),
            "delay_reason": getattr(d, "delay_reason", None),
        },
    }


def service_log_block(log: Any) -> dict[str, Any]:
    """ERD: ServiceLog (implemented as MaintenanceLog)."""
    return {
        "UniqueID": _guid(log.id),
        "vehicle_id_guid": _guid(log.vehicle_id),
        "service_date": _iso_date(getattr(log, "date_performed", None)),
        "service_type_int": erd_codes.service_type_int(getattr(log, "service_type", None)),
        "description": getattr(log, "notes", None),
        "cost": float(log.cost_kes) if getattr(log, "cost_kes", None) is not None else None,
        "next_service_date": _iso_date(getattr(log, "next_due_date", None)),
        "extension": {
            "technician": getattr(log, "technician", None),
            "mileage_at_service": getattr(log, "mileage_at_service", None),
            "service_type_label": getattr(log, "service_type", None),
        },
    }


def vehicle_status_log_block(log: Any) -> dict[str, Any]:
    """ERD: VehicleStatusLog"""
    fs = log.from_status.value if getattr(log, "from_status", None) and hasattr(log.from_status, "value") else log.from_status
    ts = log.to_status.value if getattr(log, "to_status", None) and hasattr(log.to_status, "value") else log.to_status
    return {
        "UniqueID": _guid(log.id),
        "from_state_int": erd_codes.vehicle_status_int(log.from_status),
        "to_state_int": erd_codes.vehicle_status_int(log.to_status),
        "from_state_label": fs,
        "to_state_label": ts,
        "reason": log.reason,
        "changed_by_guid": _guid(log.changed_by_id) if log.changed_by_id else None,
        "changed_at_datetime": _iso_dt(log.changed_at),
        "vehicle_id_guid": _guid(log.vehicle_id),
    }


def driver_block(user: Any) -> dict[str, Any]:
    """ERD: Driver (row is User with driver role in prototype)."""
    return {
        "UniqueID": _guid(user.id),
        "user_id_guid": _guid(user.id),
        "licence_number": getattr(user, "license_number", None),
        "expiry_date": None,
        "status_int": erd_codes.DRIVER_STATUS_ACTIVE,
        "extension": {"driver_id_code": getattr(user, "driver_id_code", None), "email": user.email},
    }


def next_gen_user_block(user: Any) -> dict[str, Any]:
    """ERD: NextGenUser (auth profile row)."""
    role = user.role.value if hasattr(user.role, "value") else user.role
    return {
        "UniqueID": _guid(user.id),
        "email": user.email,
        "display_name": user.name,
        "role": role,
    }


def user_aggregate_erd(user: Any) -> dict[str, Any]:
    """NextGenUser + optional Driver overlay."""
    role = user.role.value if hasattr(user.role, "value") else user.role
    out: dict[str, Any] = {"NextGenUser": next_gen_user_block(user)}
    if role == "driver":
        out["Driver"] = driver_block(user)
    else:
        out["Driver"] = None
    return out


def audit_log_block(item: Any) -> dict[str, Any]:
    """ERD: AuditLog (string action + JSON details → int action + ids)."""
    raw_entity_id = getattr(item, "entity_id", None)
    entity_id_guid = str(raw_entity_id) if raw_entity_id is not None else None
    return {
        "UniqueID": _guid(item.id),
        "entity_type": item.entity_type,
        "entity_id_guid": entity_id_guid,
        "action_int": erd_codes.audit_action_int(item.action),
        "action_label": item.action,
        "field_name": None,
        "old_value": None,
        "new_value": None,
        "changed_by_guid": _guid(item.actor_id) if item.actor_id else None,
        "changed_at_datetime": _iso_dt(item.created_at),
        "details": item.details_json,
    }
