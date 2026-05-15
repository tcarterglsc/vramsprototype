/**
 * CL_* lookup codes — mirrors backend/app/domain/erd_codes.py
 */
import type { DispatchStatus, RequestPriority, RequestStatus, ServiceType, VehicleStatus, VehicleType } from '../types';

export const VEHICLE_STATUS_BY_INT: Record<number, VehicleStatus> = {
	10: 'available',
	20: 'in_service',
	30: 'out_of_service',
	40: 'dispatched'
};

export const VEHICLE_TYPE_BY_INT: Record<number, VehicleType> = {
	1: 'SUV',
	2: 'Van',
	3: 'Truck',
	4: 'Bus',
	5: 'Sedan',
	6: 'Pickup'
};

export const REQUEST_PRIORITY_BY_INT: Record<number, RequestPriority> = {
	1: 'normal',
	2: 'high',
	3: 'urgent'
};

export const REQUEST_STATE_BY_INT: Record<number, RequestStatus> = {
	1: 'pending',
	2: 'approved',
	3: 'dispatched',
	4: 'rejected',
	5: 'completed',
	6: 'cancelled'
};

export const BOOKING_STATE_BY_INT: Record<number, DispatchStatus> = {
	1: 'en_route',
	2: 'returned',
	3: 'delayed',
	4: 'cancelled'
};

export const SERVICE_TYPE_BY_INT: Record<number, ServiceType> = {
	1: 'Oil Change',
	2: 'Tyre Rotation',
	3: 'Battery Replacement',
	4: 'Brake Service',
	5: 'Fitness Certificate',
	6: 'Insurance Renewal',
	7: 'General Service',
	99: 'Other'
};

export const VEHICLE_STATUS_INT: Record<VehicleStatus, number> = {
	available: 10,
	in_service: 20,
	out_of_service: 30,
	dispatched: 40
};

export const REQUEST_STATE_INT: Record<RequestStatus, number> = {
	pending: 1,
	approved: 2,
	dispatched: 3,
	rejected: 4,
	completed: 5,
	cancelled: 6
};

export const REQUEST_PRIORITY_INT: Record<RequestPriority, number> = {
	normal: 1,
	high: 2,
	urgent: 3
};

export const BOOKING_STATE_INT: Record<DispatchStatus, number> = {
	en_route: 1,
	returned: 2,
	delayed: 3,
	cancelled: 4
};
