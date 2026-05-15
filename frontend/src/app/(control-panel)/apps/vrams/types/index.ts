export type {
	ErdAuditLog,
	ErdBooking,
	ErdDocumentAggregate,
	ErdDriver,
	ErdNextGenUser,
	ErdRequest,
	ErdServiceLog,
	ErdUserAggregate,
	ErdVehicle,
	ErdVehicleStatusLog
} from './erd';

export type RequestStatus = 'pending' | 'approved' | 'dispatched' | 'rejected' | 'completed' | 'cancelled';
export type RequestPriority = 'normal' | 'high' | 'urgent';
export type BookingType = 'fixed' | 'flexible';
export type VehicleStatus = 'available' | 'in_service' | 'out_of_service' | 'dispatched';
export type VehicleType = 'SUV' | 'Van' | 'Truck' | 'Bus' | 'Sedan' | 'Pickup';
export type FuelType = 'Diesel' | 'Petrol' | 'Hybrid' | 'Electric';
export type ServiceType =
	| 'Oil Change'
	| 'Tyre Rotation'
	| 'Battery Replacement'
	| 'Brake Service'
	| 'Fitness Certificate'
	| 'Insurance Renewal'
	| 'General Service'
	| 'Other';
export type DispatchStatus = 'en_route' | 'returned' | 'delayed' | 'cancelled';
export type UserRole = 'admin' | 'fleet_manager' | 'requester' | 'driver';
export type DocumentType = 'fitness_certificate' | 'insurance' | 'road_licence' | 'vehicle_photo' | 'other';

export type VramsUser = {
	id: number;
	name: string;
	email: string;
	role: UserRole;
	department?: string;
	phone?: string;
	is_active: boolean;
	avatar_initials?: string;
	license_number?: string;
	driver_id_code?: string;
	total_trips?: number;
	created_at: string;
	version?: number;
	/** Fleet ERD overlay (NextGenUser + optional Driver) */
	erd?: import('./erd').ErdUserAggregate;
};

export type VramsOrganizationSettings = {
	id: number;
	name: string;
	support_email?: string | null;
	logo_url?: string | null;
	updated_at?: string | null;
};

export type InviteUserResponse = VramsUser & {
	temporary_password: string;
	invite_token: string;
	invite_url: string;
};

export type VehicleDocument = {
	id: number;
	vehicle_id: number;
	doc_type: DocumentType;
	file_url?: string;
	file_name?: string;
	expires_at?: string;
	uploaded_at: string;
	erd?: import('./erd').ErdDocumentAggregate;
};

/** Row from GET /api/vrams/documents (includes vehicle summary). */
export type FleetDocumentRow = VehicleDocument & {
	vehicle: { id: number; plate: string; make: string; model: string };
};

export type Vehicle = {
	id: number;
	plate: string;
	vin?: string;
	make: string;
	model: string;
	year: number;
	vehicle_type: VehicleType;
	fuel_type?: FuelType;
	transmission?: string;
	seating_capacity?: number;
	engine_size?: string;
	color?: string;
	odometer_km?: number;
	status: VehicleStatus;
	bookable: boolean;
	notes?: string;
	fitness_expiry?: string;
	insurance_expiry?: string;
	next_service_date?: string;
	default_driver?: VramsUser;
	documents?: VehicleDocument[];
	created_at: string;
	updated_at: string;
	erd?: import('./erd').ErdVehicle;
};

export type VramsRequest = {
	id: number;
	ref: string;
	requester_id: number;
	requester?: VramsUser;
	destination: string;
	purpose?: string;
	booking_type: BookingType;
	departure_at: string;
	return_at?: string;
	priority: RequestPriority;
	passenger_count?: number;
	status: RequestStatus;
	rejection_reason?: string;
	vehicle?: Vehicle;
	approved_by?: VramsUser;
	approved_at?: string;
	created_at: string;
	updated_at: string;
	erd?: import('./erd').ErdRequest;
};

export type MaintenanceLog = {
	id: number;
	vehicle_id: number;
	vehicle?: Vehicle;
	service_type: ServiceType;
	date_performed: string;
	mileage_at_service?: number;
	technician: string;
	provider_type?: string;
	cost_kes?: number;
	next_due_date?: string;
	notes?: string;
	receipt_url?: string;
	logged_by?: VramsUser;
	created_at: string;
	erd?: import('./erd').ErdServiceLog;
};

export type Dispatch = {
	id: number;
	request_id: number;
	request?: VramsRequest;
	vehicle_id: number;
	vehicle?: Vehicle;
	driver_id: number;
	driver?: VramsUser;
	dispatched_at?: string;
	returned_at?: string;
	status: DispatchStatus;
	delay_reason?: string;
	created_at: string;
	/** Fleet ERD: Booking */
	erd?: import('./erd').ErdBooking;
};

export type DashboardStats = {
	pending_requests: number;
	vehicles_available: number;
	vehicles_total: number;
	active_dispatches: number;
	overdue_services: number;
	blocked_vehicles: number;
};

export type StatusLog = {
	id: number;
	vehicle_id: number;
	changed_by?: VramsUser;
	from_status: VehicleStatus;
	to_status: VehicleStatus;
	reason?: string;
	changed_at: string;
	erd?: import('./erd').ErdVehicleStatusLog;
};

export type PaginatedResponse<T> = {
	items: T[];
	total: number;
	page: number;
	per_page: number;
	pages: number;
};

export type VramsReportSummary = {
	month: string;
	request_volume: number;
	requests_completed: number;
	dispatch_volume: number;
	maintenance_jobs: number;
	maintenance_cost_kes: number;
};

export type OperationalAlerts = {
	overdue_services: MaintenanceLog[];
	expiring_documents: VehicleDocument[];
	blocked_vehicles: Vehicle[];
};

export type VramsNotificationItem = {
	id: number;
	title: string;
	body: string;
	category: string;
	link?: string | null;
	read_at?: string | null;
	created_at: string;
};

export type AuditLogItem = {
	id: number;
	action: string;
	entity_type: string;
	entity_id?: string;
	actor_id?: number;
	actor_role?: string;
	details?: Record<string, unknown>;
	created_at: string;
	erd?: import('./erd').ErdAuditLog;
};
