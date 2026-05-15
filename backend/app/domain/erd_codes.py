"""
Integer codes aligned with the fleet-management ERD (CL_* lookup pattern).

The prototype stores human-readable enums/strings in SQLite; these codes are the
canonical bridge to the diagram's *_int fields. Future migrations can promote
these to real CL_* tables without changing the integer values.
"""

from __future__ import annotations

from typing import Any, Optional

# ── CL_VehicleStatus ─────────────────────────────────────────────────────────
VEHICLE_STATUS: dict[str, int] = {
    "available": 10,
    "in_service": 20,
    "out_of_service": 30,
    "dispatched": 40,
}
VEHICLE_STATUS_BY_INT: dict[int, str] = {v: k for k, v in VEHICLE_STATUS.items()}

# ── CL_VehicleType (string keys match API / seed) ────────────────────────────
VEHICLE_TYPE: dict[str, int] = {
    "SUV": 1,
    "Van": 2,
    "Truck": 3,
    "Bus": 4,
    "Sedan": 5,
    "Pickup": 6,
}
VEHICLE_TYPE_BY_INT: dict[int, str] = {v: k for k, v in VEHICLE_TYPE.items()}

# ── CL_VehicleRequestPriorityLevel ───────────────────────────────────────────
REQUEST_PRIORITY: dict[str, int] = {"normal": 1, "high": 2, "urgent": 3}
REQUEST_PRIORITY_BY_INT: dict[int, str] = {v: k for k, v in REQUEST_PRIORITY.items()}

# ── CL_RequestState ─────────────────────────────────────────────────────────
REQUEST_STATE: dict[str, int] = {
    "pending": 1,
    "approved": 2,
    "dispatched": 3,
    "rejected": 4,
    "completed": 5,
    "cancelled": 6,
}
REQUEST_STATE_BY_INT: dict[int, str] = {v: k for k, v in REQUEST_STATE.items()}

# ── CL_BookingState (maps Dispatch.status — Booking in ERD) ─────────────────
BOOKING_STATE: dict[str, int] = {
    "en_route": 1,
    "returned": 2,
    "delayed": 3,
    "cancelled": 4,
}
BOOKING_STATE_BY_INT: dict[int, str] = {v: k for k, v in BOOKING_STATE.items()}

# ── CL_DriverStatus (User+role driver; no column yet — default Active) ───────
DRIVER_STATUS_ACTIVE = 1
DRIVER_STATUS_AWAY = 2
DRIVER_STATUS_SUSPENDED = 3

# ── CL_ServiceType (maintenance / service log) ───────────────────────────────
SERVICE_TYPE: dict[str, int] = {
    "Oil Change": 1,
    "Tyre Rotation": 2,
    "Battery Replacement": 3,
    "Brake Service": 4,
    "Fitness Certificate": 5,
    "Insurance Renewal": 6,
    "General Service": 7,
    "Other": 99,
}
SERVICE_TYPE_BY_INT: dict[int, str] = {v: k for k, v in SERVICE_TYPE.items()}

# ── CL_ActionType (audit — subset mapped from string actions) ───────────────
AUDIT_ACTION: dict[str, int] = {
    "CREATE": 1,
    "UPDATE": 2,
    "DELETE": 3,
    "RESET": 4,
    "ASSIGN": 5,
    "STATUS_CHANGE": 6,
}


def _norm_vehicle_status(val: Any) -> Optional[str]:
    if val is None:
        return None
    if hasattr(val, "value"):
        return str(val.value)
    return str(val)


def vehicle_status_int(val: Any) -> Optional[int]:
    key = _norm_vehicle_status(val)
    return VEHICLE_STATUS.get(key) if key else None


def vehicle_type_int(vehicle_type: Optional[str]) -> Optional[int]:
    if not vehicle_type:
        return None
    key = str(vehicle_type).strip()
    if key in VEHICLE_TYPE:
        return VEHICLE_TYPE[key]
    # Accept API/seed variants (e.g. pickup → Pickup)
    titled = key.title()
    return VEHICLE_TYPE.get(titled)


def request_priority_int(priority: Optional[str]) -> Optional[int]:
    if not priority:
        return None
    return REQUEST_PRIORITY.get(str(priority))


def request_state_int(status: Any) -> Optional[int]:
    if status is None:
        return None
    key = status.value if hasattr(status, "value") else str(status)
    return REQUEST_STATE.get(key)


def booking_state_int(status: Any) -> Optional[int]:
    if status is None:
        return None
    key = status.value if hasattr(status, "value") else str(status)
    return BOOKING_STATE.get(key)


def service_type_int(service_type: Optional[str]) -> Optional[int]:
    if not service_type:
        return None
    return SERVICE_TYPE.get(str(service_type))


def audit_action_int(action: str) -> int:
    """Map free-form audit action string to CL_ActionType-style bucket."""
    a = (action or "").lower()
    if any(x in a for x in ("delete", "reject", "removed")):
        return AUDIT_ACTION["DELETE"]
    if "status" in a:
        return AUDIT_ACTION["STATUS_CHANGE"]
    if any(x in a for x in ("assign", "dispatch_assigned")):
        return AUDIT_ACTION["ASSIGN"]
    if any(x in a for x in ("created", "uploaded", "invited", "accepted")):
        return AUDIT_ACTION["CREATE"]
    return AUDIT_ACTION["UPDATE"]
