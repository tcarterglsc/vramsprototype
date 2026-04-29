import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useSnackbar } from 'notistack';
import { useGetVramsVehicleQuery, useGetVramsDriversQuery, useUpdateVramsVehicleMutation } from '../../VramsApi';
import VehicleIllustration from '../../components/VehicleIllustration';
import OverviewTab from './tabs/OverviewTab';
import ServiceHistoryTab from './tabs/ServiceHistoryTab';
import StatusLogTab from './tabs/StatusLogTab';
import BookingsTab from './tabs/BookingsTab';
import ChangeStatusModal from './ChangeStatusModal';
import { VramsCard, VramsPage } from '../../components/VramsUi';

const TABS = [
	{ value: 'overview', label: 'Overview' },
	{ value: 'service', label: 'Service History' },
	{ value: 'log', label: 'Status Change Log' },
	{ value: 'bookings', label: 'Active Bookings' }
];

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, string> = {
		available: 'bg-green-100 text-green-700',
		in_service: 'bg-amber-100 text-amber-700',
		out_of_service: 'bg-red-100 text-red-600',
		dispatched: 'bg-blue-100 text-blue-700'
	};
	return (
		<span className={`px-3 py-1 rounded-full text-sm font-bold capitalize ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
			● {status.replace('_', ' ')}
		</span>
	);
}

function VehicleProfile() {
	const { vehicleId } = useParams<{ vehicleId: string }>();
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const [tab, setTab] = useState('overview');
	const [statusModalOpen, setStatusModalOpen] = useState(false);
	const [assignDriverId, setAssignDriverId] = useState<string>('');
	const { data: vehicle, isLoading } = useGetVramsVehicleQuery(Number(vehicleId));
	const { data: drivers = [] } = useGetVramsDriversQuery();
	const [updateVehicle, { isLoading: isAssigning }] = useUpdateVramsVehicleMutation();

	useEffect(() => {
		setAssignDriverId(vehicle?.default_driver?.id ? String(vehicle.default_driver.id) : '');
	}, [vehicle?.id, vehicle?.default_driver?.id]);

	async function handleAssignDriver() {
		if (!vehicle) return;
		try {
			await updateVehicle({
				id: vehicle.id,
				default_driver_id: assignDriverId ? Number(assignDriverId) : null
			}).unwrap();
			enqueueSnackbar('Driver assignment updated.', { variant: 'success' });
		} catch {
			enqueueSnackbar('Failed to update driver assignment.', { variant: 'error' });
		}
	}

	if (isLoading) {
		return <div className="flex items-center justify-center h-64 text-gray-400 text-base">Loading vehicle…</div>;
	}
	if (!vehicle) {
		return <div className="p-8 text-base text-gray-500">Vehicle not found.</div>;
	}

	return (
		<VramsPage className="space-y-6">
			{/* Vehicle header bar */}
			<VramsCard className="px-6 py-5 flex items-center gap-5 flex-wrap">
				<div className="w-36 flex-shrink-0 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl px-3 py-2 flex items-center justify-center">
					<VehicleIllustration
						vehicleType={vehicle.vehicle_type}
						color={vehicle.color}
						style={{ width: '100%', height: 64 }}
					/>
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-3 flex-wrap">
						<span className="text-2xl font-bold font-mono text-gray-900">{vehicle.plate}</span>
						<StatusBadge status={vehicle.status} />
						{vehicle.bookable && (
							<span className="px-3 py-1 rounded-full text-sm font-bold bg-blue-50 text-blue-700">✓ Bookable</span>
						)}
					</div>
					<p className="text-base text-gray-500 mt-1">
						{vehicle.make} {vehicle.model} · {vehicle.vehicle_type} · VIN: {vehicle.vin ?? '—'}
					</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						type="button"
						className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
					>
						✏ Edit
					</button>
					<button
						type="button"
						onClick={() => navigate('/apps/vrams/requests?new=1')}
						className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
					>
						📅 Book Now
					</button>
					<button
						type="button"
						onClick={() => navigate('/apps/vrams/vehicles')}
						className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 text-lg transition-colors"
					>
						✕
					</button>
				</div>
			</VramsCard>

			<VramsCard className="px-6 py-5">
				<div className="flex items-center justify-between gap-3 flex-wrap">
					<div>
						<p className="text-lg font-bold text-gray-900">Assign Driver to Vehicle</p>
						<p className="text-sm text-gray-500">Set or change the vehicle&apos;s default driver.</p>
					</div>
					<button
						type="button"
						onClick={handleAssignDriver}
						disabled={isAssigning}
						className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
					>
						{isAssigning ? 'Saving...' : 'Save Assignment'}
					</button>
				</div>
				<div className="mt-4 max-w-md">
					<select
						value={assignDriverId}
						onChange={(e) => setAssignDriverId(e.target.value)}
						className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">Unassigned</option>
						{drivers.map((d) => (
							<option key={d.id} value={d.id}>
								{d.name} {d.driver_id_code ? `- ${d.driver_id_code}` : ''}
							</option>
						))}
					</select>
				</div>
			</VramsCard>

			{/* Tab bar + content */}
			<VramsCard className="overflow-hidden">
				<div className="flex border-b border-gray-200 px-2">
					{TABS.map((t) => (
						<button
							key={t.value}
							type="button"
							onClick={() => setTab(t.value)}
							className={`px-5 py-4 text-base font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap ${
								tab === t.value
									? 'border-blue-600 text-blue-600'
									: 'border-transparent text-gray-500 hover:text-gray-800'
							}`}
						>
							{t.label}
							{t.value === 'bookings' && (
								<span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-sm rounded-full">3</span>
							)}
						</button>
					))}
				</div>

				<div className="p-6">
					{tab === 'overview' && <OverviewTab vehicle={vehicle} onChangeStatus={() => setStatusModalOpen(true)} />}
					{tab === 'service' && <ServiceHistoryTab vehicleId={vehicle.id} />}
					{tab === 'log' && <StatusLogTab vehicleId={vehicle.id} />}
					{tab === 'bookings' && <BookingsTab vehicleId={vehicle.id} />}
				</div>
			</VramsCard>

			{statusModalOpen && (
				<ChangeStatusModal vehicle={vehicle} onClose={() => setStatusModalOpen(false)} />
			)}
		</VramsPage>
	);
}

export default VehicleProfile;
