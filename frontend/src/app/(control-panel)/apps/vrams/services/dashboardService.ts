import { apiService as api } from 'src/store/apiService';
import type { DashboardStats } from '../types';

const dashboardService = api
	.enhanceEndpoints({ addTagTypes: ['vrams_dashboard'] })
	.injectEndpoints({
		endpoints: (build) => ({
			getVramsDashboard: build.query<DashboardStats, void>({
				query: () => ({ url: '/api/vrams/dashboard' }),
				providesTags: ['vrams_dashboard']
			})
		}),
		overrideExisting: false
	});

export default dashboardService;

export const { useGetVramsDashboardQuery } = dashboardService;
