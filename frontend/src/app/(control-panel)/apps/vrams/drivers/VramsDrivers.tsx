import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSnackbar } from 'notistack';
import { useGetVramsDriversQuery, useGetVramsDispatchTodayQuery, useGetVramsVehiclesQuery, useUpdateVramsVehicleMutation } from '../VramsApi';
import type { Dispatch, Vehicle, VramsUser } from '../types';
import { VramsCard, VramsPage } from '../components/VramsUi';

function statusTone(active: boolean): string {
	return active
		? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
		: 'bg-slate-100 text-slate-600 border border-slate-200';
}

export default function VramsDrivers() {
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const [query, setQuery] = useState('');
	const [selectedDriverId, setSelectedDriverId] = useState<string>('');
	const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
	const { data: drivers = [] } = useGetVramsDriversQuery();
	const { data: dispatches = [] } = useGetVramsDispatchTodayQuery();
	const { data: vehiclesPage } = useGetVramsVehiclesQuery({ page: 1 });
	const [updateVehicle, { isLoading: isAssigning }] = useUpdateVramsVehicleMutation();
	const vehicles = vehiclesPage?.items ?? [];

	const activeDispatchByDriver = useMemo(() => {
		const map = new Map<number, Dispatch>();
		dispatches.forEach((d) => {
			if (d.driver_id && d.status !== 'returned' && d.status !== 'cancelled') {
				map.set(d.driver_id, d);
			}
		});
		return map;
	}, [dispatches]);

	const filteredDrivers = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return drivers;
		return drivers.filter((d: VramsUser) =>
			[d.name, d.email, d.phone, d.department, d.driver_id_code, d.license_number]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q))
		);
	}, [drivers, query]);

	const vehicleByAssignedDriver = useMemo(() => {
		const map = new Map<number, Vehicle>();
		vehicles.forEach((v) => {
			if (v.default_driver?.id) {
				map.set(v.default_driver.id, v);
			}
		});
		return map;
	}, [vehicles]);

	async function handleAssignDriverToVehicle() {
		const driverId = Number(selectedDriverId);
		const vehicleId = Number(selectedVehicleId);
		if (!driverId || !vehicleId) {
			enqueueSnackbar('Select both a driver and a vehicle first.', { variant: 'warning' });
			return;
		}

		try {
			await updateVehicle({ id: vehicleId, default_driver_id: driverId }).unwrap();
			enqueueSnackbar('Driver assigned to vehicle successfully.', { variant: 'success' });
		} catch {
			enqueueSnackbar('Failed to assign driver to vehicle.', { variant: 'error' });
		}
	}

	return (
		<VramsPage>
			<div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
				<div>
					<p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Operations Crew</p>
					<h1 className="text-4xl font-bold text-slate-900 tracking-tight mt-1">Drivers</h1>
					<p className="text-sm text-slate-600 mt-1">Monitor driver availability, active trips and contact details.</p>
				</div>
				<div className="w-full md:w-80">
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search drivers..."
						className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
			</div>

			<VramsCard className="p-5">
				<div className="flex items-center justify-between gap-3 flex-wrap">
					<div>
						<p className="text-lg font-bold text-slate-900">Assign Driver to Vehicle</p>
						<p className="text-sm text-slate-600">Set a default driver for any fleet vehicle.</p>
					</div>
					<button
						type="button"
						onClick={handleAssignDriverToVehicle}
						disabled={isAssigning}
						className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
					>
						{isAssigning ? 'Assigning...' : 'Assign Driver'}
					</button>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
					<select
						value={selectedDriverId}
						onChange={(e) => setSelectedDriverId(e.target.value)}
						className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
					>
						<option value="">Select driver</option>
						{drivers.map((d: VramsUser) => (
							<option key={d.id} value={d.id}>
								{d.name} {d.driver_id_code ? `- ${d.driver_id_code}` : ''}
							</option>
						))}
					</select>
					<select
						value={selectedVehicleId}
						onChange={(e) => setSelectedVehicleId(e.target.value)}
						className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
					>
						<option value="">Select vehicle</option>
						{vehicles.map((v: Vehicle) => (
							<option key={v.id} value={v.id}>
								{v.plate} - {v.make} {v.model}
							</option>
						))}
					</select>
				</div>
			</VramsCard>

			<VramsCard className="overflow-hidden">
				<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
					<p className="text-lg font-bold text-slate-900">Driver Directory</p>
					<p className="text-sm text-slate-600">{filteredDrivers.length} drivers</p>
				</div>

				<div className="divide-y divide-slate-100">
					{filteredDrivers.length === 0 ? (
						<div className="px-5 py-8 text-center text-slate-500">No drivers found for this filter.</div>
					) : (
						filteredDrivers.map((driver: VramsUser) => {
							const activeDispatch = activeDispatchByDriver.get(driver.id);
							const assignedVehicle = vehicleByAssignedDriver.get(driver.id);
							return (
								<div key={driver.id} className="px-5 py-4 flex items-start justify-between gap-3 hover:bg-slate-50">
									<div className="min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<p className="font-semibold text-slate-900">{driver.name}</p>
											<span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusTone(driver.is_active)}`}>
												{driver.is_active ? 'Active' : 'Inactive'}
											</span>
											{activeDispatch ? (
												<span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
													On trip
												</span>
											) : null}
										</div>
										<p className="text-sm text-slate-600 mt-0.5">{driver.email}</p>
										<p className="text-xs text-slate-500 mt-0.5">
											{driver.phone ?? 'No phone'} · {driver.department ?? 'No department'}
										</p>
										<p className="text-xs text-slate-500 mt-0.5">
											License: {driver.license_number ?? 'Not set'} · ID: {driver.driver_id_code ?? 'Not set'}
										</p>
										<p className="text-xs text-slate-500 mt-0.5">
											Assigned vehicle: {assignedVehicle ? `${assignedVehicle.plate} (${assignedVehicle.make} ${assignedVehicle.model})` : 'Unassigned'}
										</p>
										{activeDispatch ? (
											<p className="text-sm text-slate-700 mt-1">
												Current route: {activeDispatch.request?.destination ?? 'Route details unavailable'}
											</p>
										) : null}
									</div>

									<div className="flex items-center gap-2 shrink-0">
										<a
											href={driver.phone ? `tel:${driver.phone}` : undefined}
											onClick={(e) => {
												if (!driver.phone) e.preventDefault();
											}}
											className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 no-underline"
										>
											Call
										</a>
										<button
											type="button"
											onClick={() => setSelectedDriverId(String(driver.id))}
											className="px-3 py-1.5 rounded-lg border border-indigo-200 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
										>
											Assign
										</button>
										<button
											type="button"
											onClick={() => navigate('/apps/vrams/dispatch')}
											className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
										>
											Dispatch
										</button>
									</div>
								</div>
							);
						})
					)}
				</div>
			</VramsCard>
		</VramsPage>
	);
}
