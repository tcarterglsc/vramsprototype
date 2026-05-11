import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { useSnackbar } from 'notistack';
import { VramsCard, VramsHeader, VramsPage } from '../components/VramsUi';
import { VramsFormPageSkeleton } from '../components/VramsLoadingSkeletons';
import { useGetVramsMaintenanceLogQuery, useUpdateVramsMaintenanceMutation } from '../VramsApi';
import { notifyRtk } from '../utils/vramsNotify';

type FormValues = {
  service_type: string;
  date_performed: string;
  technician: string;
  cost_kes?: number;
  next_due_date?: string;
  notes?: string;
};

export default function MaintenanceEditPage() {
  const { maintenanceId } = useParams<{ maintenanceId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: log, isLoading } = useGetVramsMaintenanceLogQuery(Number(maintenanceId));
  const [updateMaintenance, { isLoading: saving }] = useUpdateVramsMaintenanceMutation();

  const { control, reset, handleSubmit } = useForm<FormValues>({
    defaultValues: { service_type: '', date_performed: '', technician: '', cost_kes: undefined, next_due_date: '', notes: '' }
  });

  useEffect(() => {
    if (!log) return;
    reset({
      service_type: log.service_type,
      date_performed: log.date_performed?.slice(0, 10) ?? '',
      technician: log.technician,
      cost_kes: log.cost_kes,
      next_due_date: log.next_due_date?.slice(0, 10) ?? '',
      notes: log.notes ?? ''
    });
  }, [log, reset]);

  async function onSubmit(values: FormValues) {
    if (!log) return;
    try {
      await updateMaintenance({ id: log.id, ...values }).unwrap();
      enqueueSnackbar('Maintenance record updated.', { variant: 'success' });
      navigate('/apps/vrams/maintenance');
    } catch (err) {
      notifyRtk(enqueueSnackbar, err, 'Failed to update maintenance record.');
    }
  }

  if (isLoading) {
    return (
      <VramsPage className="p-6">
        <VramsFormPageSkeleton />
      </VramsPage>
    );
  }
  if (!log) return <div className="p-8 text-slate-500">Maintenance record not found.</div>;

  return (
    <VramsPage className="space-y-6">
      <VramsHeader title="Edit Maintenance Record" subtitle={`Vehicle ${log.vehicle?.plate ?? `#${log.vehicle_id}`}`} />
      <VramsCard className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller name="service_type" control={control} render={({ field }) => <input {...field} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Service type" />} />
          <Controller name="technician" control={control} render={({ field }) => <input {...field} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Technician / Provider" />} />
          <Controller name="date_performed" control={control} render={({ field }) => <input {...field} type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />} />
          <Controller name="next_due_date" control={control} render={({ field }) => <input {...field} type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />} />
          <Controller name="cost_kes" control={control} render={({ field }) => <input {...field} type="number" min={0} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Cost KES" />} />
          <div className="md:col-span-2">
            <Controller name="notes" control={control} render={({ field }) => <textarea {...field} rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Notes" />} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate('/apps/vrams/maintenance')} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </VramsCard>
    </VramsPage>
  );
}

