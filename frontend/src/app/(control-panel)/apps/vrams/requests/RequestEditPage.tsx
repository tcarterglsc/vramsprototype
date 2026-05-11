import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { useSnackbar } from 'notistack';
import { VramsPage } from '../components/VramsUi';
import { VramsFormPageSkeleton } from '../components/VramsLoadingSkeletons';
import { useGetVramsRequestQuery, useUpdateVramsRequestMutation } from '../VramsApi';
import { notifyRtk } from '../utils/vramsNotify';

type FormValues = {
  destination: string;
  purpose?: string;
  booking_type: 'fixed' | 'flexible';
  departure_at: string;
  return_at?: string;
  priority: 'normal' | 'high' | 'urgent';
  passenger_count: number;
};

const toInputDateTime = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');

export default function RequestEditPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: request, isLoading } = useGetVramsRequestQuery(Number(requestId));
  const [updateRequest, { isLoading: saving }] = useUpdateVramsRequestMutation();

  const { control, reset, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      destination: '',
      purpose: '',
      booking_type: 'fixed',
      departure_at: '',
      return_at: '',
      priority: 'normal',
      passenger_count: 1
    }
  });

  useEffect(() => {
    if (!request) return;
    reset({
      destination: request.destination,
      purpose: request.purpose ?? '',
      booking_type: request.booking_type,
      departure_at: toInputDateTime(request.departure_at),
      return_at: toInputDateTime(request.return_at),
      priority: request.priority,
      passenger_count: request.passenger_count ?? 1
    });
  }, [request, reset]);

  async function onSubmit(values: FormValues) {
    if (!request) return;
    try {
      await updateRequest({
        id: request.id,
        destination: values.destination,
        purpose: values.purpose,
        booking_type: values.booking_type,
        departure_at: values.departure_at,
        return_at: values.return_at || null,
        priority: values.priority,
        passenger_count: values.passenger_count
      }).unwrap();
      enqueueSnackbar('Request updated successfully.', { variant: 'success' });
      navigate('/apps/vrams/requests');
    } catch (err) {
      notifyRtk(enqueueSnackbar, err, 'Failed to update request.');
    }
  }

  if (isLoading) {
    return (
      <VramsPage className="p-6">
        <VramsFormPageSkeleton />
      </VramsPage>
    );
  }
  if (!request) return <div className="p-8 text-slate-500">Request not found.</div>;

  return (
    <VramsPage className="p-0">
      <div className="max-w-[460px] bg-slate-50 border border-slate-200 rounded-none md:rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center text-sm">📝</div>
            <span className="font-semibold text-gray-900">Edit Request</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/apps/vrams/requests')}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-4 min-h-[700px]">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Requester</label>
            <input
              value={request.requester?.name ?? ''}
              disabled
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Destination <span className="text-red-500">*</span></label>
            <Controller
              name="destination"
              control={control}
              render={({ field }) => (
                <input {...field} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white" placeholder="Enter destination address" />
              )}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Purpose / Notes</label>
            <Controller
              name="purpose"
              control={control}
              render={({ field }) => (
                <textarea {...field} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white resize-none" placeholder="Describe the purpose of this trip..." />
              )}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Booking Type</label>
            <Controller
              name="booking_type"
              control={control}
              render={({ field }) => (
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  {(['fixed', 'flexible'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => field.onChange(opt)}
                      className={`flex-1 py-2 text-sm font-semibold transition-colors ${field.value === opt ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                    >
                      {opt === 'fixed' ? 'Fixed' : 'Flexible'}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Departure Date & Time <span className="text-red-500">*</span></label>
              <Controller
                name="departure_at"
                control={control}
                render={({ field }) => (
                  <input {...field} type="datetime-local" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white" />
                )}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Return Date & Time</label>
              <Controller
                name="return_at"
                control={control}
                render={({ field }) => (
                  <input {...field} type="datetime-local" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white" />
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Priority</label>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2">
                  {([
                    { value: 'normal', label: 'Normal', cls: 'border-blue-200 bg-blue-50 text-blue-700' },
                    { value: 'high', label: 'High', cls: 'border-orange-200 bg-orange-50 text-orange-700' },
                    { value: 'urgent', label: 'Urgent', cls: 'border-red-200 bg-red-50 text-red-700' }
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${field.value === opt.value ? opt.cls : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Number Of Passengers</label>
            <Controller
              name="passenger_count"
              control={control}
              render={({ field }) => (
                <input {...field} type="number" min={1} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white" />
              )}
            />
          </div>
        </form>

        <div className="border-t border-slate-200 bg-white p-4 flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/apps/vrams/requests')}
            disabled={saving}
            className="flex-1 py-2.5 border border-gray-300 text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </VramsPage>
  );
}

