import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useSnackbar } from 'notistack';
import {
	useGetVramsMaintenanceQuery,
	useGetVramsMaintenanceLogQuery,
	useCreateVramsMaintenanceMutation,
	useUpdateVramsMaintenanceMutation,
	useDeleteVramsMaintenanceMutation,
	useGetVramsVehiclesQuery
} from '../VramsApi';
import type { MaintenanceLog } from '../types';
import { VramsCard, VramsHeader, VramsPage } from '../components/VramsUi';
import { VramsStatRowSkeleton, VramsTableBodySkeleton } from '../components/VramsLoadingSkeletons';
import { notifyRtk } from '../utils/vramsNotify';

const schema = z.object({
	vehicle_id: z.coerce.number().min(1),
	service_type: z.string().min(1),
	date_performed: z.string().min(1),
	technician: z.string().min(1),
	cost_kes: z.coerce.number().min(0).optional(),
	mileage_at_service: z.coerce.number().min(0).optional(),
	next_due_date: z.string().optional(),
	notes: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

const SERVICE_TYPES = [
	'Oil Change', 'Tyre Rotation', 'Battery Replacement', 'Brake Service',
	'Fitness Certificate', 'Insurance Renewal', 'General Service', 'Other'
];

function DueDateChip({ date }: { date?: string }) {
	if (!date) return <span className="text-sm text-gray-400">—</span>;
	const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
	const { cls, label } =
		days < 0
			? { cls: 'bg-red-100 text-red-700', label: 'Overdue' }
			: days < 30
				? { cls: 'bg-amber-100 text-amber-700', label: 'Due Soon' }
				: { cls: 'bg-green-100 text-green-700', label: 'Upcoming' };
	return (
		<span className={`px-3 py-1 rounded-full text-sm font-semibold ${cls}`}>
			{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} — {label}
		</span>
	);
}

function VramsMaintenance() {
	const navigate = useNavigate();
	const { maintenanceId } = useParams<{ maintenanceId: string }>();
	const editMaintenanceId = maintenanceId ? Number(maintenanceId) : null;
	const isEditMode = Boolean(editMaintenanceId);
	const { enqueueSnackbar } = useSnackbar();
	const { data: page, isLoading } = useGetVramsMaintenanceQuery({});
	const { data: editingLog } = useGetVramsMaintenanceLogQuery(editMaintenanceId ?? 0, { skip: !isEditMode });
	const { data: vehiclesPage } = useGetVramsVehiclesQuery({});
	const [create, { isLoading: saving }] = useCreateVramsMaintenanceMutation();
	const [updateMaintenance, { isLoading: updating }] = useUpdateVramsMaintenanceMutation();
	const [deleteMaintenance] = useDeleteVramsMaintenanceMutation();
	const [vehicleFilter, setVehicleFilter] = useState('');
	const [typeFilter, setTypeFilter] = useState('');
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceLog | null>(null);

	const items: MaintenanceLog[] = page?.items ?? [];

	const stats = useMemo(() => {
		const overdue = items.filter((i) => i.next_due_date && new Date(i.next_due_date) < new Date()).length;
		const soon = items.filter((i) => {
			if (!i.next_due_date) return false;
			const d = (new Date(i.next_due_date).getTime() - Date.now()) / 86400000;
			return d >= 0 && d <= 30;
		}).length;
		return { total: page?.total ?? 0, overdue, soon, ok: (page?.total ?? 0) - overdue - soon };
	}, [items, page]);

	const filtered = items.filter((i) => {
		const matchV = !vehicleFilter || String(i.vehicle_id) === vehicleFilter;
		const matchT = !typeFilter || i.service_type === typeFilter;
		return matchV && matchT;
	});

	const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
		resolver: zodResolver(schema)
	});

	useEffect(() => {
		if (!editingLog) return;
		reset({
			vehicle_id: editingLog.vehicle_id,
			service_type: editingLog.service_type,
			date_performed: editingLog.date_performed?.slice(0, 10),
			technician: editingLog.technician ?? '',
			cost_kes: editingLog.cost_kes ?? undefined,
			mileage_at_service: editingLog.mileage_at_service ?? undefined,
			next_due_date: editingLog.next_due_date?.slice(0, 10),
			notes: editingLog.notes ?? ''
		});
	}, [editingLog, reset]);

	const vehicleOptions = useMemo(() => {
		const list = [...(vehiclesPage?.items ?? [])];
		if (editingLog?.vehicle_id && !list.some((v) => v.id === editingLog.vehicle_id)) {
			list.unshift({
				id: editingLog.vehicle_id,
				plate: editingLog.vehicle?.plate ?? `#${editingLog.vehicle_id}`,
				make: editingLog.vehicle?.make ?? 'Vehicle',
				model: editingLog.vehicle?.model ?? ''
			} as any);
		}
		return list;
	}, [vehiclesPage?.items, editingLog]);

	const serviceTypeOptions = useMemo(() => {
		const base = [...SERVICE_TYPES];
		const current = editingLog?.service_type?.trim();
		if (current && !base.includes(current)) {
			base.unshift(current);
		}
		return base;
	}, [editingLog?.service_type]);

	async function onSubmit(values: FormValues) {
		try {
			if (isEditMode && editMaintenanceId) {
				await updateMaintenance({ id: editMaintenanceId, ...values }).unwrap();
				enqueueSnackbar('Service record updated', { variant: 'success' });
				navigate('/apps/vrams/maintenance');
			} else {
				await create(values).unwrap();
				enqueueSnackbar('Service record saved', { variant: 'success' });
			}
			reset();
		} catch (err) {
			notifyRtk(enqueueSnackbar, err, isEditMode ? 'Failed to update record' : 'Failed to save record');
		}
	}

	async function handleEditRow(m: MaintenanceLog) {
		navigate(`/apps/vrams/maintenance/${m.id}/edit`);
	}

	async function handleDeleteRow(m: MaintenanceLog) {
		setSelectedMaintenance(m);
		setDeleteModalOpen(true);
	}

	async function handleDeleteConfirmed() {
		if (!selectedMaintenance) return;
		try {
			await deleteMaintenance(selectedMaintenance.id).unwrap();
			enqueueSnackbar('Maintenance record deleted', { variant: 'success' });
			setDeleteModalOpen(false);
		} catch (err) {
			notifyRtk(enqueueSnackbar, err, 'Failed to delete record');
		}
	}

	return (
		<VramsPage>
			{/* Header */}
			<VramsHeader
				title="Service & Maintenance"
				subtitle="Track service history, log new maintenance records, and monitor upcoming due dates."
			/>

			{/* Stat cards */}
			{isLoading ? (
				<VramsStatRowSkeleton cards={4} />
			) : (
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
					{[
						{ value: stats.total, label: 'Total Service Logs', icon: '🔧', cls: 'text-gray-700' },
						{ value: stats.overdue, label: 'Overdue Services', icon: '⚠️', cls: 'text-red-600' },
						{ value: stats.soon, label: 'Due Soon (30 days)', icon: '⏰', cls: 'text-amber-600' },
						{ value: stats.ok, label: 'Upcoming / On Schedule', icon: '✅', cls: 'text-green-600' }
					].map((s) => (
						<div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center gap-4">
							<span className="text-3xl">{s.icon}</span>
							<div>
								<p className={`text-4xl font-bold ${s.cls}`}>{s.value}</p>
								<p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Main layout: Table + Log a Service sidebar */}
			<div className="flex gap-6 items-start">
				{/* Service History table */}
				<VramsCard className="flex-1 min-w-0 overflow-hidden">
					<div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
						<div className="flex items-center gap-3">
							<span className="text-2xl">📋</span>
							<div>
								<p className="text-lg font-bold text-gray-900">Service History</p>
								<p className="text-sm text-gray-500">Complete log of all maintenance and service records across the fleet.</p>
							</div>
						</div>
						<span className="px-4 py-1.5 bg-blue-50 text-blue-700 text-sm font-bold rounded-full">
							{page?.total ?? 0} Records
						</span>
					</div>

					{/* Filters */}
					<div className="flex flex-wrap gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
						<span className="text-sm font-semibold text-gray-500 flex items-center gap-1.5">🔍 Filter:</span>
						<select
							value={vehicleFilter}
							onChange={(e) => setVehicleFilter(e.target.value)}
							className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="">All Vehicles</option>
							{(vehiclesPage?.items ?? []).map((v) => (
								<option key={v.id} value={v.id}>{v.plate}</option>
							))}
						</select>
						<select
							value={typeFilter}
							onChange={(e) => setTypeFilter(e.target.value)}
							className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="">All Types</option>
							{SERVICE_TYPES.map((t) => (
								<option key={t} value={t}>{t}</option>
							))}
						</select>
					</div>

					{/* Table */}
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="bg-gray-50 border-b border-gray-100">
									{['VEHICLE', 'SERVICE TYPE', 'DATE PERFORMED', 'TECHNICIAN / PROVIDER', 'NEXT DUE DATE', 'ACTIONS'].map((h) => (
										<th key={h} className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{isLoading ? (
									<VramsTableBodySkeleton rows={10} cols={6} />
								) : filtered.length === 0 ? (
									<tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-base">No records found</td></tr>
								) : (
									filtered.map((m) => (
										<tr key={m.id} className="hover:bg-gray-50">
											<td className="px-6 py-5">
												<span className="bg-gray-100 rounded-lg px-3 py-1.5 font-mono text-sm font-bold text-gray-800">
													{m.vehicle?.plate ?? `#${m.vehicle_id}`}
												</span>
												<p className="text-sm text-gray-500 mt-1.5">{m.vehicle?.make} {m.vehicle?.model}</p>
											</td>
											<td className="px-6 py-5 text-base font-semibold text-gray-700">{m.service_type}</td>
											<td className="px-6 py-5 text-base text-gray-600 whitespace-nowrap">
												{new Date(m.date_performed).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
											</td>
											<td className="px-6 py-5 text-base text-gray-600">{m.technician}</td>
											<td className="px-6 py-5"><DueDateChip date={m.next_due_date} /></td>
											<td className="px-6 py-5 whitespace-nowrap">
												<div className="flex items-center gap-2">
													<button type="button" onClick={() => handleEditRow(m)} className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">Edit</button>
													<button type="button" onClick={() => handleDeleteRow(m)} className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-red-200 text-red-700 hover:bg-red-50">Delete</button>
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					<div className="px-6 py-4 border-t border-gray-100 text-sm text-gray-400">
						Showing {filtered.length} of {page?.total ?? 0} records
					</div>
				</VramsCard>

				{/* Log a Service sidebar */}
				<VramsCard className="w-88 flex-shrink-0 overflow-hidden" style={{ width: 360 }}>
					<div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
						<div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">🔧</div>
						<div>
							<p className="text-lg font-bold text-gray-900">Log a Service</p>
							<p className="text-sm text-gray-500">{isEditMode ? 'Edit maintenance record.' : 'Add a new maintenance record.'}</p>
						</div>
					</div>

					<form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
						<Controller name="vehicle_id" control={control} render={({ field }) => (
							<TextField
								label="Vehicle *"
								select
								fullWidth
								error={!!errors.vehicle_id}
								InputLabelProps={{ shrink: true }}
								value={field.value ? String(field.value) : ''}
								onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')}
							>
								<MenuItem value="">Select Vehicle</MenuItem>
								{vehicleOptions.map((v) => (
									<MenuItem key={v.id} value={String(v.id)}>{v.plate} — {v.make} {v.model}</MenuItem>
								))}
							</TextField>
						)} />
						<Controller name="service_type" control={control} render={({ field }) => (
							<TextField
								label="Service Type *"
								select
								fullWidth
								error={!!errors.service_type}
								InputLabelProps={{ shrink: true }}
								value={field.value ?? ''}
								onChange={(e) => field.onChange(e.target.value)}
							>
								<MenuItem value="">Select Service Type</MenuItem>
								{serviceTypeOptions.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
							</TextField>
						)} />
						<Controller name="date_performed" control={control} render={({ field }) => (
							<TextField {...field} label="Date Performed *" type="date" fullWidth InputLabelProps={{ shrink: true }} error={!!errors.date_performed} />
						)} />
						<Controller name="technician" control={control} render={({ field }) => (
							<TextField {...field} label="Technician / Provider *" fullWidth placeholder="e.g. AutoXpress Nairobi" error={!!errors.technician} InputLabelProps={{ shrink: true }} />
						)} />
						<Controller name="cost_kes" control={control} render={({ field }) => (
							<TextField {...field} label="Cost (KES)" type="number" fullWidth inputProps={{ min: 0, step: 0.01 }} InputLabelProps={{ shrink: true }} />
						)} />
						<Controller name="next_due_date" control={control} render={({ field }) => (
							<TextField {...field} label="Next Service Due" type="date" fullWidth InputLabelProps={{ shrink: true }} />
						)} />
						<Controller name="notes" control={control} render={({ field }) => (
							<TextField {...field} label="Notes" multiline rows={3} fullWidth placeholder="Add any additional notes..." InputLabelProps={{ shrink: true }} />
						)} />

						<div className="flex gap-3 pt-2">
							<Button fullWidth variant="outlined" size="large" onClick={() => reset()} disabled={saving}>
								Reset
							</Button>
							<Button fullWidth variant="contained" size="large" type="submit" disabled={saving || updating}>
								{(saving || updating) ? '…' : (isEditMode ? '💾 Save Changes' : '💾 Save Record')}
							</Button>
						</div>
						{isEditMode && (
							<Button fullWidth variant="text" color="inherit" onClick={() => navigate('/apps/vrams/maintenance')}>
								Cancel Edit
							</Button>
						)}
					</form>
				</VramsCard>
			</div>
			<Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} maxWidth="xs" fullWidth>
				<DialogTitle>Delete Maintenance Record</DialogTitle>
				<DialogContent>
					<p className="text-sm text-slate-600">
						Delete <strong>{selectedMaintenance?.service_type ?? 'this'}</strong> for{' '}
						<strong>{selectedMaintenance?.vehicle?.plate ?? (selectedMaintenance ? `#${selectedMaintenance.vehicle_id}` : 'vehicle')}</strong>?
					</p>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
					<Button color="error" variant="contained" onClick={handleDeleteConfirmed}>Delete</Button>
				</DialogActions>
			</Dialog>
		</VramsPage>
	);
}

export default VramsMaintenance;
