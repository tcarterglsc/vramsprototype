/**
 * Fleet management ERD shapes (NextGen diagram).
 * API payloads include these under `erd` — see backend/docs/FLEET_ERD_MAPPING.md.
 */

export type ErdVehicleExtension = {
	vin?: string;
	make?: string;
	model?: string;
	year?: number;
	odometer_km?: number;
	default_driver_id?: number | null;
};

/** ERD: Vehicle */
export type ErdVehicle = {
	UniqueID: string;
	plate_number: string;
	fitness_expiry_date?: string | null;
	insurance_expiry_date?: string | null;
	status_int?: number | null;
	notes?: string | null;
	vehicle_type_int?: number | null;
	is_bookable: boolean;
	extension?: ErdVehicleExtension;
};

/** ERD: VehicleAttachment */
export type ErdVehicleAttachment = {
	UniqueID: string;
	source_document_id: string;
	dt_from_date?: string | null;
	dt_to_date?: string | null;
	vehicle_id_guid: string;
	doc_type?: string;
	file_name?: string;
	file_url?: string;
};

/** ERD: NextGenSourceDocument */
export type ErdNextGenSourceDocument = {
	UniqueID: string;
	original_file_name?: string;
	stored_url?: string;
	uploaded_at?: string | null;
};

export type ErdDocumentAggregate = {
	VehicleAttachment: ErdVehicleAttachment;
	NextGenSourceDocument: ErdNextGenSourceDocument;
	Vehicle?: ErdVehicle;
};

export type ErdRequestExtension = {
	ref?: string;
	booking_type?: string;
};

/** ERD: Request */
export type ErdRequest = {
	UniqueID: string;
	requesting_user_guid: string;
	priority_level_int?: number | null;
	reason?: string | null;
	is_flexible_bool: boolean;
	start_time?: string | null;
	end_time?: string | null;
	request_state_int?: number | null;
	number_of_people?: number | null;
	location_id_guid?: string | null;
	destination_text?: string | null;
	elevate_to_manager_boolean?: boolean;
	elevate_to_manager_reason?: string | null;
	min_hours_int?: number | null;
	max_hours_int?: number | null;
	estimated_hours?: number | null;
	extension?: ErdRequestExtension;
};

export type ErdBookingExtension = {
	dispatched_at?: string | null;
	returned_at?: string | null;
	delay_reason?: string | null;
};

/** ERD: Booking (API dispatch row) */
export type ErdBooking = {
	UniqueID: string;
	driver_id_guid: string;
	vehicle_id_guid: string;
	request_id_guid: string;
	approving_user_guid?: string | null;
	booking_status_int?: number | null;
	extension?: ErdBookingExtension;
};

export type ErdServiceLogExtension = {
	technician?: string;
	mileage_at_service?: number;
	service_type_label?: string;
};

/** ERD: ServiceLog (maintenance row) */
export type ErdServiceLog = {
	UniqueID: string;
	vehicle_id_guid: string;
	service_date?: string | null;
	service_type_int?: number | null;
	description?: string | null;
	cost?: number | null;
	next_service_date?: string | null;
	extension?: ErdServiceLogExtension;
};

/** ERD: VehicleStatusLog */
export type ErdVehicleStatusLog = {
	UniqueID: string;
	from_state_int?: number | null;
	to_state_int?: number | null;
	from_state_label?: string | null;
	to_state_label?: string | null;
	reason?: string | null;
	changed_by_guid?: string | null;
	changed_at_datetime?: string | null;
	vehicle_id_guid: string;
};

/** ERD: Driver */
export type ErdDriver = {
	UniqueID: string;
	user_id_guid: string;
	licence_number?: string | null;
	expiry_date?: string | null;
	status_int?: number;
	extension?: { driver_id_code?: string; email?: string };
};

/** ERD: NextGenUser */
export type ErdNextGenUser = {
	UniqueID: string;
	email: string;
	display_name: string;
	role: string;
};

export type ErdUserAggregate = {
	NextGenUser: ErdNextGenUser;
	Driver: ErdDriver | null;
};

/** ERD: AuditLog */
export type ErdAuditLog = {
	UniqueID: string;
	entity_type: string;
	entity_id_guid?: string | null;
	action_int: number;
	action_label: string;
	field_name?: string | null;
	old_value?: string | null;
	new_value?: string | null;
	changed_by_guid?: string | null;
	changed_at_datetime?: string | null;
	details?: string | null;
};
