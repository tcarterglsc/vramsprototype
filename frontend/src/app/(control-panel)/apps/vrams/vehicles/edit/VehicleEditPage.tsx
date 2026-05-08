import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { useSnackbar } from 'notistack';
import { VramsCard, VramsHeader, VramsPage } from '../../components/VramsUi';
import { VramsFormPageSkeleton } from '../../components/VramsLoadingSkeletons';
import { useGetVramsVehicleQuery, useUpdateVramsVehicleMutation } from '../../VramsApi';
import { notifyRtk } from '../../utils/vramsNotify';

type FormValues = {
  plate: string;
  make: string;
  model: string;
  color?: string;
  status: 'available' | 'in_service' | 'out_of_service';
  bookable: boolean;
  notes?: string;
};

export default function VehicleEditPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: vehicle, isLoading } = useGetVramsVehicleQuery(Number(vehicleId));
  const [updateVehicle, { isLoading: saving }] = useUpdateVramsVehicleMutation();

  const { control, reset, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      plate: '',
      make: '',
      model: '',
      color: '',
      status: 'available',
      bookable: true,
      notes: ''
    }
  });

  useEffect(() => {
    if (!vehicle) return;
    reset({
      plate: vehicle.plate,
      make: vehicle.make,
      model: vehicle.model,
      color: vehicle.color ?? '',
      status: vehicle.status === 'dispatched' ? 'in_service' : vehicle.status,
      bookable: vehicle.bookable,
      notes: vehicle.notes ?? ''
    });
  }, [vehicle, reset]);

  async function onSubmit(values: FormValues) {
    if (!vehicle) return;
    try {
      await updateVehicle({ id: vehicle.id, ...values }).unwrap();
      enqueueSnackbar('Vehicle updated successfully.', { variant: 'success' });
      navigate(`/apps/vrams/vehicles/${vehicle.id}`);
    } catch (err) {
      notifyRtk(enqueueSnackbar, err, 'Failed to update vehicle.');
    }
  }

  if (isLoading) {
    return (
      <VramsPage className="p-6">
        <VramsFormPageSkeleton />
      </VramsPage>
    );
  }

  if (!vehicle) {
    return <div className="p-8 text-slate-500">Vehicle not found.</div>;
  }

  return (
    <VramsPage className="space-y-6">
      <VramsHeader title={`Edit Vehicle ${vehicle.plate}`} subtitle="Update vehicle details and assignment readiness." />
      <VramsCard className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller name="plate" control={control} render={({ field }) => <input {...field} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Plate" />} />
          <Controller name="status" control={control} render={({ field }) => (
            <select {...field} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white">
              <option value="available">Available</option>
              <option value="in_service">In Service</option>
              <option value="out_of_service">Out of Service</option>
            </select>
          )} />
          <Controller name="make" control={control} render={({ field }) => <input {...field} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Make" />} />
          <Controller name="model" control={control} render={({ field }) => <input {...field} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Model" />} />
          <Controller name="color" control={control} render={({ field }) => <input {...field} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Color" />} />
          <Controller name="bookable" control={control} render={({ field }) => (
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
              Bookable by staff
            </label>
          )} />
          <div className="md:col-span-2">
            <Controller name="notes" control={control} render={({ field }) => <textarea {...field} rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Notes" />} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate(`/apps/vrams/vehicles/${vehicle.id}`)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </VramsCard>
    </VramsPage>
  );
}

