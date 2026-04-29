import { useState } from 'react';
import { useNavigate } from 'react-router';
import Switch from '@mui/material/Switch';
import { useGetVramsVehiclesQuery } from '../VramsApi';
import type { Vehicle } from '../types';
import VehicleIllustration from '../components/VehicleIllustration';
import { VramsCard, VramsHeader, VramsMetricStrip, VramsPage } from '../components/VramsUi';

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, { label: string; cls: string }> = {
		available: { label: 'Available', cls: 'bg-green-100 text-green-700' },
		in_service: { label: 'In Service', cls: 'bg-amber-100 text-amber-700' },
		out_of_service: { label: 'Out of Service', cls: 'bg-red-100 text-red-600' },
		dispatched: { label: 'Dispatched', cls: 'bg-blue-100 text-blue-700' }
	};
	const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' };
	return (
		<span className={`px-3 py-1 rounded-full text-sm font-bold ${s.cls}`}>● {s.label}</span>
	);
}

function ComplianceRow({ label, date }: { label: string; date?: string }) {
	if (!date) {
		return (
			<div className="flex items-center justify-between py-1.5">
				<span className="text-sm text-gray-500 flex items-center gap-1"><span className="text-gray-300">○</span> {label}</span>
				<span className="text-sm text-gray-400">—</span>
			</div>
		);
	}
	const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
	const { color, icon } =
		days < 0 ? { color: 'text-red-600', icon: '✕' }
		: days < 30 ? { color: 'text-amber-600', icon: '△' }
		: { color: 'text-green-600', icon: '✓' };

	return (
		<div className="flex items-center justify-between py-1.5">
			<span className="text-sm text-gray-500">{label}</span>
			<span className={`text-sm font-semibold ${color}`}>
				{icon} {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
			</span>
		</div>
	);
}

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
	const navigate = useNavigate();
	return (
		<div
			className="bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow flex flex-col gap-4"
			onClick={() => navigate(`/apps/vrams/vehicles/${vehicle.id}`)}
		>
			{/* Vehicle illustration */}
			<div className="rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-3">
				<VehicleIllustration
					vehicleType={vehicle.vehicle_type}
					color={vehicle.color}
					style={{ width: '100%', maxHeight: 80 }}
				/>
			</div>

			<div className="flex items-start justify-between">
				<div>
					<p className="text-xl font-bold font-mono text-gray-900">{vehicle.plate}</p>
					<p className="text-sm text-gray-500 mt-0.5">{vehicle.make} {vehicle.model} · {vehicle.vehicle_type}</p>
				</div>
				<StatusBadge status={vehicle.status} />
			</div>

			<div className="border-t border-gray-100 pt-3 space-y-0.5">
				<ComplianceRow label="Fitness Certificate" date={vehicle.fitness_expiry} />
				<ComplianceRow label="Insurance Expiry" date={vehicle.insurance_expiry} />
				<ComplianceRow label="Next Service" date={vehicle.next_service_date} />
				<div className="flex items-center justify-between py-1.5">
					<span className="text-sm text-gray-500">Bookable</span>
					<span className={`text-sm font-bold ${vehicle.bookable ? 'text-green-600' : 'text-red-500'}`}>
						{vehicle.bookable ? '✓ Yes' : '✕ No'}
					</span>
				</div>
			</div>

			<div className="flex gap-2 pt-1">
				<button
					type="button"
					className="flex-1 py-2.5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
					onClick={(e) => { e.stopPropagation(); navigate(`/apps/vrams/vehicles/${vehicle.id}`); }}
				>
					View Profile
				</button>
				<button
					type="button"
					className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
					onClick={(e) => { e.stopPropagation(); navigate(`/apps/vrams/vehicles/${vehicle.id}`); }}
				>
					Edit
				</button>
			</div>
		</div>
	);
}

function VramsVehicles() {
	const navigate = useNavigate();
	const [status, setStatus] = useState('');
	const [vehicleType, setVehicleType] = useState('');
	const [bookableOnly, setBookableOnly] = useState(false);
	const [q, setQ] = useState('');

	const { data: page, isLoading } = useGetVramsVehiclesQuery({
		status: status || undefined,
		vehicle_type: vehicleType || undefined,
		bookable: bookableOnly || undefined,
		q: q || undefined
	});

	const vehicles = page?.items ?? [];
	const total = page?.total ?? 0;
	const available = vehicles.filter((v) => v.status === 'available').length;
	const inService = vehicles.filter((v) => v.status === 'in_service').length;
	const outOfService = vehicles.filter((v) => v.status === 'out_of_service').length;

	return (
		<VramsPage className="space-y-7">
			{/* Page header */}
			<VramsHeader
				title="Fleet Vehicles"
				subtitle="Manage and monitor all fleet vehicles, compliance, and bookability."
				actions={
					<button
						type="button"
						onClick={() => navigate('/apps/vrams/vehicles/register')}
						className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-base font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
					>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
							<path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
						</svg>
						+ Add Vehicle
					</button>
				}
			/>
			<VramsMetricStrip
				items={[
					{ value: total, label: 'Total', tone: 'info' },
					{ value: available, label: 'Available', tone: 'success' },
					{ value: inService, label: 'In Service', tone: 'warning' },
					{ value: outOfService, label: 'Out of Service', tone: 'danger' }
				]}
			/>

			{/* Filters */}
			<VramsCard className="flex flex-wrap gap-3 items-center px-5 py-4">
				<div className="relative flex-1 min-w-[200px]">
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
						className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
						<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
					</svg>
					<input
						type="text"
						placeholder="Search by plate or vehicle name..."
						value={q}
						onChange={(e) => setQ(e.target.value)}
						className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<select
					value={status}
					onChange={(e) => setStatus(e.target.value)}
					className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">All Status</option>
					<option value="available">Available</option>
					<option value="in_service">In Service</option>
					<option value="out_of_service">Out of Service</option>
				</select>
				<select
					value={vehicleType}
					onChange={(e) => setVehicleType(e.target.value)}
					className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">All Types</option>
					{['SUV', 'Van', 'Truck', 'Bus', 'Sedan', 'Pickup'].map((t) => (
						<option key={t} value={t}>{t}</option>
					))}
				</select>
				<label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer">
					<Switch checked={bookableOnly} onChange={(e) => setBookableOnly(e.target.checked)} />
					Bookable only
				</label>
			</VramsCard>

			{/* Card Grid */}
			{isLoading ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
					{[...Array(6)].map((_, i) => (
						<div key={i} className="bg-white rounded-2xl border border-gray-200 h-56 animate-pulse" />
					))}
				</div>
			) : vehicles.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-24 text-gray-400">
					<span className="text-5xl mb-4">🚗</span>
					<p className="text-lg font-medium">No vehicles found</p>
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
						{vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
					</div>
					<p className="text-sm text-gray-500 pt-1">
						Showing 1–{vehicles.length} of {total} vehicles
					</p>
				</>
			)}
		</VramsPage>
	);
}

export default VramsVehicles;
