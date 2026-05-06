import { apiService as api } from 'src/store/apiService';
import type { MaintenanceLog, PaginatedResponse } from '../types';

const maintenanceService = api
	.enhanceEndpoints({ addTagTypes: ['vrams_maintenance', 'vrams_vehicle', 'vrams_dashboard'] })
	.injectEndpoints({
		endpoints: (build) => ({
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
			})
		}),
		overrideExisting: false
	});

export default maintenanceService;

export const {
	useGetVramsMaintenanceQuery,
	useGetVramsVehicleMaintenanceQuery,
	useCreateVramsMaintenanceMutation
} = maintenanceService;
