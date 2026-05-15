/**
 * Read fleet entities using ERD field names (diagram), with fallback to legacy API fields.
 */
import type {
	Dispatch,
	DispatchStatus,
	MaintenanceLog,
	RequestPriority,
	RequestStatus,
	ServiceType,
	StatusLog,
	Vehicle,
	VehicleDocument,
	VehicleStatus,
	VehicleType,
	VramsRequest,
	VramsUser
} from '../types';
import type { ErdBooking, ErdRequest, ErdServiceLog, ErdVehicle } from '../types/erd';
import {
	BOOKING_STATE_BY_INT,
	REQUEST_PRIORITY_BY_INT,
	REQUEST_STATE_BY_INT,
	SERVICE_TYPE_BY_INT,
	VEHICLE_STATUS_BY_INT,
	VEHICLE_TYPE_BY_INT
} from './erdCodes';

function vehicleErd(v: Vehicle): ErdVehicle | undefined {
	if (v.erd && 'plate_number' in v.erd) {
		return v.erd as ErdVehicle;
	}
	return undefined;
}

function requestErd(r: VramsRequest): ErdRequest | undefined {
	if (r.erd && 'requesting_user_guid' in r.erd) {
		return r.erd as ErdRequest;
	}
	return undefined;
}

function bookingErd(d: Dispatch): ErdBooking | undefined {
	if (d.erd && 'driver_id_guid' in d.erd) {
		return d.erd as ErdBooking;
	}
	return undefined;
}

function serviceLogErd(m: MaintenanceLog): ErdServiceLog | undefined {
	if (m.erd && 'service_date' in m.erd) {
		return m.erd as ErdServiceLog;
	}
	return undefined;
}

// ── Vehicle (ERD) ───────────────────────────────────────────────────────────

export function vehicleUniqueId(v: Vehicle): string {
	return vehicleErd(v)?.UniqueID ?? String(v.id);
}

export function vehiclePlateNumber(v: Vehicle): string {
	return vehicleErd(v)?.plate_number ?? v.plate;
}

export function vehicleFitnessExpiryDate(v: Vehicle): string | undefined {
	const d = vehicleErd(v)?.fitness_expiry_date;
	return d ?? v.fitness_expiry ?? undefined;
}

export function vehicleInsuranceExpiryDate(v: Vehicle): string | undefined {
	const d = vehicleErd(v)?.insurance_expiry_date;
	return d ?? v.insurance_expiry ?? undefined;
}

export function vehicleNextServiceDate(v: Vehicle): string | undefined {
	return v.next_service_date ?? undefined;
}

export function vehicleIsBookable(v: Vehicle): boolean {
	const e = vehicleErd(v);
	return e ? e.is_bookable : v.bookable;
}

export function vehicleStatusKey(v: Vehicle): VehicleStatus {
	const e = vehicleErd(v);
	if (e?.status_int != null && VEHICLE_STATUS_BY_INT[e.status_int]) {
		return VEHICLE_STATUS_BY_INT[e.status_int];
	}
	return v.status;
}

export function vehicleTypeLabel(v: Vehicle): VehicleType | string {
	const e = vehicleErd(v);
	if (e?.vehicle_type_int != null && VEHICLE_TYPE_BY_INT[e.vehicle_type_int]) {
		return VEHICLE_TYPE_BY_INT[e.vehicle_type_int];
	}
	return v.vehicle_type;
}

export function vehicleMake(v: Vehicle): string {
	return vehicleErd(v)?.extension?.make ?? v.make;
}

export function vehicleModel(v: Vehicle): string {
	return vehicleErd(v)?.extension?.model ?? v.model;
}

export function vehicleYear(v: Vehicle): number {
	return vehicleErd(v)?.extension?.year ?? v.year;
}

export function vehicleVin(v: Vehicle): string | undefined {
	return vehicleErd(v)?.extension?.vin ?? v.vin;
}

export function vehicleOdometerKm(v: Vehicle): number | undefined {
	return vehicleErd(v)?.extension?.odometer_km ?? v.odometer_km;
}

export function vehicleNotes(v: Vehicle): string | undefined {
	return vehicleErd(v)?.notes ?? v.notes ?? undefined;
}

export function vehicleColor(v: Vehicle): string | undefined {
	return v.color;
}

// ── Request (ERD) ───────────────────────────────────────────────────────────

export function requestUniqueId(r: VramsRequest): string {
	return requestErd(r)?.UniqueID ?? String(r.id);
}

export function requestRef(r: VramsRequest): string {
	return requestErd(r)?.extension?.ref ?? r.ref;
}

export function requestDestinationText(r: VramsRequest): string {
	return requestErd(r)?.destination_text ?? r.destination;
}

export function requestReason(r: VramsRequest): string | undefined {
	return requestErd(r)?.reason ?? r.purpose ?? undefined;
}

export function requestIsFlexible(r: VramsRequest): boolean {
	const e = requestErd(r);
	if (e) {
		return e.is_flexible_bool;
	}
	return r.booking_type === 'flexible';
}

export function requestStartTime(r: VramsRequest): string {
	return requestErd(r)?.start_time ?? r.departure_at;
}

export function requestEndTime(r: VramsRequest): string | undefined {
	return requestErd(r)?.end_time ?? r.return_at ?? undefined;
}

export function requestStateKey(r: VramsRequest): RequestStatus {
	const e = requestErd(r);
	if (e?.request_state_int != null && REQUEST_STATE_BY_INT[e.request_state_int]) {
		return REQUEST_STATE_BY_INT[e.request_state_int];
	}
	return r.status;
}

export function requestPriorityKey(r: VramsRequest): RequestPriority {
	const e = requestErd(r);
	if (e?.priority_level_int != null && REQUEST_PRIORITY_BY_INT[e.priority_level_int]) {
		return REQUEST_PRIORITY_BY_INT[e.priority_level_int];
	}
	return r.priority;
}

export function requestPassengerCount(r: VramsRequest): number | undefined {
	return requestErd(r)?.number_of_people ?? r.passenger_count ?? undefined;
}

export function requestRequestingUserGuid(r: VramsRequest): string {
	return requestErd(r)?.requesting_user_guid ?? String(r.requester_id);
}

// ── Booking / Dispatch (ERD) ──────────────────────────────────────────────────

export function bookingUniqueId(d: Dispatch): string {
	return bookingErd(d)?.UniqueID ?? String(d.id);
}

export function bookingStatusKey(d: Dispatch): DispatchStatus {
	const e = bookingErd(d);
	if (e?.booking_status_int != null && BOOKING_STATE_BY_INT[e.booking_status_int]) {
		return BOOKING_STATE_BY_INT[e.booking_status_int];
	}
	return d.status;
}

export function bookingDispatchedAt(d: Dispatch): string | undefined {
	return bookingErd(d)?.extension?.dispatched_at ?? d.dispatched_at ?? undefined;
}

export function bookingReturnedAt(d: Dispatch): string | undefined {
	return bookingErd(d)?.extension?.returned_at ?? d.returned_at ?? undefined;
}

// ── ServiceLog / Maintenance (ERD) ───────────────────────────────────────────

export function serviceLogUniqueId(m: MaintenanceLog): string {
	return serviceLogErd(m)?.UniqueID ?? String(m.id);
}

export function serviceDate(m: MaintenanceLog): string {
	return serviceLogErd(m)?.service_date ?? m.date_performed;
}

export function serviceTypeLabel(m: MaintenanceLog): ServiceType | string {
	const e = serviceLogErd(m);
	if (e?.service_type_int != null && SERVICE_TYPE_BY_INT[e.service_type_int]) {
		return SERVICE_TYPE_BY_INT[e.service_type_int];
	}
	return e?.extension?.service_type_label ?? m.service_type;
}

export function serviceDescription(m: MaintenanceLog): string | undefined {
	return serviceLogErd(m)?.description ?? m.notes ?? undefined;
}

export function serviceCost(m: MaintenanceLog): number | undefined {
	const c = serviceLogErd(m)?.cost;
	if (c != null) {
		return c;
	}
	return m.cost_kes != null ? Number(m.cost_kes) : undefined;
}

export function serviceNextDate(m: MaintenanceLog): string | undefined {
	return serviceLogErd(m)?.next_service_date ?? m.next_due_date ?? undefined;
}

export function serviceTechnician(m: MaintenanceLog): string {
	return serviceLogErd(m)?.extension?.technician ?? m.technician;
}

export function serviceMileage(m: MaintenanceLog): number | undefined {
	return serviceLogErd(m)?.extension?.mileage_at_service ?? m.mileage_at_service ?? undefined;
}

// ── Status log (ERD) ─────────────────────────────────────────────────────────

export function statusLogFromState(log: StatusLog): VehicleStatus {
	if (log.erd?.from_state_label) {
		return log.erd.from_state_label as VehicleStatus;
	}
	return log.from_status;
}

export function statusLogToState(log: StatusLog): VehicleStatus {
	if (log.erd?.to_state_label) {
		return log.erd.to_state_label as VehicleStatus;
	}
	return log.to_status;
}

export function statusLogChangedAt(log: StatusLog): string {
	return log.erd?.changed_at_datetime ?? log.changed_at;
}

// ── User / Driver (ERD) ───────────────────────────────────────────────────────

export function userDisplayName(u: VramsUser): string {
	return u.erd?.NextGenUser?.display_name ?? u.name;
}

export function userEmail(u: VramsUser): string {
	return u.erd?.NextGenUser?.email ?? u.email;
}

export function driverLicenceNumber(u: VramsUser): string | undefined {
	return u.erd?.Driver?.licence_number ?? u.license_number ?? undefined;
}

// ── Document (ERD) ───────────────────────────────────────────────────────────

export function documentDtTo(doc: VehicleDocument): string | undefined {
	const nested = doc.erd?.VehicleAttachment?.dt_to_date;
	return nested ?? doc.expires_at ?? undefined;
}

export function documentFileName(doc: VehicleDocument): string | undefined {
	return doc.erd?.NextGenSourceDocument?.original_file_name ?? doc.file_name ?? undefined;
}
