import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { useCreateVramsRequestMutation } from '../VramsApi';

const schema = z.object({
	requester_name: z.string().min(2, 'Required'),
	destination: z.string().min(3, 'Required'),
	purpose: z.string().optional(),
	booking_type: z.enum(['fixed', 'flexible']),
	departure_at: z.string().min(1, 'Required'),
	return_at: z.string().optional(),
	priority: z.enum(['normal', 'high', 'urgent']),
	passenger_count: z.coerce.number().min(1).max(60)
});

type FormValues = z.infer<typeof schema>;

/** Reusable labelled field wrapper */
function Field({
	label,
	required,
	error,
	children
}: {
	label: string;
	required?: boolean;
	error?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1">
			<label className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
				{label}
				{required && <span className="text-red-500 ml-0.5">*</span>}
			</label>
			{children}
			{error && <p className="text-xs text-red-500">{error}</p>}
		</div>
	);
}

/** Consistent styled input */
const inputCls =
	'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder:text-gray-400';

type Props = { onClose: () => void };

function NewRequestPanel({ onClose }: Props) {
	const { enqueueSnackbar } = useSnackbar();
	const [createRequest, { isLoading }] = useCreateVramsRequestMutation();

	const {
		control,
		handleSubmit,
		formState: { errors }
	} = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: { booking_type: 'fixed', priority: 'normal', passenger_count: 1 }
	});

	async function onSubmit(values: FormValues) {
		try {
			await createRequest(values).unwrap();
			enqueueSnackbar('Request submitted successfully', { variant: 'success' });
			onClose();
		} catch {
			enqueueSnackbar('Failed to submit request', { variant: 'error' });
		}
	}

	return (
		<div className="flex flex-col h-full bg-white">
			{/* Header */}
			<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
				<div className="flex items-center gap-2">
					<div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center text-sm">📝</div>
					<span className="font-semibold text-gray-900">New Request</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg leading-none"
				>
					×
				</button>
			</div>

			{/* Form body */}
			<form
				onSubmit={handleSubmit(onSubmit)}
				className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
			>
				{/* Requester */}
				<Field
					label="Requester"
					required
					error={errors.requester_name?.message}
				>
					<Controller
						name="requester_name"
						control={control}
						render={({ field }) => (
							<div className="relative">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={1.5}
									stroke="currentColor"
									className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
									/>
								</svg>
								<input
									{...field}
									className={`${inputCls} pl-9`}
									placeholder="Full name or employee ID"
								/>
							</div>
						)}
					/>
				</Field>

				{/* Destination */}
				<Field
					label="Destination"
					required
					error={errors.destination?.message}
				>
					<Controller
						name="destination"
						control={control}
						render={({ field }) => (
							<div className="relative">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={1.5}
									stroke="currentColor"
									className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
									/>
								</svg>
								<input
									{...field}
									className={`${inputCls} pl-9`}
									placeholder="Enter destination address"
								/>
							</div>
						)}
					/>
				</Field>

				{/* Purpose */}
				<Field label="Purpose / Notes">
					<Controller
						name="purpose"
						control={control}
						render={({ field }) => (
							<textarea
								{...field}
								rows={3}
								className={`${inputCls} resize-none`}
								placeholder="Describe the purpose of this trip..."
							/>
						)}
					/>
				</Field>

				{/* Booking Type */}
				<Field label="Booking Type">
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
										className={`flex-1 py-2 text-sm font-semibold transition-colors capitalize ${
											field.value === opt
												? 'bg-blue-600 text-white'
												: 'bg-white text-gray-500 hover:bg-gray-50'
										}`}
									>
										{opt}
									</button>
								))}
							</div>
						)}
					/>
				</Field>

				{/* Dates side by side */}
				<div className="grid grid-cols-2 gap-3">
					<Field
						label="Departure Date & Time"
						required
						error={errors.departure_at?.message}
					>
						<Controller
							name="departure_at"
							control={control}
							render={({ field }) => (
								<input
									{...field}
									type="datetime-local"
									className={inputCls}
								/>
							)}
						/>
					</Field>
					<Field label="Return Date & Time">
						<Controller
							name="return_at"
							control={control}
							render={({ field }) => (
								<input
									{...field}
									type="datetime-local"
									className={inputCls}
								/>
							)}
						/>
					</Field>
				</div>

				{/* Priority */}
				<Field label="Priority">
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
										className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
											field.value === opt.value
												? opt.cls
												: 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
										}`}
									>
										{opt.label}
									</button>
								))}
							</div>
						)}
					/>
				</Field>

				{/* Passengers */}
				<Field
					label="Number of Passengers"
					error={errors.passenger_count?.message}
				>
					<Controller
						name="passenger_count"
						control={control}
						render={({ field }) => (
							<div className="relative">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={1.5}
									stroke="currentColor"
									className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
									/>
								</svg>
								<input
									{...field}
									type="number"
									min={1}
									className={`${inputCls} pl-9`}
									placeholder="e.g. 3"
								/>
							</div>
						)}
					/>
				</Field>
			</form>

			{/* Footer actions */}
			<div className="border-t border-gray-100 p-4 flex gap-3">
				<button
					type="button"
					onClick={onClose}
					disabled={isLoading}
					className="flex-1 py-2.5 border border-gray-300 text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={handleSubmit(onSubmit)}
					disabled={isLoading}
					className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
				>
					{isLoading ? (
						<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
					) : (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							className="w-4 h-4"
						>
							<path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
						</svg>
					)}
					Submit
				</button>
			</div>
		</div>
	);
}

export default NewRequestPanel;
