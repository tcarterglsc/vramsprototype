# Fleet management ERD ↔ VRAMS prototype mapping

The diagram models **NextGen** entities (GUIDs, `*_int` lookup keys, separate **Booking**, **VehicleAttachment** + **NextGenSourceDocument**). This SQLite prototype uses **integer primary keys** and a single **Dispatch** row instead of **Booking**, **MaintenanceLog** instead of **ServiceLog**, and **VehicleDocument** as a combined attachment + file metadata row.

This document is the contract for alignment. Runtime JSON adds an **`erd`** object (alongside existing fields) built from `app.domain.erd_projection` and codes in `app.domain.erd_codes`.

## Entity mapping

| ERD entity | Prototype implementation |
|------------|----------------------------|
| **Vehicle** | `vehicles` — `plate` ↔ `plate_number`, `fitness_expiry` ↔ `fitness_expiry_date`, `insurance_expiry` ↔ `insurance_expiry_date`, `status` (enum string) ↔ `status_int`, `vehicle_type` (string) ↔ `vehicle_type_int`, `bookable` ↔ `is_bookable`. Extra columns (`vin`, `make`, `model`, …) appear under `erd.extension`. |
| **VehicleAttachment** + **NextGenSourceDocument** | `vehicle_documents` — one table. `erd.VehicleAttachment` carries `source_document_id` (= document id), `dt_from_date` / `dt_to_date` from `uploaded_at` / `expires_at`. `erd.NextGenSourceDocument` mirrors file metadata. |
| **Request** | `requests` — `requester_id` ↔ `requesting_user_guid`, `purpose`/`destination` ↔ `reason` + `destination_text`, `booking_type` ↔ `is_flexible_bool`, times ↔ `start_time` / `end_time`, `status` ↔ `request_state_int`, `passenger_count` ↔ `number_of_people`. `location_id_guid` is `null` until a gazetteer FK exists. |
| **Booking** | `dispatches` — `erd` on dispatch payloads is the **Booking** shape: `driver_id_guid`, `vehicle_id_guid`, `request_id_guid`, `booking_status_int`. `approving_user_guid` is filled from `request.approved_by_id` when the relationship is loaded. |
| **Driver** | Users with `role == driver` — `license_number` ↔ `licence_number`. No separate `drivers` table yet; `erd.Driver` is emitted on **User** payloads when applicable. |
| **NextGenUser** | `users` (subset: id, email, name, role) under `erd.NextGenUser`. |
| **ServiceLog** | `maintenance_logs` — `date_performed` ↔ `service_date`, `service_type` ↔ `service_type_int`, `notes` ↔ `description`, `cost_kes` ↔ `cost`, `next_due_date` ↔ `next_service_date`. Technician/mileage remain under `erd.extension`. |
| **VehicleStatusLog** | `vehicle_status_logs` — `from_status`/`to_status` enums ↔ `from_state_int` / `to_state_int` plus human-readable labels. |
| **AuditLog** | `audit_logs` — string `action` ↔ `action_int` (bucketed); `details_json` retained as `details`; `entity_id` ↔ `entity_id_guid`. Field-level old/new values are not captured yet (`field_name` / `old_value` / `new_value` are `null`). |

## CL_* codes (stable integers)

Defined in `app/domain/erd_codes.py`:

- **CL_VehicleStatus** — `VEHICLE_STATUS`
- **CL_VehicleType** — `VEHICLE_TYPE` (matches API strings: SUV, Van, …)
- **CL_VehicleRequestPriorityLevel** — `REQUEST_PRIORITY`
- **CL_RequestState** — `REQUEST_STATE`
- **CL_BookingState** — `BOOKING_STATE` (dispatch statuses)
- **CL_ServiceType** — `SERVICE_TYPE` (maintenance labels from seed/UI)
- **CL_DriverStatus** — placeholder constants (`DRIVER_STATUS_*`) until a column exists
- **CL_ActionType** — `AUDIT_ACTION` (bucketed from audit action strings)

## Not implemented vs diagram

- **BookingStateLog** — no table; dispatch history is only current status + timestamps.
- **Taxi Details** — not in scope.
- **NextGenGazetteer** — requests use free-text `destination` only.
- **GUID storage** — APIs use stringified integer ids in `*_guid` fields until a migration to UUIDs.

## Client usage

Prefer **`erd`** for new integrations that track the enterprise model; existing **`plate`**, **`status`**, etc. fields remain stable for the current React app.
