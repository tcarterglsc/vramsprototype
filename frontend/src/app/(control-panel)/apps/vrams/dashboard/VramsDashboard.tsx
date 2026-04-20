import { useNavigate } from 'react-router';
import {
	useGetVramsDashboardQuery,
	useGetVramsRequestsQuery,
	useGetVramsMaintenanceQuery
} from '../VramsApi';
import type { VramsRequest, MaintenanceLog } from '../types';

function StatCard({
	title,
	value,
	sub,
	subColor = 'text-gray-500',
	accent = false
}: {
	title: string;
	value: string | number;
	sub?: string;
	subColor?: string;
	accent?: boolean;
}) {
	return (
		<div className={`bg-white rounded-2xl border p-7 flex flex-col gap-3 ${accent ? 'border-red-200' : 'border-gray-200'}`}>
			<p className="text-sm font-bold tracking-widest text-gray-400 uppercase">{title}</p>
			<p className={`text-6xl font-bold leading-none ${accent ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
			{sub && (
				<p className={`text-base font-medium flex items-center gap-1.5 ${subColor}`}>
					{accent && <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />}
					{sub}
				</p>
			)}
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, string> = {
		pending: 'bg-yellow-100 text-yellow-700',
		approved: 'bg-green-100 text-green-700',
		dispatched: 'bg-blue-100 text-blue-700',
		rejected: 'bg-gray-100 text-gray-500',
		completed: 'bg-emerald-100 text-emerald-700',
		cancelled: 'bg-red-100 text-red-600',
		urgent: 'bg-red-100 text-red-700',
		high: 'bg-orange-100 text-orange-700',
		normal: 'bg-blue-100 text-blue-700'
	};
	return (
		<span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
			{(status === 'approved' || status === 'dispatched' || status === 'pending') && '● '}
			{status}
		</span>
	);
}

function VramsDashboard() {
	const navigate = useNavigate();
	const { data: stats } = useGetVramsDashboardQuery();
	const { data: requestsPage } = useGetVramsRequestsQuery({ per_page: 5, page: 1 });
	const { data: maintenancePage } = useGetVramsMaintenanceQuery({ per_page: 5 });

	const requests: VramsRequest[] = requestsPage?.items ?? [];
	const maintenance: MaintenanceLog[] = maintenancePage?.items ?? [];

	return (
		<div className="p-8 space-y-8">

			{/* Welcome Banner */}
			<div className="bg-blue-50 border border-blue-100 rounded-2xl px-8 py-7 flex items-center gap-6">
				<div className="hidden sm:block flex-shrink-0 opacity-50">
					<svg viewBox="0 0 80 48" fill="none" style={{ width: 96 }}>
						<rect x="2" y="18" width="76" height="26" rx="5" fill="#93c5fd" />
						<rect x="12" y="10" width="56" height="22" rx="5" fill="#bfdbfe" />
						<circle cx="18" cy="44" r="7" fill="#1e40af" />
						<circle cx="62" cy="44" r="7" fill="#1e40af" />
						<circle cx="18" cy="44" r="3" fill="#1e3a8a" />
						<circle cx="62" cy="44" r="3" fill="#1e3a8a" />
					</svg>
				</div>
				<p className="text-lg font-medium text-blue-900 leading-relaxed">
					<strong className="font-bold">Welcome Back!</strong>{' '}
					{stats?.blocked_vehicles
						? `${stats.blocked_vehicles} vehicle${stats.blocked_vehicles > 1 ? 's are' : ' is'} currently blocked from booking due to expired documents. Review them before assigning to requests.`
						: 'All vehicles are in compliance. Fleet is ready for dispatch.'}
				</p>
				{stats?.blocked_vehicles ? (
					<button
						type="button"
						onClick={() => navigate('/apps/vrams/vehicles')}
						className="ml-auto flex-shrink-0 text-base font-semibold text-blue-700 hover:underline whitespace-nowrap"
					>
						Review vehicles →
					</button>
				) : null}
			</div>

			{/* Stat Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
				<StatCard title="Pending Requests" value={stats?.pending_requests ?? 0} sub="↑ +2 today" subColor="text-green-600" />
				<StatCard title="Vehicles Available" value={stats?.vehicles_available ?? 0} sub={`/ ${stats?.vehicles_total ?? 0} total`} />
				<StatCard title="Active Dispatches" value={stats?.active_dispatches ?? 0} sub="↑ +1 today" subColor="text-green-600" />
				<StatCard
					title="Overdue Services"
					value={stats?.overdue_services ?? 0}
					sub={stats?.overdue_services ? 'Requires attention' : 'All on schedule'}
					subColor={stats?.overdue_services ? 'text-red-600' : 'text-gray-500'}
					accent={!!stats?.overdue_services}
				/>
			</div>

			{/* Bottom Row */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

				{/* Recent Requests table */}
				<div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
					<div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
						<p className="text-lg font-bold text-gray-900">Recent Requests</p>
						<button
							type="button"
							onClick={() => navigate('/apps/vrams/requests')}
							className="text-base font-semibold text-blue-600 hover:underline"
						>
							View all →
						</button>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="bg-gray-50 border-b border-gray-100">
									{['REF & REQUESTER', 'TRIP DATE', 'PRIORITY', 'STATUS', 'ACTION'].map((h) => (
										<th key={h} className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{requests.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-6 py-14 text-center text-gray-400 text-base">
											No requests yet
										</td>
									</tr>
								) : (
									requests.map((r) => (
										<tr key={r.id} className="hover:bg-gray-50">
											<td className="px-6 py-5">
												<p className="font-bold text-blue-600 text-base">{r.ref}</p>
												<p className="text-sm text-gray-500 mt-0.5">
													{r.requester?.name}
													{r.requester?.department ? ` (${r.requester.department})` : ''}
												</p>
											</td>
											<td className="px-6 py-5 text-base text-gray-700 whitespace-nowrap">
												{new Date(r.departure_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
												{', '}
												{new Date(r.departure_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
											</td>
											<td className="px-6 py-5">
												<StatusBadge status={r.priority} />
											</td>
											<td className="px-6 py-5">
												<StatusBadge status={r.status} />
											</td>
											<td className="px-6 py-5">
												{r.status === 'pending' ? (
													<button
														type="button"
														className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
														onClick={() => navigate(`/apps/vrams/requests?open=${r.id}`)}
													>
														Review
													</button>
												) : (
													<button
														type="button"
														className="px-4 py-2 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
														onClick={() => navigate(`/apps/vrams/requests?open=${r.id}`)}
													>
														View
													</button>
												)}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>

				{/* Upcoming Services sidebar */}
				<div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
					<div className="px-6 py-5 border-b border-gray-100">
						<p className="text-lg font-bold text-gray-900">Upcoming Services</p>
					</div>

					<div className="mx-5 mt-5 rounded-xl overflow-hidden bg-gray-100 h-44 flex items-center justify-center">
						<svg viewBox="0 0 160 80" fill="none" style={{ width: 160, opacity: 0.35 }}>
							<rect x="5" y="25" width="150" height="40" rx="8" fill="#9ca3af" />
							<rect x="20" y="15" width="120" height="35" rx="6" fill="#d1d5db" />
							<circle cx="35" cy="65" r="12" fill="#6b7280" />
							<circle cx="125" cy="65" r="12" fill="#6b7280" />
							<circle cx="35" cy="65" r="6" fill="#374151" />
							<circle cx="125" cy="65" r="6" fill="#374151" />
						</svg>
					</div>

					<div className="flex-1 px-5 py-4 space-y-1">
						{maintenance.length === 0 ? (
							<p className="text-base text-gray-400 text-center py-4">No upcoming services</p>
						) : (
							maintenance.slice(0, 3).map((m) => {
								const days = m.next_due_date
									? Math.ceil((new Date(m.next_due_date).getTime() - Date.now()) / 86400000)
									: null;
								const color =
									days === null ? 'text-gray-400' : days < 0 ? 'text-red-600' : days < 30 ? 'text-amber-600' : 'text-green-600';
								return (
									<div key={m.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
										<div>
											<p className="text-base font-bold text-gray-800">{m.vehicle?.plate ?? `#${m.vehicle_id}`}</p>
											<p className="text-sm text-gray-500">{m.service_type}</p>
										</div>
										<span className={`text-base font-semibold ${color}`}>
											{m.next_due_date
												? new Date(m.next_due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
												: '—'}
										</span>
									</div>
								);
							})
						)}
					</div>

					<div className="px-5 pb-6 space-y-2.5">
						<p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
						{[
							{ label: 'Change Status', color: 'text-blue-600', path: '/apps/vrams/vehicles' },
							{ label: 'Log Service', color: 'text-amber-600', path: '/apps/vrams/maintenance' },
							{ label: 'Mark Out of Service', color: 'text-red-600', path: '/apps/vrams/vehicles' }
						].map((a) => (
							<button
								key={a.label}
								type="button"
								className={`w-full text-left px-5 py-3.5 rounded-xl border border-gray-200 text-base font-semibold ${a.color} hover:bg-gray-50 transition-colors`}
								onClick={() => navigate(a.path)}
							>
								{a.label}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export default VramsDashboard;
