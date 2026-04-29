import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useSnackbar } from 'notistack';
import {
	useGetVramsDispatchPendingQuery,
	useGetVramsDispatchTodayQuery,
	useAssignVramsDispatchMutation,
	useUpdateVramsDispatchStatusMutation,
	useGetVramsVehiclesQuery,
	useGetVramsDriversQuery
} from '../VramsApi';
import type { VramsRequest, Dispatch } from '../types';
import { VramsCard, VramsHeader, VramsPage } from '../components/VramsUi';

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, string> = {
		en_route: 'bg-blue-100 text-blue-700',
		returned: 'bg-green-100 text-green-700',
		delayed: 'bg-red-100 text-red-700',
		cancelled: 'bg-gray-100 text-gray-500'
	};
	return (
		<span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
			● {status.replace('_', ' ')}
		</span>
	);
}

function AssignmentRow({ request }: { request: VramsRequest }) {
	const { enqueueSnackbar } = useSnackbar();
	const { data: vehiclesPage } = useGetVramsVehiclesQuery({ status: 'available' });
	const { data: drivers } = useGetVramsDriversQuery();
	const [assign, { isLoading }] = useAssignVramsDispatchMutation();
	const [vehicleId, setVehicleId] = useState('');
	const [driverId, setDriverId] = useState('');
	const [dispatched, setDispatched] = useState(false);

	async function handleDispatch() {
		if (!vehicleId || !driverId) {
			enqueueSnackbar('Select both a vehicle and driver first', { variant: 'warning' });
			return;
		}
		try {
			await assign({
				request_id: request.id,
				vehicle_id: Number(vehicleId),
				driver_id: Number(driverId)
			}).unwrap();
			setDispatched(true);
			enqueueSnackbar(`${request.ref} dispatched!`, { variant: 'success' });
		} catch {
			enqueueSnackbar('Dispatch failed', { variant: 'error' });
		}
	}

	return (
		<tr className={`border-b border-gray-100 ${dispatched ? 'opacity-40' : 'hover:bg-gray-50'}`}>
			<td className="px-6 py-5">
				<p className="text-base font-bold text-blue-600">{request.ref}</p>
				<p className="text-sm text-gray-600 mt-0.5">{request.requester?.name}</p>
				<p className="text-sm text-gray-400 mt-0.5">📍 HQ → {request.destination}</p>
			</td>
			<td className="px-6 py-5">
				<p className="text-base font-semibold text-gray-800">
					{new Date(request.departure_at).toLocaleDateString('en-GB', {
						weekday: 'short',
						day: 'numeric',
						month: 'short',
						year: 'numeric'
					})}
				</p>
				<p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
					🕗{' '}
					{new Date(request.departure_at).toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit'
					})}
				</p>
			</td>
			<td className="px-6 py-5">
				<TextField
					select
					value={vehicleId}
					onChange={(e) => setVehicleId(e.target.value)}
					sx={{ minWidth: 230 }}
					disabled={dispatched}
					label="Select Vehicle"
				>
					<MenuItem value="">— Select —</MenuItem>
					{(vehiclesPage?.items ?? []).map((v) => (
						<MenuItem key={v.id} value={v.id}>
							{v.plate} — {v.make} {v.model}
						</MenuItem>
					))}
				</TextField>
			</td>
			<td className="px-6 py-5">
				<TextField
					select
					value={driverId}
					onChange={(e) => setDriverId(e.target.value)}
					sx={{ minWidth: 210 }}
					disabled={dispatched}
					label="Select Driver"
				>
					<MenuItem value="">— Select —</MenuItem>
					{(drivers ?? []).map((d) => (
						<MenuItem key={d.id} value={d.id}>
							{d.name} — {d.driver_id_code}
						</MenuItem>
					))}
				</TextField>
			</td>
			<td className="px-6 py-5">
				{dispatched ? (
					<span className="px-4 py-2 bg-green-100 text-green-700 text-sm font-bold rounded-full">✓ Dispatched</span>
				) : (
					<button
						type="button"
						onClick={handleDispatch}
						disabled={isLoading}
						className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
					>
						{isLoading ? (
							<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
						) : '✈'}
						Dispatch
					</button>
				)}
			</td>
		</tr>
	);
}

function DispatchRow({ dispatch: d }: { dispatch: Dispatch }) {
	const { enqueueSnackbar } = useSnackbar();
	const [updateStatus] = useUpdateVramsDispatchStatusMutation();
	const [menuOpen, setMenuOpen] = useState(false);

	async function handle(status: string) {
		try {
			await updateStatus({ id: d.id, status }).unwrap();
			enqueueSnackbar(`Status updated to ${status}`, { variant: 'success' });
		} catch {
			enqueueSnackbar('Update failed', { variant: 'error' });
		}
		setMenuOpen(false);
	}

	return (
		<tr className="border-b border-gray-100 hover:bg-gray-50">
			<td className="px-6 py-5">
				<p className="text-base font-bold text-blue-600">{d.request?.ref}</p>
				<p className="text-sm text-gray-400 mt-0.5">📍 HQ → {d.request?.destination}</p>
			</td>
			<td className="px-6 py-5">
				<span className="bg-gray-100 rounded-lg px-3 py-1.5 font-mono text-sm font-bold text-gray-800">
					🚗 {d.vehicle?.plate}
				</span>
				<p className="text-sm text-gray-500 mt-1.5">
					{d.vehicle?.make} {d.vehicle?.model}
				</p>
			</td>
			<td className="px-6 py-5">
				<div className="flex items-center gap-3">
					<Avatar sx={{ width: 36, height: 36, bgcolor: '#1e40af', fontSize: 13, fontWeight: 700 }}>
						{d.driver?.name?.slice(0, 2)}
					</Avatar>
					<div>
						<p className="text-base font-semibold text-gray-800">{d.driver?.name}</p>
						<p className="text-sm text-gray-400">{d.driver?.driver_id_code}</p>
					</div>
				</div>
			</td>
			<td className="px-6 py-5">
				<p className="text-base font-semibold text-gray-800">
					{d.dispatched_at
						? new Date(d.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
						: '—'}
				</p>
				{d.returned_at && (
					<p className="text-sm text-green-600 mt-0.5">
						Returned {new Date(d.returned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
					</p>
				)}
			</td>
			<td className="px-6 py-5">
				<StatusBadge status={d.status} />
			</td>
			<td className="px-6 py-5 relative">
				<button
					type="button"
					onClick={() => setMenuOpen(!menuOpen)}
					className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xl transition-colors"
				>
					⋮
				</button>
				{menuOpen && (
					<div className="absolute right-5 top-10 bg-white border border-gray-200 rounded-xl shadow-xl z-10 min-w-[180px] overflow-hidden">
						<button
							type="button"
							className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
							onClick={() => handle('returned')}
						>
							✅ Mark Returned
						</button>
						<button
							type="button"
							className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
							onClick={() => handle('delayed')}
						>
							⚠️ Report Delay
						</button>
					</div>
				)}
			</td>
		</tr>
	);
}

function VramsDispatch() {
	const { data: pending, isLoading: pendingLoading } = useGetVramsDispatchPendingQuery();
	const { data: today, isLoading: todayLoading } = useGetVramsDispatchTodayQuery();

	const counts = {
		en_route: today?.filter((d) => d.status === 'en_route').length ?? 0,
		returned: today?.filter((d) => d.status === 'returned').length ?? 0,
		delayed: today?.filter((d) => d.status === 'delayed').length ?? 0
	};

	return (
		<VramsPage>
			{/* Header */}
			<VramsHeader
				title="Dispatch Management"
				subtitle="Assign vehicles and drivers to approved requests, and monitor today's dispatches."
			/>

			{/* Awaiting Assignment */}
			<VramsCard className="overflow-hidden">
				<div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
					<div className="flex items-center gap-4">
						<div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center text-xl">📋</div>
						<div>
							<p className="text-lg font-bold text-gray-900">Approved Requests — Awaiting Assignment</p>
							<p className="text-sm text-gray-500">Assign a vehicle and driver, then dispatch each approved request.</p>
						</div>
					</div>
					<span className="px-4 py-1.5 bg-amber-100 text-amber-700 text-sm font-bold rounded-full">
						{pending?.length ?? 0} Pending
					</span>
				</div>

				{pendingLoading ? (
					<p className="px-6 py-10 text-center text-gray-400 text-base">Loading…</p>
				) : !pending?.length ? (
					<p className="px-6 py-10 text-center text-gray-400 text-base">No requests awaiting dispatch.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="bg-gray-50 border-b border-gray-100">
									{['REF / REQUESTER / ROUTE', 'DEPARTURE DATE & TIME', 'ASSIGN VEHICLE', 'ASSIGN DRIVER', 'ACTION'].map(
										(h) => (
											<th
												key={h}
												className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
											>
												{h}
											</th>
										)
									)}
								</tr>
							</thead>
							<tbody>
								{pending.map((r) => (
									<AssignmentRow key={r.id} request={r} />
								))}
							</tbody>
						</table>
					</div>
				)}
			</VramsCard>

			{/* Today's Dispatches */}
			<VramsCard className="overflow-hidden">
				<div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-gray-100">
					<div className="flex items-center gap-4">
						<div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center text-xl">🔄</div>
						<div>
							<p className="text-lg font-bold text-gray-900">Today's Dispatches</p>
							<p className="text-sm text-gray-500">
								Live status of all dispatched vehicles for today —{' '}
								{new Date().toLocaleDateString('en-GB', {
									weekday: 'long',
									day: 'numeric',
									month: 'long',
									year: 'numeric'
								})}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<span className="flex items-center gap-1.5 text-sm font-bold text-green-600">
							<span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block" />
							Live
						</span>
						<span className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-bold rounded-full">
							{counts.en_route} En Route
						</span>
						<span className="px-3 py-1.5 bg-green-100 text-green-700 text-sm font-bold rounded-full">
							{counts.returned} Returned
						</span>
						{counts.delayed > 0 && (
							<span className="px-3 py-1.5 bg-red-100 text-red-700 text-sm font-bold rounded-full">
								{counts.delayed} Delayed
							</span>
						)}
					</div>
				</div>

				{todayLoading ? (
					<p className="px-6 py-10 text-center text-gray-400 text-base">Loading…</p>
				) : !today?.length ? (
					<p className="px-6 py-10 text-center text-gray-400 text-base">No dispatches today.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="bg-gray-50 border-b border-gray-100">
									{['REF / ROUTE', 'VEHICLE PLATE', 'DRIVER NAME', 'DEPARTED TIME', 'STATUS', 'ACTIONS'].map((h) => (
										<th
											key={h}
											className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{today.map((d) => (
									<DispatchRow key={d.id} dispatch={d} />
								))}
							</tbody>
						</table>
					</div>
				)}

				<div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 bg-gray-50">
					<span className="text-sm text-gray-500">
						Showing <strong>{today?.length ?? 0}</strong> dispatches for today
					</span>
					<div className="flex gap-5 text-sm font-medium">
						<span className="text-blue-600">● En Route: {counts.en_route}</span>
						<span className="text-green-600">● Returned: {counts.returned}</span>
						<span className="text-red-500">● Delayed: {counts.delayed}</span>
					</div>
				</div>
			</VramsCard>
		</VramsPage>
	);
}

export default VramsDispatch;
