import LinearProgress from '@mui/material/LinearProgress';
import Avatar from '@mui/material/Avatar';
import { useNavigate } from 'react-router';
import type { Vehicle } from '../../../types';

type Props = { vehicle: Vehicle; onChangeStatus: () => void };

function ComplianceCard({ label, date, icon }: { label: string; date?: string; icon: string }) {
	if (!date) return null;
	const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
	const style =
		days < 0
			? { bg: 'bg-red-50 border-red-200', chip: 'bg-red-100 text-red-700', text: `Expired ${Math.abs(days)}d ago` }
			: days < 30
				? { bg: 'bg-amber-50 border-amber-200', chip: 'bg-amber-100 text-amber-700', text: `${days} days left` }
				: { bg: 'bg-green-50 border-green-200', chip: 'bg-green-100 text-green-700', text: `${days} days left` };

	return (
		<div className={`rounded-xl border p-5 flex flex-col gap-2 ${style.bg}`}>
			<span className="text-2xl">{icon}</span>
			<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
			<p className="text-base font-bold text-gray-900">
				{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
			</p>
			<span className={`self-start px-2 py-0.5 rounded-full text-xs font-semibold ${style.chip}`}>{style.text}</span>
		</div>
	);
}

function SpecRow({ label, value }: { label: string; value?: string | number }) {
	return (
		<div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
			<span className="text-sm text-gray-500">{label}</span>
			<span className="text-sm font-semibold text-gray-900">{value ?? '—'}</span>
		</div>
	);
}

function OverviewTab({ vehicle, onChangeStatus }: Props) {
	const navigate = useNavigate();

	return (
		<div className="space-y-6">

			{/* ── Compliance & Validity ─────────────────────────────────── */}
			<div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
				<p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">🛡 Compliance & Validity</p>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<ComplianceCard label="Fitness Certificate" date={vehicle.fitness_expiry} icon="📋" />
					<ComplianceCard label="Insurance Expiry" date={vehicle.insurance_expiry} icon="🛡" />
					<ComplianceCard label="Next Service Date" date={vehicle.next_service_date} icon="🔧" />
				</div>
			</div>

			{/* ── Vehicle Specs ─────────────────────────────────────────── */}
			<div className="bg-white rounded-xl border border-gray-200 p-5">
				<p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">🚗 Vehicle Specifications</p>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8">
					<SpecRow label="Make / Model" value={`${vehicle.make} ${vehicle.model}`} />
					<SpecRow label="Year" value={vehicle.year} />
					<SpecRow label="Type" value={vehicle.vehicle_type} />
					<SpecRow label="Engine" value={vehicle.engine_size} />
					<SpecRow label="Fuel Type" value={vehicle.fuel_type} />
					<SpecRow label="Transmission" value={vehicle.transmission} />
					<SpecRow label="Seating Capacity" value={vehicle.seating_capacity ? `${vehicle.seating_capacity} seats` : undefined} />
					<SpecRow label="Odometer" value={vehicle.odometer_km ? `${vehicle.odometer_km.toLocaleString()} km` : undefined} />
					<SpecRow label="Colour" value={vehicle.color} />
				</div>
			</div>

			{/* ── Assigned Driver | Usage This Month | Quick Actions ────── */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

				{/* Assigned Driver */}
				<div className="bg-white rounded-xl border border-gray-200 p-5">
					<p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Assigned Driver</p>
					{vehicle.default_driver ? (
						<>
							<div className="flex items-center gap-3 mb-4">
								<Avatar sx={{ bgcolor: '#1e40af', width: 44, height: 44, fontSize: 14, fontWeight: 700 }}>
									{vehicle.default_driver.avatar_initials ?? vehicle.default_driver.name.slice(0, 2).toUpperCase()}
								</Avatar>
								<div>
									<p className="text-sm font-bold text-gray-900">{vehicle.default_driver.name}</p>
									<p className="text-xs text-gray-400">{vehicle.default_driver.driver_id_code} · Active</p>
								</div>
							</div>
							<div className="space-y-2 border-t border-gray-100 pt-3">
								<div className="flex justify-between text-sm">
									<span className="text-gray-400">License</span>
									<span className="font-medium">{vehicle.default_driver.license_number ?? '—'}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-gray-400">Total Trips</span>
									<span className="font-medium">{vehicle.default_driver.total_trips ?? 0}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-gray-400">Phone</span>
									<span className="font-medium">{vehicle.default_driver.phone ?? '—'}</span>
								</div>
							</div>
						</>
					) : (
						<p className="text-sm text-gray-400 italic">No driver assigned</p>
					)}
				</div>

				{/* Usage This Month */}
				<div className="bg-white rounded-xl border border-gray-200 p-5">
					<p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Usage This Month</p>
					<div className="space-y-5">
						{[
							{ label: 'Trips Completed', value: '14', pct: 70 },
							{ label: 'Distance Covered', value: '2,340 km', pct: 80 },
							{ label: 'Fuel Consumed', value: '312 L', pct: 55 }
						].map((u) => (
							<div key={u.label}>
								<div className="flex justify-between mb-1.5">
									<span className="text-xs text-gray-500">{u.label}</span>
									<span className="text-xs font-bold text-gray-900">{u.value}</span>
								</div>
								<LinearProgress
									variant="determinate"
									value={u.pct}
									sx={{ borderRadius: 8, height: 7 }}
								/>
							</div>
						))}
					</div>
				</div>

				{/* Quick Actions */}
				<div className="bg-white rounded-xl border border-gray-200 p-5">
					<p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Quick Actions</p>
					<div className="flex flex-col gap-2.5">
						<button
							type="button"
							onClick={onChangeStatus}
							className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-left"
						>
							<span className="text-base">🔄</span> Change Status
						</button>
						<button
							type="button"
							onClick={() => navigate('/apps/vrams/maintenance')}
							className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-left"
						>
							<span className="text-base">🔧</span> Log Service
						</button>
						<button
							type="button"
							className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-left"
						>
							<span className="text-base">📎</span> Upload Documents
						</button>
						<button
							type="button"
							onClick={onChangeStatus}
							className="w-full flex items-center gap-3 px-4 py-3 border border-red-200 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
						>
							<span className="text-base">🚫</span> Mark Out of Service
						</button>
					</div>
				</div>

			</div>
		</div>
	);
}

export default OverviewTab;
