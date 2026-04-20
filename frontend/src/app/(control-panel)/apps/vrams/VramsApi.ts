import { apiService as api } from 'src/store/apiService';
import type {
	DashboardStats,
	Dispatch,
	MaintenanceLog,
	PaginatedResponse,
	StatusLog,
	Vehicle,
	VramsRequest,
	VramsUser
} from './types';

export const addTagTypes = [
	'vrams_dashboard',
	'vrams_requests',
	'vrams_request',
	'vrams_vehicles',
	'vrams_vehicle',
	'vrams_vehicle_status_logs',
	'vrams_vehicle_bookings',
	'vrams_maintenance',
	'vrams_dispatch_pending',
	'vrams_dispatch_today',
	'vrams_drivers',
	'vrams_users'
] as const;

const VramsApi = api
	.enhanceEndpoints({ addTagTypes })
	.injectEndpoints({
		endpoints: (build) => ({
			// Dashboard
			getVramsDashboard: build.query<DashboardStats, void>({
				query: () => ({ url: '/api/vrams/dashboard' }),
				providesTags: ['vrams_dashboard']
			}),

			// Requests
			getVramsRequests: build.query<
				PaginatedResponse<VramsRequest>,
				{ status?: string; priority?: string; page?: number; per_page?: number; q?: string }
			>({
				query: (params) => ({ url: '/api/vrams/requests', params }),
				providesTags: ['vrams_requests']
			}),
			getVramsRequest: build.query<VramsRequest, number>({
				query: (id) => ({ url: `/api/vrams/requests/${id}` }),
				providesTags: ['vrams_request']
			}),
			createVramsRequest: build.mutation<VramsRequest, Partial<VramsRequest>>({
				query: (body) => ({ url: '/api/vrams/requests', method: 'POST', body }),
				invalidatesTags: ['vrams_requests', 'vrams_dashboard']
			}),
			approveVramsRequest: build.mutation<VramsRequest, number>({
				query: (id) => ({ url: `/api/vrams/requests/${id}/approve`, method: 'PATCH' }),
				invalidatesTags: ['vrams_requests', 'vrams_request', 'vrams_dashboard']
			}),
			rejectVramsRequest: build.mutation<VramsRequest, { id: number; reason: string }>({
				query: ({ id, reason }) => ({
					url: `/api/vrams/requests/${id}/reject`,
					method: 'PATCH',
					body: { reason }
				}),
				invalidatesTags: ['vrams_requests', 'vrams_request', 'vrams_dashboard']
			}),

			// Vehicles
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
			}),

			// Maintenance
			getVramsMaintenance: build.query<
				PaginatedResponse<MaintenanceLog>,
				{ vehicle_id?: number; service_type?: string; date_from?: string; date_to?: string; page?: number }
			>({
				query: (params) => ({ url: '/api/vrams/maintenance', params }),
				providesTags: ['vrams_maintenance']
			}),
			getVramsVehicleMaintenance: build.query<MaintenanceLog[], number>({
				query: (vehicleId) => ({ url: `/api/vrams/vehicles/${vehicleId}/maintenance` }),
				providesTags: ['vrams_maintenance']
			}),
			createVramsMaintenance: build.mutation<MaintenanceLog, Partial<MaintenanceLog>>({
				query: (body) => ({ url: '/api/vrams/maintenance', method: 'POST', body }),
				invalidatesTags: ['vrams_maintenance', 'vrams_vehicle', 'vrams_dashboard']
			}),

			// Dispatch
			getVramsDispatchPending: build.query<VramsRequest[], void>({
				query: () => ({ url: '/api/vrams/dispatch/pending' }),
				providesTags: ['vrams_dispatch_pending']
			}),
			getVramsDispatchToday: build.query<Dispatch[], void>({
				query: () => ({ url: '/api/vrams/dispatch/today' }),
				providesTags: ['vrams_dispatch_today']
			}),
			assignVramsDispatch: build.mutation<Dispatch, { request_id: number; vehicle_id: number; driver_id: number }>({
				query: (body) => ({ url: '/api/vrams/dispatch/assign', method: 'POST', body }),
				invalidatesTags: ['vrams_dispatch_pending', 'vrams_dispatch_today', 'vrams_requests', 'vrams_vehicles', 'vrams_dashboard']
			}),
			updateVramsDispatchStatus: build.mutation<Dispatch, { id: number; status: string; reason?: string }>({
				query: ({ id, ...body }) => ({ url: `/api/vrams/dispatch/${id}/status`, method: 'PATCH', body }),
				invalidatesTags: ['vrams_dispatch_today', 'vrams_vehicles', 'vrams_dashboard']
			}),

			// Users / Drivers
			getVramsDrivers: build.query<VramsUser[], void>({
				query: () => ({ url: '/api/vrams/users/drivers' }),
				providesTags: ['vrams_drivers']
			}),
			getVramsUsers: build.query<PaginatedResponse<VramsUser>, { role?: string; page?: number }>({
				query: (params) => ({ url: '/api/vrams/users', params }),
				providesTags: ['vrams_users']
			}),
			inviteVramsUser: build.mutation<VramsUser, { email: string; name: string; role: string }>({
				query: (body) => ({ url: '/api/vrams/users/invite', method: 'POST', body }),
				invalidatesTags: ['vrams_users']
			}),
			updateVramsUser: build.mutation<VramsUser, { id: number; role?: string; is_active?: boolean }>({
				query: ({ id, ...body }) => ({ url: `/api/vrams/users/${id}`, method: 'PATCH', body }),
				invalidatesTags: ['vrams_users']
			})
		}),
		overrideExisting: false
	});

export default VramsApi;

export const {
	useGetVramsDashboardQuery,
	useGetVramsRequestsQuery,
	useGetVramsRequestQuery,
	useCreateVramsRequestMutation,
	useApproveVramsRequestMutation,
	useRejectVramsRequestMutation,
	useGetVramsVehiclesQuery,
	useGetVramsVehicleQuery,
	useCreateVramsVehicleMutation,
	useUpdateVramsVehicleMutation,
	useUpdateVramsVehicleStatusMutation,
	useGetVramsVehicleStatusLogsQuery,
	useGetVramsVehicleBookingsQuery,
	useGetVramsMaintenanceQuery,
	useGetVramsVehicleMaintenanceQuery,
	useCreateVramsMaintenanceMutation,
	useGetVramsDispatchPendingQuery,
	useGetVramsDispatchTodayQuery,
	useAssignVramsDispatchMutation,
	useUpdateVramsDispatchStatusMutation,
	useGetVramsDriversQuery,
	useGetVramsUsersQuery,
	useInviteVramsUserMutation,
	useUpdateVramsUserMutation
} = VramsApi;
