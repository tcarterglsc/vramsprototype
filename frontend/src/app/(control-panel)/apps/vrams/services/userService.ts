import { apiService as api } from 'src/store/apiService';
import type { PaginatedResponse, VramsUser } from '../types';

const userService = api
	.enhanceEndpoints({ addTagTypes: ['vrams_drivers', 'vrams_users'] })
	.injectEndpoints({
		endpoints: (build) => ({
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

export default userService;

export const {
	useGetVramsDriversQuery,
	useGetVramsUsersQuery,
	useInviteVramsUserMutation,
	useUpdateVramsUserMutation
} = userService;
