import { useNavigate } from 'react-router';
import Skeleton from '@mui/material/Skeleton';
import {
	useGetVramsDashboardQuery,
	useGetVramsRequestsQuery,
	useGetVramsMaintenanceQuery,
	useGetVramsReportSummaryQuery,
	useGetVramsOperationalAlertsQuery,
	useGetVramsAuditLogsQuery
} from '../VramsApi';
import type { VramsRequest, MaintenanceLog } from '../types';
import { VramsCard, VramsPage } from '../components/VramsUi';
import VehicleIllustration from '../components/VehicleIllustration';
import { VramsListBlockSkeleton } from '../components/VramsLoadingSkeletons';
import {
	requestRef,
	requestDestinationText,
	requestStartTime,
	requestStateKey,
	requestPriorityKey,
	userDisplayName,
	vehiclePlateNumber,
	vehicleStatusKey,
	serviceDate,
	serviceTypeLabel,
	vehicleTypeLabel
} from '../utils/erdView';

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, string> = {
		urgent: 'bg-red-100 text-red-700 border border-red-200',
		high: 'bg-amber-100 text-amber-700 border border-amber-200',
		normal: 'bg-slate-100 text-slate-700 border border-slate-200'
	};
	return (
		<span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
			{status}
		</span>
	);
}

function MiniBarChart({
	data
}: {
	data: { label: string; value: number; color: string }[];
}) {
	const max = Math.max(...data.map((d) => d.value), 1);
	return (
		<div className="flex items-end gap-3 h-36">
			{data.map((d) => (
				<div key={d.label} className="flex-1 flex flex-col items-center gap-2">
					<div className="text-xs font-bold text-slate-700">{d.value}</div>
					<div className="w-full rounded-md bg-slate-100 overflow-hidden flex items-end" style={{ height: 88 }}>
						<div style={{ width: '100%', height: `${Math.max(8, Math.round((d.value / max) * 100))}%`, background: d.color }} />
					</div>
					<div className="text-[11px] font-semibold text-slate-500">{d.label}</div>
				</div>
			))}
		</div>
	);
}

function VramsDashboard() {
	const navigate = useNavigate();
	const { data: stats, isLoading: loadStats } = useGetVramsDashboardQuery();
	const { data: requestsPage, isLoading: loadRequests } = useGetVramsRequestsQuery({ per_page: 5, page: 1 });
	const { data: maintenancePage, isLoading: loadMaint } = useGetVramsMaintenanceQuery({ page: 1 });
	const { data: monthlyReport, isLoading: loadReport } = useGetVramsReportSummaryQuery();
	const { data: alerts, isLoading: loadAlerts } = useGetVramsOperationalAlertsQuery();
	const { data: auditPage, isLoading: loadAudit } = useGetVramsAuditLogsQuery({ per_page: 3, page: 1 });

	const requests: VramsRequest[] = requestsPage?.items ?? [];
	const maintenance: MaintenanceLog[] = maintenancePage?.items ?? [];
	const pending = requests.filter((r) => requestStateKey(r) === 'pending').slice(0, 3);
	const leadDispatch = requests.find((r) => requestStateKey(r) === 'approved') ?? requests[0];
	const totalRequests = requests.length || 1;
	const urgentCount = requests.filter((r) => requestPriorityKey(r) === 'urgent').length;
	const highCount = requests.filter((r) => requestPriorityKey(r) === 'high').length;
	const normalCount = requests.filter((r) => requestPriorityKey(r) === 'normal').length;
	const approvedCount = requests.filter((r) => requestStateKey(r) === 'approved').length;
	const dispatchedCount = requests.filter((r) => requestStateKey(r) === 'dispatched').length;
	const rejectedCount = requests.filter((r) => requestStateKey(r) === 'rejected').length;
	const completedCount = requests.filter((r) => requestStateKey(r) === 'completed').length;

	return (
		<VramsPage>
			<div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-1">
				<div className="relative pl-4 opacity-100">
					<span className="absolute left-0 top-1 bottom-1 w-1 rounded-full bg-yellow-400" />
					<p className="text-xs font-bold uppercase tracking-wider text-slate-600">Thursday, October 24</p>
					<h1 className="mt-1 text-5xl font-bold text-slate-900 tracking-tight">Good morning.</h1>
					{loadStats ? (
						<Skeleton variant="rounded" width="100%" height={28} animation="wave" className="mt-2 max-w-xl" />
					) : (
						<p className="mt-1.5 text-slate-700 text-base font-medium">
							You have <span className="font-semibold text-slate-900">{(stats?.pending_requests ?? 0) + (stats?.overdue_services ?? 0)} items</span>{' '}
							needing attention today —{' '}
							<span className="font-semibold text-red-600">{stats?.pending_requests ?? 0} urgent</span>.
						</p>
					)}
				</div>
				<VramsCard className="px-4 py-3 w-full md:w-auto">
					<p className="text-xs uppercase tracking-wider text-slate-600 font-bold">Yesterday</p>
					<p className="text-base font-bold text-slate-900">18 requests cleared</p>
				</VramsCard>
			</div>

			<div className="grid gap-6 lg:grid-cols-[1fr_330px]">
				<div className="space-y-6">
					<div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
						<VramsCard className="overflow-hidden">
							<div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
								<div>
									<p className="text-lg font-bold text-slate-900">Needs your review</p>
									<p className="text-sm text-slate-600">Approve or reject without leaving this page.</p>
								</div>
								<button type="button" onClick={() => navigate('/apps/vrams/requests')} className="text-sm font-semibold text-indigo-600 hover:underline">
									See all →
								</button>
							</div>
							<div className="divide-y divide-slate-100">
								{loadRequests ? (
									<div className="px-5 py-4">
										<VramsListBlockSkeleton items={3} />
									</div>
								) : pending.length === 0 ? (
									<div className="px-5 py-8 text-sm text-slate-400 text-center">No pending requests right now.</div>
								) : (
									pending.map((r) => {
										const requesterName = r.requester ? userDisplayName(r.requester) : 'Unknown requester';
										const requesterDept = r.requester?.department ?? 'Department not set';
										const ref = requestRef(r);
										const destination = requestDestinationText(r);
										const startTime = requestStartTime(r);
										const priority = requestPriorityKey(r);
										
										return (
											<div key={r.id} className="px-5 py-4 flex items-start justify-between gap-3 hover:bg-slate-50">
												<div className="min-w-0">
													<p className="font-semibold text-slate-900">{requesterName}</p>
													<p className="text-xs text-slate-600">{requesterDept} · {ref}</p>
													<p className="text-base text-slate-800 mt-1 font-medium">{destination}</p>
													<p className="text-xs text-slate-600 mt-1">
														{new Date(startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
													</p>
												</div>
												<div className="flex items-center gap-2">
													<StatusBadge status={priority} />
													<button
														type="button"
														onClick={() => navigate(`/apps/vrams/requests?open=${r.id}`)}
														className="px-3 py-1.5 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700"
													>
														Review
													</button>
												</div>
											</div>
										);
									})
								)}
							</div>
						</VramsCard>

						<VramsCard className="px-5 py-4 flex flex-col justify-between">
							<div>
								{loadReport ? (
									<>
										<Skeleton variant="text" width="55%" animation="wave" />
										<Skeleton variant="text" width="90%" height={36} animation="wave" />
										<Skeleton variant="text" width="70%" animation="wave" />
									</>
								) : (
									<>
										<p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Ops Summary — {monthlyReport?.month ?? 'Current Month'}</p>
										<p className="text-2xl font-bold text-slate-900 mt-1">{monthlyReport?.dispatch_volume ?? 0} dispatches · KES {Math.round(monthlyReport?.maintenance_cost_kes ?? 0).toLocaleString()}</p>
										<p className="text-xs text-slate-600 mt-1">
											{monthlyReport?.requests_completed ?? 0} requests completed out of {monthlyReport?.request_volume ?? 0}
										</p>
									</>
								)}
							</div>
							<button type="button" className="mt-4 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 self-start">
								Monthly report synced
							</button>
						</VramsCard>
					</div>

					<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
						<VramsCard className="overflow-hidden xl:col-span-2">
							<div className="px-5 py-4 border-b border-slate-100">
								<p className="text-lg font-bold text-slate-900">Fleet Pulse</p>
								<p className="text-sm text-slate-600">Real-time health of your operations</p>
							</div>
							<div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100">
								{loadStats
									? Array.from({ length: 4 }).map((_, i) => (
										<div key={i} className="px-4 py-4">
											<Skeleton variant="text" width="70%" animation="wave" />
											<Skeleton variant="text" width="40%" height={40} animation="wave" />
											<Skeleton variant="text" width="55%" animation="wave" />
										</div>
									))
									: [
										{ label: 'Available Vehicles', value: stats?.vehicles_available ?? 0, sub: `of ${stats?.vehicles_total ?? 0} total`, tone: 'text-emerald-600' },
										{ label: 'On the Road', value: stats?.active_dispatches ?? 0, sub: 'active dispatches', tone: 'text-blue-600' },
										{ label: 'Blocked', value: stats?.blocked_vehicles ?? 0, sub: 'expired docs', tone: 'text-red-600' },
										{ label: 'Service Overdue', value: stats?.overdue_services ?? 0, sub: 'past due interval', tone: 'text-amber-600' }
									].map((m) => (
										<div key={m.label} className="px-4 py-4">
											<p className="text-xs uppercase tracking-wider text-slate-500 font-bold">{m.label}</p>
											<p className={`text-3xl font-bold mt-1 ${m.tone}`}>{m.value}</p>
											<p className="text-sm text-slate-600">{m.sub}</p>
										</div>
									))}
							</div>
							<div className="p-4 space-y-2">
								{loadAlerts ? (
									<>
										<Skeleton variant="rounded" height={48} animation="wave" />
										<Skeleton variant="rounded" height={48} animation="wave" />
									</>
								) : (
									<>
										<div className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2">
											<p className="text-base text-red-700"><strong>{alerts?.blocked_vehicles?.length ?? stats?.blocked_vehicles ?? 0}</strong> vehicles blocked from booking</p>
											<button type="button" onClick={() => navigate('/apps/vrams/vehicles')} className="text-xs font-semibold text-red-700 hover:underline">
												Review vehicles
											</button>
										</div>
										<div className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
											<p className="text-base text-amber-700"><strong>{alerts?.overdue_services?.length ?? stats?.overdue_services ?? 0}</strong> services overdue</p>
											<button type="button" onClick={() => navigate('/apps/vrams/maintenance')} className="text-xs font-semibold text-amber-700 hover:underline">
												Book service
											</button>
										</div>
									</>
								)}
							</div>
						</VramsCard>

						<div className="space-y-6">
							<VramsCard className="p-5">
								<p className="text-lg font-bold text-slate-900">Request Flow (This Week)</p>
								<p className="text-sm text-slate-600 mb-4">Approved, dispatched, completed and rejected trends</p>
								{loadRequests ? (
									<Skeleton variant="rounded" height={144} animation="wave" />
								) : (
									<MiniBarChart
										data={[
											{ label: 'Approved', value: approvedCount, color: '#4f46e5' },
											{ label: 'Dispatched', value: dispatchedCount, color: '#2563eb' },
											{ label: 'Completed', value: completedCount, color: '#16a34a' },
											{ label: 'Rejected', value: rejectedCount, color: '#dc2626' }
										]}
									/>
								)}
							</VramsCard>

							<VramsCard className="p-5">
								<p className="text-lg font-bold text-slate-900">Priority Mix</p>
								<p className="text-sm text-slate-600 mb-4">Distribution of request urgency levels</p>
								{loadRequests ? (
									<div className="flex items-center gap-5">
										<Skeleton variant="circular" width={144} height={144} animation="wave" />
										<div className="space-y-2 flex-1">
											<Skeleton variant="text" animation="wave" />
											<Skeleton variant="text" animation="wave" />
											<Skeleton variant="text" animation="wave" />
										</div>
									</div>
								) : (
								<div className="flex items-center gap-5">
									<div
										className="w-36 h-36 rounded-full border border-slate-200"
										style={{
											background: `conic-gradient(#dc2626 0 ${Math.round((urgentCount / totalRequests) * 360)}deg, #d97706 ${Math.round((urgentCount / totalRequests) * 360)}deg ${Math.round(((urgentCount + highCount) / totalRequests) * 360)}deg, #64748b ${Math.round(((urgentCount + highCount) / totalRequests) * 360)}deg 360deg)`
										}}
									/>
									<div className="space-y-2 text-sm">
										<div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-600" /> <span className="text-slate-700 font-semibold">Urgent:</span> <span className="text-slate-900 font-bold">{urgentCount}</span></div>
										<div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-600" /> <span className="text-slate-700 font-semibold">High:</span> <span className="text-slate-900 font-bold">{highCount}</span></div>
										<div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-500" /> <span className="text-slate-700 font-semibold">Normal:</span> <span className="text-slate-900 font-bold">{normalCount}</span></div>
									</div>
								</div>
								)}
							</VramsCard>
						</div>
					</div>

				</div>

				<aside className="space-y-4">
					<VramsCard
						className="p-4 text-white"
						style={{
							background: 'linear-gradient(135deg, #1f2937 0%, #020617 100%)',
							borderColor: '#1f2937'
						}}
					>
						<div className="flex items-center justify-between">
							<p className="text-sm font-bold uppercase tracking-wider text-slate-200">Driver on Duty</p>
							<span className="text-[11px] bg-white/15 rounded-full px-2 py-0.5">Active</span>
						</div>
						{loadRequests ? (
							<>
								<Skeleton variant="text" width="80%" height={28} animation="wave" sx={{ bgcolor: 'rgba(255,255,255,0.12)', mt: 1 }} />
								<Skeleton variant="text" width="60%" animation="wave" sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
							</>
						) : (
							<>
						<p className="mt-2 text-lg font-bold">{leadDispatch?.requester?.name ?? 'Driver not assigned'}</p>
						<p className="text-sm text-slate-200 mt-0.5">{leadDispatch?.destination ?? 'No active route'}</p>
							</>
						)}
						<div className="mt-3 flex gap-2">
							<button type="button" className="flex-1 rounded-lg bg-white text-slate-900 text-sm font-bold py-2">Call</button>
							<button type="button" className="flex-1 rounded-lg border border-white/40 text-white text-sm font-bold py-2">Message</button>
						</div>
					</VramsCard>

					<VramsCard className="overflow-hidden">
						<div className="px-4 py-3 border-b border-slate-100">
							<p className="text-base font-bold text-slate-900">Upcoming Services</p>
							<p className="text-sm text-slate-600">Next 7 days</p>
						</div>
						<div className="p-3 space-y-2">
							{loadMaint ? (
								<VramsListBlockSkeleton items={3} />
							) : maintenance.length === 0 ? (
								<p className="text-sm text-slate-400 px-1 py-2">No upcoming services.</p>
							) : (
								maintenance.slice(0, 3).map((m) => (
									<button
										key={m.id}
										type="button"
										onClick={() => m.vehicle_id && navigate(`/apps/vrams/vehicles/${m.vehicle_id}`)}
										disabled={!m.vehicle_id}
										className="w-full text-left rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 flex gap-2.5 items-center hover:bg-slate-100 transition-colors disabled:opacity-70"
										title={m.vehicle_id ? 'Open vehicle preview' : 'Vehicle unavailable'}
									>
										<div className="w-16 h-12 rounded-md bg-white border border-slate-100 p-1.5 flex items-center justify-center shrink-0">
											<VehicleIllustration
												vehicleType={m.vehicle?.vehicle_type}
												color={m.vehicle?.color}
												style={{ width: '100%', maxHeight: 34 }}
											/>
										</div>
										<div className="min-w-0">
											<p className="text-sm font-semibold text-slate-800 truncate">{m.vehicle?.plate ?? `#${m.vehicle_id}`}</p>
											<p className="text-xs text-slate-500 truncate">{m.service_type}</p>
											<p className="text-xs text-slate-500 mt-0.5">
												{m.next_due_date
													? new Date(m.next_due_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
													: 'Date not set'}
											</p>
										</div>
									</button>
								))
							)}
						</div>
						<div className="p-3 border-t border-slate-100 flex gap-2">
							<button type="button" onClick={() => navigate('/apps/vrams/maintenance')} className="flex-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 py-2 hover:bg-slate-50">
								Log service
							</button>
							<button type="button" onClick={() => navigate('/apps/vrams/vehicles')} className="flex-1 rounded-lg border border-red-200 text-xs font-semibold text-red-600 py-2 hover:bg-red-50">
								Out of service
							</button>
						</div>
					</VramsCard>
					<VramsCard className="overflow-hidden">
						<div className="px-4 py-3 border-b border-slate-100">
							<p className="text-base font-bold text-slate-900">Recent Audit Activity</p>
							<p className="text-sm text-slate-600">Latest sensitive operational changes</p>
						</div>
						<div className="p-3 space-y-2">
							{loadAudit ? (
								<VramsListBlockSkeleton items={3} />
							) : (auditPage?.items ?? []).length === 0 ? (
								<p className="text-sm text-slate-400 px-1 py-2">No recent audit activity.</p>
							) : (
								(auditPage?.items ?? []).map((log) => (
									<div key={log.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
										<p className="text-xs uppercase tracking-wide text-slate-500">{log.entity_type}</p>
										<p className="text-sm font-semibold text-slate-800">{log.action.split('_').join(' ')}</p>
										<p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</p>
									</div>
								))
							)}
						</div>
					</VramsCard>
				</aside>
			</div>
		</VramsPage>
	);
}

export default VramsDashboard;
