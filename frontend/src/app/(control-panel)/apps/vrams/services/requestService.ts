import { apiService as api } from 'src/store/apiService';
import type { PaginatedResponse, VramsRequest } from '../types';

const requestService = api
	.enhanceEndpoints({ addTagTypes: ['vrams_requests', 'vrams_request', 'vrams_dashboard'] })
	.injectEndpoints({
		endpoints: (build) => ({
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
			})
		}),
		overrideExisting: false
	});

export default requestService;

export const {
	useGetVramsRequestsQuery,
	useGetVramsRequestQuery,
	useCreateVramsRequestMutation,
	useApproveVramsRequestMutation,
	useRejectVramsRequestMutation
} = requestService;
