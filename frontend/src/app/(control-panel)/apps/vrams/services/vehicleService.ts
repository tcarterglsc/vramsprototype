import { apiService as api } from 'src/store/apiService';
import type { PaginatedResponse, StatusLog, Vehicle, VramsRequest } from '../types';

const vehicleService = api
	.enhanceEndpoints({
		addTagTypes: [
			'vrams_vehicles',
			'vrams_vehicle',
			'vrams_vehicle_status_logs',
			'vrams_vehicle_bookings',
			'vrams_dashboard'
		]
	})
	.injectEndpoints({
		endpoints: (build) => ({
			getVramsVehicles: build.query<
				PaginatedResponse<Vehicle>,
				{ status?: string; vehicle_type?: string; bookable?: boolean; q?: string; page?: number }
			>({
				query: (params) => ({ url: '/api/vrams/vehicles', params }),
				providesTags: ['vrams_vehicles']
			}),
			getVramsVehicle: build.query<Vehicle, number>({
				query: (id) => ({ url: `/api/vrams/vehicles/${id}` }),
				providesTags: ['vrams_vehicle']
			}),
			createVramsVehicle: build.mutation<Vehicle, Partial<Vehicle>>({
				query: (body) => ({ url: '/api/vrams/vehicles', method: 'POST', body }),
				invalidatesTags: ['vrams_vehicles', 'vrams_dashboard']
			}),
			updateVramsVehicle: build.mutation<Vehicle, { id: number } & Partial<Vehicle>>({
				query: ({ id, ...body }) => ({ url: `/api/vrams/vehicles/${id}`, method: 'PATCH', body }),
				invalidatesTags: ['vrams_vehicles', 'vrams_vehicle']
			}),
			updateVramsVehicleStatus: build.mutation<Vehicle, { id: number; status: string; reason?: string }>({
				query: ({ id, ...body }) => ({ url: `/api/vrams/vehicles/${id}/status`, method: 'PATCH', body }),
				invalidatesTags: ['vrams_vehicles', 'vrams_vehicle', 'vrams_dashboard', 'vrams_vehicle_status_logs']
			}),
			getVramsVehicleStatusLogs: build.query<StatusLog[], number>({
				query: (vehicleId) => ({ url: `/api/vrams/vehicles/${vehicleId}/status-logs` }),
				providesTags: ['vrams_vehicle_status_logs']
			}),
			getVramsVehicleBookings: build.query<VramsRequest[], number>({
				query: (vehicleId) => ({ url: `/api/vrams/vehicles/${vehicleId}/bookings` }),
				providesTags: ['vrams_vehicle_bookings']
			})
		}),
		overrideExisting: false
	});

export default vehicleService;

export const {
	useGetVramsVehiclesQuery,
	useGetVramsVehicleQuery,
	useCreateVramsVehicleMutation,
	useUpdateVramsVehicleMutation,
	useUpdateVramsVehicleStatusMutation,
	useGetVramsVehicleStatusLogsQuery,
	useGetVramsVehicleBookingsQuery
} = vehicleService;
