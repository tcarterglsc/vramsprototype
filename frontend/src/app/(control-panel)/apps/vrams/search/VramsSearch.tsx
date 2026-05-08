import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
	useGetVramsRequestsQuery,
	useGetVramsVehiclesQuery,
	useGetVramsMaintenanceQuery,
	useGetVramsDispatchTodayQuery
} from '../VramsApi';
import { VramsCard, VramsHeader, VramsPage } from '../components/VramsUi';
import { VramsSearchListSkeleton } from '../components/VramsLoadingSkeletons';

function Highlight({ text, query }: { text: string; query: string }) {
	if (!query) return <>{text}</>;
	const idx = text.toLowerCase().indexOf(query.toLowerCase());
	if (idx < 0) return <>{text}</>;
	return (
		<>
			{text.slice(0, idx)}
			<mark className="bg-yellow-200 px-0.5 rounded-sm">{text.slice(idx, idx + query.length)}</mark>
			{text.slice(idx + query.length)}
		</>
	);
}

export default function VramsSearch() {
	const navigate = useNavigate();
	const location = useLocation();
	const q = useMemo(() => new URLSearchParams(location.search).get('q')?.trim() ?? '', [location.search]);

	const { data: requestsPage, isLoading: loadingRequests } = useGetVramsRequestsQuery({ q, page: 1, per_page: 20 });
	const { data: vehiclesPage, isLoading: loadingVehicles } = useGetVramsVehiclesQuery({ q, page: 1 });
	const { data: maintenancePage, isLoading: loadingMaintenance } = useGetVramsMaintenanceQuery({});
	const { data: dispatches, isLoading: loadingDispatches } = useGetVramsDispatchTodayQuery();

	const maintenanceMatches = useMemo(() => {
		if (!q) return [];
		const needle = q.toLowerCase();
		return (maintenancePage?.items ?? []).filter((m) => {
			const plate = m.vehicle?.plate?.toLowerCase() ?? '';
			const makeModel = `${m.vehicle?.make ?? ''} ${m.vehicle?.model ?? ''}`.toLowerCase();
			const serviceType = (m.service_type ?? '').toLowerCase();
			const technician = (m.technician ?? '').toLowerCase();
			return plate.includes(needle) || makeModel.includes(needle) || serviceType.includes(needle) || technician.includes(needle);
		});
	}, [maintenancePage, q]);

	const dispatchMatches = useMemo(() => {
		if (!q) return [];
		const needle = q.toLowerCase();
		return (dispatches ?? []).filter((d) => {
			const ref = (d.request?.ref ?? '').toLowerCase();
			const plate = (d.vehicle?.plate ?? '').toLowerCase();
			const driver = (d.driver?.name ?? '').toLowerCase();
			const dest = (d.request?.destination ?? '').toLowerCase();
			return ref.includes(needle) || plate.includes(needle) || driver.includes(needle) || dest.includes(needle);
		});
	}, [dispatches, q]);

	const requestItems = requestsPage?.items ?? [];
	const vehicleItems = vehiclesPage?.items ?? [];
	const total =
		requestItems.length + vehicleItems.length + maintenanceMatches.length + dispatchMatches.length;

	return (
		<VramsPage>
			<VramsHeader
				title={`Search results${q ? ` for "${q}"` : ''}`}
				subtitle="General VRAMS search across requests, vehicles, maintenance, and dispatch."
			/>

			{!q ? (
				<VramsCard className="p-8 text-center">
					<p className="text-lg font-semibold text-slate-700">Type in the top search bar to begin.</p>
				</VramsCard>
			) : (
				<>
					<div className="text-sm font-semibold text-slate-600">Found {total} result(s)</div>

					<VramsCard className="overflow-hidden">
						<div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
							<p className="text-base font-bold text-slate-900">Requests ({loadingRequests ? '…' : requestItems.length})</p>
						</div>
						<div className="divide-y divide-slate-100">
							{loadingRequests ? (
								<VramsSearchListSkeleton lines={5} />
							) : requestItems.length === 0 ? (
								<p className="px-5 py-3 text-sm text-slate-400">No request matches.</p>
							) : (
								requestItems.map((r) => (
									<button
										key={r.id}
										type="button"
										onClick={() => navigate(`/apps/vrams/requests?open=${r.id}`)}
										className="w-full text-left px-5 py-3 hover:bg-slate-50"
									>
										<p className="font-semibold text-slate-900"><Highlight text={`${r.ref} · ${r.requester?.name ?? 'Unknown'}`} query={q} /></p>
										<p className="text-sm text-slate-600"><Highlight text={r.destination} query={q} /></p>
									</button>
								))
							)}
						</div>
					</VramsCard>

					<VramsCard className="overflow-hidden">
						<div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
							<p className="text-base font-bold text-slate-900">Vehicles ({loadingVehicles ? '…' : vehicleItems.length})</p>
						</div>
						<div className="divide-y divide-slate-100">
							{loadingVehicles ? (
								<VramsSearchListSkeleton lines={5} />
							) : vehicleItems.length === 0 ? (
								<p className="px-5 py-3 text-sm text-slate-400">No vehicle matches.</p>
							) : (
								vehicleItems.map((v) => (
									<button
										key={v.id}
										type="button"
										onClick={() => navigate(`/apps/vrams/vehicles/${v.id}`)}
										className="w-full text-left px-5 py-3 hover:bg-slate-50"
									>
										<p className="font-semibold text-slate-900"><Highlight text={`${v.plate} · ${v.make} ${v.model}`} query={q} /></p>
										<p className="text-sm text-slate-600">{v.vehicle_type} · {v.status.replace('_', ' ')}</p>
									</button>
								))
							)}
						</div>
					</VramsCard>

					<VramsCard className="overflow-hidden">
						<div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
							<p className="text-base font-bold text-slate-900">Maintenance ({loadingMaintenance ? '…' : maintenanceMatches.length})</p>
						</div>
						<div className="divide-y divide-slate-100">
							{loadingMaintenance ? (
								<VramsSearchListSkeleton lines={4} />
							) : maintenanceMatches.length === 0 ? (
								<p className="px-5 py-3 text-sm text-slate-400">No maintenance matches.</p>
							) : (
								maintenanceMatches.map((m) => (
									<button
										key={m.id}
										type="button"
										onClick={() => navigate('/apps/vrams/maintenance')}
										className="w-full text-left px-5 py-3 hover:bg-slate-50"
									>
										<p className="font-semibold text-slate-900">
											<Highlight text={`${m.vehicle?.plate ?? `#${m.vehicle_id}`} · ${m.service_type}`} query={q} />
										</p>
										<p className="text-sm text-slate-600"><Highlight text={m.technician} query={q} /></p>
									</button>
								))
							)}
						</div>
					</VramsCard>

					<VramsCard className="overflow-hidden">
						<div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
							<p className="text-base font-bold text-slate-900">Dispatch ({loadingDispatches ? '…' : dispatchMatches.length})</p>
						</div>
						<div className="divide-y divide-slate-100">
							{loadingDispatches ? (
								<VramsSearchListSkeleton lines={4} />
							) : dispatchMatches.length === 0 ? (
								<p className="px-5 py-3 text-sm text-slate-400">No dispatch matches.</p>
							) : (
								dispatchMatches.map((d) => (
									<button
										key={d.id}
										type="button"
										onClick={() => navigate('/apps/vrams/dispatch')}
										className="w-full text-left px-5 py-3 hover:bg-slate-50"
									>
										<p className="font-semibold text-slate-900">
											<Highlight text={`${d.request?.ref ?? 'No ref'} · ${d.vehicle?.plate ?? 'No vehicle'}`} query={q} />
										</p>
										<p className="text-sm text-slate-600">
											<Highlight text={`${d.driver?.name ?? 'No driver'} · ${d.request?.destination ?? 'No destination'}`} query={q} />
										</p>
									</button>
								))
							)}
						</div>
					</VramsCard>
				</>
			)}
		</VramsPage>
	);
}

