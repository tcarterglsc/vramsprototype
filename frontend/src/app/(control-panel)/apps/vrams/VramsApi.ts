import { apiService as api } from 'src/store/apiService';
import type {
	AuditLogItem,
	DashboardStats,
	Dispatch,
	InviteUserResponse,
	MaintenanceLog,
	OperationalAlerts,
	PaginatedResponse,
	StatusLog,
	Vehicle,
	VehicleDocument,
	FleetDocumentRow,
	VramsNotificationItem,
	VramsOrganizationSettings,
	VramsReportSummary,
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
	'vrams_users',
	'vrams_reports',
	'vrams_alerts',
	'vrams_audit',
	'vrams_notifications',
	'vrams_organization',
	'vrams_documents'
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
				invalidatesTags: ['vrams_requests', 'vrams_dashboard', 'vrams_notifications']
			}),
			updateVramsRequest: build.mutation<VramsRequest, { id: number } & Partial<VramsRequest>>({
				query: ({ id, ...body }) => ({ url: `/api/vrams/requests/${id}`, method: 'PATCH', body }),
				invalidatesTags: ['vrams_requests', 'vrams_request', 'vrams_dashboard']
			}),
			deleteVramsRequest: build.mutation<{ message: string }, number>({
				query: (id) => ({ url: `/api/vrams/requests/${id}`, method: 'DELETE' }),
				invalidatesTags: ['vrams_requests', 'vrams_request', 'vrams_dashboard']
			}),
			approveVramsRequest: build.mutation<VramsRequest, number>({
				query: (id) => ({ url: `/api/vrams/requests/${id}/approve`, method: 'PATCH' }),
				invalidatesTags: ['vrams_requests', 'vrams_request', 'vrams_dashboard', 'vrams_notifications']
			}),
			rejectVramsRequest: build.mutation<VramsRequest, { id: number; reason: string }>({
				query: ({ id, reason }) => ({
					url: `/api/vrams/requests/${id}/reject`,
					method: 'PATCH',
					body: { reason }
				}),
				invalidatesTags: ['vrams_requests', 'vrams_request', 'vrams_dashboard', 'vrams_notifications']
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
			deleteVramsVehicle: build.mutation<{ message: string }, number>({
				query: (id) => ({ url: `/api/vrams/vehicles/${id}`, method: 'DELETE' }),
				invalidatesTags: ['vrams_vehicles', 'vrams_vehicle', 'vrams_dashboard']
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
			getVramsVehicleDocuments: build.query<VehicleDocument[], number>({
				query: (vehicleId) => ({ url: `/api/vrams/vehicles/${vehicleId}/documents` }),
				providesTags: ['vrams_vehicle']
			}),
			getVramsFleetDocuments: build.query<FleetDocumentRow[], string | void>({
				query: (q) => ({
					url: '/api/vrams/documents',
					params: q ? { q } : undefined
				}),
				providesTags: ['vrams_documents']
			}),
			uploadVramsVehicleDocument: build.mutation<
				VehicleDocument,
				{ vehicleId: number; doc_type: string; expires_at?: string; file: File }
			>({
				query: ({ vehicleId, doc_type, expires_at, file }) => {
					const formData = new FormData();
					formData.append('doc_type', doc_type);
					if (expires_at) formData.append('expires_at', expires_at);
					formData.append('file', file);
					return { url: `/api/vrams/vehicles/${vehicleId}/documents`, method: 'POST', body: formData };
				},
				invalidatesTags: ['vrams_vehicle', 'vrams_documents']
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
			getVramsMaintenanceLog: build.query<MaintenanceLog, number>({
				query: (id) => ({ url: `/api/vrams/maintenance/${id}` }),
				providesTags: ['vrams_maintenance']
			}),
			createVramsMaintenance: build.mutation<MaintenanceLog, Partial<MaintenanceLog>>({
				query: (body) => ({ url: '/api/vrams/maintenance', method: 'POST', body }),
				invalidatesTags: ['vrams_maintenance', 'vrams_vehicle', 'vrams_dashboard']
			}),
			updateVramsMaintenance: build.mutation<MaintenanceLog, { id: number } & Partial<MaintenanceLog>>({
				query: ({ id, ...body }) => ({ url: `/api/vrams/maintenance/${id}`, method: 'PATCH', body }),
				invalidatesTags: ['vrams_maintenance', 'vrams_vehicle', 'vrams_dashboard']
			}),
			deleteVramsMaintenance: build.mutation<{ message: string }, number>({
				query: (id) => ({ url: `/api/vrams/maintenance/${id}`, method: 'DELETE' }),
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
				invalidatesTags: [
					'vrams_dispatch_pending',
					'vrams_dispatch_today',
					'vrams_requests',
					'vrams_vehicles',
					'vrams_dashboard',
					'vrams_notifications'
				]
			}),
			updateVramsDispatch: build.mutation<Dispatch, { id: number; vehicle_id: number; driver_id: number }>({
				query: ({ id, ...body }) => ({ url: `/api/vrams/dispatch/${id}`, method: 'PATCH', body }),
				invalidatesTags: ['vrams_dispatch_today', 'vrams_dispatch_pending', 'vrams_requests', 'vrams_vehicles', 'vrams_dashboard']
			}),
			updateVramsDispatchStatus: build.mutation<Dispatch, { id: number; status: string; reason?: string }>({
				query: ({ id, ...body }) => ({ url: `/api/vrams/dispatch/${id}/status`, method: 'PATCH', body }),
				invalidatesTags: ['vrams_dispatch_today', 'vrams_vehicles', 'vrams_dashboard', 'vrams_notifications']
			}),

			// Notifications
			getVramsNotifications: build.query<
				PaginatedResponse<VramsNotificationItem>,
				{ page?: number; per_page?: number; unread_only?: boolean }
			>({
				query: (params) => ({
					url: '/api/vrams/notifications',
					params: {
						...params,
						unread_only: params?.unread_only ? '1' : undefined
					}
				}),
				providesTags: ['vrams_notifications']
			}),
			getVramsUnreadNotificationCount: build.query<{ count: number }, void>({
				query: () => ({ url: '/api/vrams/notifications/unread-count' }),
				providesTags: ['vrams_notifications']
			}),
			markVramsNotificationRead: build.mutation<VramsNotificationItem, number>({
				query: (id) => ({ url: `/api/vrams/notifications/${id}/read`, method: 'PATCH' }),
				invalidatesTags: ['vrams_notifications']
			}),
			markAllVramsNotificationsRead: build.mutation<{ message: string }, void>({
				query: () => ({ url: '/api/vrams/notifications/mark-all-read', method: 'POST' }),
				invalidatesTags: ['vrams_notifications']
			}),

			// Reporting / Alerts
			getVramsReportSummary: build.query<VramsReportSummary, { month?: string } | void>({
				query: (params) => ({ url: '/api/vrams/reports/summary', params }),
				providesTags: ['vrams_reports']
			}),
			getVramsOperationalAlerts: build.query<OperationalAlerts, void>({
				query: () => ({ url: '/api/vrams/alerts/operational' }),
				providesTags: ['vrams_alerts']
			}),
			getVramsAuditLogs: build.query<
				PaginatedResponse<AuditLogItem>,
				{ page?: number; per_page?: number; action?: string; entity_type?: string }
			>({
				query: (params) => ({ url: '/api/vrams/audit/logs', params }),
				providesTags: ['vrams_audit']
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
			inviteVramsUser: build.mutation<InviteUserResponse, { email: string; name: string; role: string }>({
				query: (body) => ({ url: '/api/vrams/users/invite', method: 'POST', body }),
				invalidatesTags: ['vrams_users']
			}),
			acceptVramsInvite: build.mutation<{ message: string }, { token: string; password: string }>({
				query: (body) => ({ url: '/api/vrams/users/accept-invite', method: 'POST', body })
			}),
			updateVramsUser: build.mutation<
				VramsUser,
				{ id: number; role?: string; is_active?: boolean; expected_version?: number }
			>({
				query: ({ id, ...body }) => ({ url: `/api/vrams/users/${id}`, method: 'PATCH', body }),
				invalidatesTags: ['vrams_users']
			}),

			getVramsOrganizationSettings: build.query<VramsOrganizationSettings, void>({
				query: () => ({ url: '/api/vrams/settings/organization' }),
				providesTags: ['vrams_organization']
			}),
			patchVramsOrganizationSettings: build.mutation<VramsOrganizationSettings, Partial<VramsOrganizationSettings>>({
				query: (body) => ({ url: '/api/vrams/settings/organization', method: 'PATCH', body }),
				invalidatesTags: ['vrams_organization']
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
	useUpdateVramsRequestMutation,
	useDeleteVramsRequestMutation,
	useApproveVramsRequestMutation,
	useRejectVramsRequestMutation,
	useGetVramsVehiclesQuery,
	useGetVramsVehicleQuery,
	useCreateVramsVehicleMutation,
	useUpdateVramsVehicleMutation,
	useDeleteVramsVehicleMutation,
	useUpdateVramsVehicleStatusMutation,
	useGetVramsVehicleStatusLogsQuery,
	useGetVramsVehicleBookingsQuery,
	useGetVramsVehicleDocumentsQuery,
	useGetVramsFleetDocumentsQuery,
	useUploadVramsVehicleDocumentMutation,
	useGetVramsMaintenanceQuery,
	useGetVramsVehicleMaintenanceQuery,
	useGetVramsMaintenanceLogQuery,
	useCreateVramsMaintenanceMutation,
	useUpdateVramsMaintenanceMutation,
	useDeleteVramsMaintenanceMutation,
	useGetVramsDispatchPendingQuery,
	useGetVramsDispatchTodayQuery,
	useAssignVramsDispatchMutation,
	useUpdateVramsDispatchMutation,
	useUpdateVramsDispatchStatusMutation,
	useGetVramsNotificationsQuery,
	useGetVramsUnreadNotificationCountQuery,
	useMarkVramsNotificationReadMutation,
	useMarkAllVramsNotificationsReadMutation,
	useGetVramsReportSummaryQuery,
	useGetVramsOperationalAlertsQuery,
	useGetVramsAuditLogsQuery,
	useGetVramsDriversQuery,
	useGetVramsUsersQuery,
	useInviteVramsUserMutation,
	useAcceptVramsInviteMutation,
	useUpdateVramsUserMutation,
	useGetVramsOrganizationSettingsQuery,
	usePatchVramsOrganizationSettingsMutation
} = VramsApi;
