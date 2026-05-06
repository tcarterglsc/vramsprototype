import { apiService as api } from 'src/store/apiService';
import type { Dispatch, VramsRequest } from '../types';

const dispatchService = api
	.enhanceEndpoints({
		addTagTypes: [
			'vrams_dispatch_pending',
			'vrams_dispatch_today',
			'vrams_requests',
			'vrams_vehicles',
			'vrams_dashboard'
		]
	})
	.injectEndpoints({
		endpoints: (build) => ({
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
			})
		}),
		overrideExisting: false
	});

export default dispatchService;

export const {
	useGetVramsDispatchPendingQuery,
	useGetVramsDispatchTodayQuery,
	useAssignVramsDispatchMutation,
	useUpdateVramsDispatchStatusMutation
} = dispatchService;
