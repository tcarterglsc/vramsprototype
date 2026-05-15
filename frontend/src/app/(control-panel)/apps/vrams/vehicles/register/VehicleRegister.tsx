import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useSnackbar } from 'notistack';
import Switch from '@mui/material/Switch';
import { API_BASE_URL } from '@/utils/apiFetch';
import {
	useCreateVramsVehicleMutation,
	useGetVramsDriversQuery,
	useGetVramsVehicleQuery,
	useUpdateVramsVehicleMutation,
	useUploadVramsVehicleDocumentMutation
} from '../../VramsApi';
import VehicleIllustration from '../../components/VehicleIllustration';
import { VramsCard, VramsHeader, VramsPage } from '../../components/VramsUi';
import { userDisplayName } from '../../utils/erdView';

const schema = z.object({
	plate: z.string().min(3, 'Required').toUpperCase(),
	vin: z
		.string()
		.default('')
		.refine((s) => s === '' || s.length === 17, { message: 'VIN must be 17 characters when provided' }),
	make: z.string().min(1, 'Required'),
	model: z.string().min(1, 'Required'),
	year: z.coerce.number().min(1990).max(new Date().getFullYear() + 1),
	vehicle_type: z.enum(['SUV', 'Van', 'Truck', 'Bus', 'Sedan', 'Pickup']),
	odometer_km: z.coerce.number().min(0).optional(),
	fitness_expiry: z.string().min(1, 'Required'),
	insurance_expiry: z.string().min(1, 'Required'),
	status: z.enum(['available', 'in_service', 'out_of_service']),
	bookable: z.boolean(),
	default_driver_id: z.coerce.number().optional(),
	notes: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

const STATUS_OPTIONS = [
	{
		value: 'available',
		label: 'Available',
		sub: 'Ready for use',
		dot: 'bg-green-500',
		ring: 'border-green-400 bg-green-50'
	},
	{
		value: 'in_service',
		label: 'In Service',
		sub: 'Currently active',
		dot: 'bg-amber-500',
		ring: 'border-amber-400 bg-amber-50'
	},
	{
		value: 'out_of_service',
		label: 'Out of Service',
		sub: 'Unavailable',
		dot: 'bg-red-500',
		ring: 'border-red-400 bg-red-50'
	}
];

/** Reusable labelled field */
function Field({
	label,
	required,
	hint,
	error,
	children
}: {
	label: string;
	required?: boolean;
	hint?: string;
	error?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<label className="text-sm font-semibold text-gray-700">
				{label}
				{required && <span className="text-red-500 ml-0.5"> *</span>}
			</label>
			{children}
			{hint && !error && <p className="text-xs text-amber-600">{hint}</p>}
			{error && <p className="text-xs text-red-500">{error}</p>}
		</div>
	);
}

const inputCls =
	'w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder:text-gray-400';
const selectCls = `${inputCls} appearance-none`;

/** Section header with number badge */
function SectionHeader({ num, label, icon }: { num: string; label: string; icon: string }) {
	return (
		<div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-100">
			<span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">{num}</span>
			<span className="text-sm font-bold text-gray-500 uppercase tracking-wider">{icon} {label}</span>
		</div>
	);
}

/** Upload zone */
function UploadZone({
	label,
	file,
	onFileChange,
	existingFileName
}: {
	label: string;
	file: File | null;
	onFileChange: (file: File | null) => void;
	existingFileName?: string;
}) {
	const inputId = `upload-${label.replace(/\s+/g, '-').toLowerCase()}`;
	const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
	const isImage = !!file && file.type.startsWith('image/');
	const isPdf = !!file && file.type === 'application/pdf';

	return (
		<label htmlFor={inputId} className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-2 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
			<input
				id={inputId}
				type="file"
				accept=".jpg,.jpeg,.png,.pdf"
				className="hidden"
				onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
			/>
			<div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={1.5}
					stroke="currentColor"
					className="w-5 h-5 text-blue-500"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
					/>
				</svg>
			</div>
			<div>
				<p className="text-sm text-gray-500">
					Drop file here or{' '}
					<span className="text-blue-600 font-medium">browse</span>
				</p>
				<p className="text-xs text-gray-400">JPG, PNG, PDF — up to 5MB</p>
			</div>
			<p className="text-xs font-semibold text-gray-600">{label}</p>
			{(file || existingFileName) && (
				<div className="w-full mt-1 space-y-2">
					{file ? (
						<>
							<p className="text-xs text-green-700 font-medium truncate max-w-full">
								Selected: {file.name}
							</p>
							<div className="w-full rounded-lg border border-slate-200 bg-white p-2">
								{isImage && previewUrl ? (
									<img src={previewUrl} alt={`${label} preview`} className="w-full h-36 object-cover rounded-md" />
								) : isPdf && previewUrl ? (
									<div className="h-36 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-xs text-slate-600 font-semibold">
										📄 PDF selected
									</div>
								) : (
									<div className="h-36 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-xs text-slate-500">
										File ready to upload
									</div>
								)}
							</div>
						</>
					) : existingFileName ? (
						<p className="text-xs text-slate-600 font-medium truncate max-w-full">
							Current file: {existingFileName}
						</p>
					) : null}
				</div>
			)}
		</label>
	);
}

function VehicleRegister() {
	const { vehicleId } = useParams<{ vehicleId: string }>();
	const isEditMode = Boolean(vehicleId);
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const [createVehicle, { isLoading }] = useCreateVramsVehicleMutation();
	const [updateVehicle, { isLoading: isUpdating }] = useUpdateVramsVehicleMutation();
	const [uploadDocument] = useUploadVramsVehicleDocumentMutation();
	const { data: drivers } = useGetVramsDriversQuery();
	const { data: existingVehicle } = useGetVramsVehicleQuery(Number(vehicleId), { skip: !isEditMode });
	const [fitnessFile, setFitnessFile] = useState<File | null>(null);
	const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
	const [carPhotoFile, setCarPhotoFile] = useState<File | null>(null);

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors }
	} = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: { status: 'available', bookable: true }
	});

	useEffect(() => {
		if (!isEditMode || !existingVehicle) return;
		reset({
			plate: existingVehicle.plate,
			vin: existingVehicle.vin ?? '',
			make: existingVehicle.make,
			model: existingVehicle.model,
			year: existingVehicle.year,
			vehicle_type: existingVehicle.vehicle_type,
			odometer_km: existingVehicle.odometer_km,
			fitness_expiry: existingVehicle.fitness_expiry ?? '',
			insurance_expiry: existingVehicle.insurance_expiry ?? '',
			status: existingVehicle.status === 'dispatched' ? 'in_service' : existingVehicle.status,
			bookable: existingVehicle.bookable,
			default_driver_id: existingVehicle.default_driver?.id,
			notes: existingVehicle.notes ?? ''
		});
	}, [isEditMode, existingVehicle, reset]);

	const previewType      = useWatch({ control, name: 'vehicle_type' });
	const previewPlate     = useWatch({ control, name: 'plate' });
	const previewMake      = useWatch({ control, name: 'make' });
	const previewModel     = useWatch({ control, name: 'model' });
	const previewYear      = useWatch({ control, name: 'year' });
	const previewStatus    = useWatch({ control, name: 'status' });
	const carPhotoPreviewUrl = useMemo(() => (carPhotoFile ? URL.createObjectURL(carPhotoFile) : ''), [carPhotoFile]);
	const existingPhotoUrl = useMemo(() => {
		const raw = existingVehicle?.documents?.find((d) => d.doc_type === 'vehicle_photo')?.file_url;
		if (!raw) return '';
		return raw.startsWith('http') ? raw : `${API_BASE_URL}${raw}`;
	}, [existingVehicle?.documents]);
	const fitnessDoc = existingVehicle?.documents?.find((d) => d.doc_type === 'fitness_certificate');
	const insuranceDoc = existingVehicle?.documents?.find((d) => d.doc_type === 'insurance');

	async function onSubmit(values: FormValues) {
		const invalidFile = [fitnessFile, insuranceFile, carPhotoFile].find((f) => f && f.size > 5 * 1024 * 1024);
		if (invalidFile) {
			enqueueSnackbar('Each document must be 5MB or smaller.', { variant: 'warning' });
			return;
		}

		try {
			const vehicle = isEditMode && existingVehicle
				? await updateVehicle({ id: existingVehicle.id, ...values }).unwrap()
				: await createVehicle(values).unwrap();

			const uploads: Promise<unknown>[] = [];
			if (fitnessFile) {
				uploads.push(
					uploadDocument({
						vehicleId: vehicle.id,
						doc_type: 'fitness_certificate',
						expires_at: values.fitness_expiry || undefined,
						file: fitnessFile
					}).unwrap()
				);
			}
			if (insuranceFile) {
				uploads.push(
					uploadDocument({
						vehicleId: vehicle.id,
						doc_type: 'insurance',
						expires_at: values.insurance_expiry || undefined,
						file: insuranceFile
					}).unwrap()
				);
			}
			if (carPhotoFile) {
				uploads.push(
					uploadDocument({
						vehicleId: vehicle.id,
						doc_type: 'vehicle_photo',
						file: carPhotoFile
					}).unwrap()
				);
			}
			if (uploads.length > 0) {
				await Promise.all(uploads);
			}

			enqueueSnackbar(isEditMode ? 'Vehicle updated successfully!' : 'Vehicle registered successfully!', { variant: 'success' });
			navigate(isEditMode ? `/apps/vrams/vehicles/${vehicle.id}` : '/apps/vrams/vehicles');
		} catch (error: any) {
			const message = error?.data?.message || (isEditMode ? 'Failed to update vehicle' : 'Failed to register vehicle or upload documents');
			enqueueSnackbar(message, { variant: 'error' });
		}
	}

	return (
		<VramsPage>
			{/* Breadcrumb */}
			<div className="flex items-center gap-2 mb-6 text-sm">
				<button
					type="button"
					onClick={() => navigate('/apps/vrams/vehicles')}
					className="text-gray-500 hover:text-gray-700 font-medium"
				>
					Vehicles
				</button>
				<span className="text-gray-300">/</span>
				<span className="text-gray-900 font-medium">{isEditMode ? 'Edit vehicle' : 'Register new vehicle'}</span>
			</div>

			{/* Page title */}
			<VramsHeader title="Vehicle Management" subtitle={isEditMode ? 'Edit and update fleet vehicle details' : 'Add and configure fleet vehicles'} />

			{/* Two-column layout: form + action panel */}
			<div className="flex gap-6 items-start">
				{/* Main form card */}
				<VramsCard className="flex-1 min-w-0 overflow-hidden">
					{/* Card header */}
					<div className="flex items-center gap-4 px-8 py-5 border-b border-gray-100">
						<div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">🚗</div>
						<div>
							<p className="text-lg font-bold text-gray-900">{isEditMode ? 'Edit vehicle' : 'Register new vehicle'}</p>
							<p className="text-sm text-gray-500">
								{isEditMode ? 'Update vehicle details and save changes to the fleet registry.' : 'Complete all required fields to add a vehicle to the fleet registry.'}
							</p>
						</div>
					</div>

					<form
						onSubmit={handleSubmit(onSubmit)}
						className="p-8 space-y-10"
					>
						{/* 01 Basic Information */}
						<section>
							<SectionHeader
								num="01"
								label="Basic Information"
								icon=""
							/>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
								<Field
									label="Plate number"
									required
									hint="Enter plate in standard format"
									error={errors.plate?.message}
								>
									<Controller
										name="plate"
										control={control}
										render={({ field }) => (
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
													P
												</span>
												<input
													{...field}
													className={`${inputCls} pl-10 font-mono`}
													placeholder="E.G. GR 4921-23"
												/>
											</div>
										)}
									/>
								</Field>

								<Field
									label="VIN (extension)"
									error={errors.vin?.message}
								>
									<Controller
										name="vin"
										control={control}
										render={({ field }) => (
											<input
												{...field}
												className={`${inputCls} font-mono`}
												placeholder="E.G. 1HGBH41JXMN109186"
												maxLength={17}
											/>
										)}
									/>
								</Field>

								<Field
									label="Make"
									required
									error={errors.make?.message}
								>
									<Controller
										name="make"
										control={control}
										render={({ field }) => (
											<select
												{...field}
												className={selectCls}
											>
												<option value="">Select manufacturer</option>
												{['Toyota', 'Nissan', 'Mitsubishi', 'Mercedes-Benz', 'Ford', 'Land Rover'].map((m) => (
													<option
														key={m}
														value={m}
													>
														{m}
													</option>
												))}
											</select>
										)}
									/>
								</Field>

								<Field
									label="Model"
									required
									error={errors.model?.message}
								>
									<Controller
										name="model"
										control={control}
										render={({ field }) => (
											<input
												{...field}
												className={inputCls}
												placeholder="e.g. Land Cruiser"
											/>
										)}
									/>
								</Field>

								<Field
									label="Year"
									required
									error={errors.year?.message}
								>
									<Controller
										name="year"
										control={control}
										render={({ field }) => (
											<select
												{...field}
												className={selectCls}
											>
												<option value="">Select year</option>
												{Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map((y) => (
													<option
														key={y}
														value={y}
													>
														{y}
													</option>
												))}
											</select>
										)}
									/>
								</Field>

								<Field
									label="Vehicle type"
									required
									error={errors.vehicle_type?.message}
								>
									<Controller
										name="vehicle_type"
										control={control}
										render={({ field }) => (
											<select
												{...field}
												className={selectCls}
											>
												<option value="">Select type</option>
												{['SUV', 'Van', 'Truck', 'Bus', 'Sedan', 'Pickup'].map((t) => (
													<option
														key={t}
														value={t}
													>
														{t}
													</option>
												))}
											</select>
										)}
									/>
								</Field>

								<Field label="Odometer (extension · km)">
									<Controller
										name="odometer_km"
										control={control}
										render={({ field }) => (
											<div className="relative">
												<input
													{...field}
													type="number"
													min={0}
													className={`${inputCls} pr-10`}
													placeholder="e.g. 45000"
												/>
												<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
													km
												</span>
											</div>
										)}
									/>
								</Field>
							</div>
						</section>

						{/* 02 Compliance & Documents */}
						<section>
							<SectionHeader
								num="02"
								label="Compliance & Documents"
								icon=""
							/>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
								<Field
									label="Fitness expiry date"
									required
									hint="Renewal required annually"
									error={errors.fitness_expiry?.message}
								>
									<Controller
										name="fitness_expiry"
										control={control}
										render={({ field }) => (
											<div className="relative">
												<input
													{...field}
													type="date"
													className={inputCls}
												/>
											</div>
										)}
									/>
								</Field>

								<Field
									label="Insurance expiry date"
									required
									hint="Comprehensive or third party"
									error={errors.insurance_expiry?.message}
								>
									<Controller
										name="insurance_expiry"
										control={control}
										render={({ field }) => (
											<input
												{...field}
												type="date"
												className={inputCls}
											/>
										)}
									/>
								</Field>
							</div>

							{/* Upload zones */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
								<div>
									<p className="text-xs font-semibold text-gray-600 mb-2">📄 Fitness Certificate Document</p>
									<UploadZone
										label="Fitness Certificate"
										file={fitnessFile}
										onFileChange={setFitnessFile}
										existingFileName={fitnessDoc?.file_name}
									/>
								</div>
								<div>
									<p className="text-xs font-semibold text-gray-600 mb-2">📄 Insurance Document</p>
									<UploadZone
										label="Insurance Document"
										file={insuranceFile}
										onFileChange={setInsuranceFile}
										existingFileName={insuranceDoc?.file_name}
									/>
								</div>
								<div>
									<p className="text-xs font-semibold text-gray-600 mb-2">📸 Vehicle Photo</p>
									<UploadZone label="Car Picture" file={carPhotoFile} onFileChange={setCarPhotoFile} />
								</div>
							</div>
						</section>

						{/* 03 Availability & Assignment */}
						<section>
							<SectionHeader
								num="03"
								label="Availability & Assignment"
								icon=""
							/>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
								{/* Status radio */}
								<div>
									<p className="text-xs font-semibold text-gray-600 mb-2">
										Initial Status <span className="text-red-500">*</span>
									</p>
									<Controller
										name="status"
										control={control}
										render={({ field }) => (
											<div className="space-y-2">
												{STATUS_OPTIONS.map((opt) => (
													<label
														key={opt.value}
														className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
															field.value === opt.value
																? opt.ring + ' border-opacity-100'
																: 'border-gray-200 bg-white hover:bg-gray-50'
														}`}
													>
														<input
															type="radio"
															value={opt.value}
															checked={field.value === opt.value}
															onChange={() => field.onChange(opt.value)}
															className="hidden"
														/>
														<span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${opt.dot}`} />
														<div>
															<p className="text-sm font-semibold text-gray-800">{opt.label}</p>
															<p className="text-xs text-gray-400">{opt.sub}</p>
														</div>
													</label>
												))}
											</div>
										)}
									/>
								</div>

								{/* Bookable toggle */}
								<div>
									<p className="text-xs font-semibold text-gray-600 mb-2">Bookable (is_bookable)</p>
									<Controller
										name="bookable"
										control={control}
										render={({ field }) => (
											<div className="flex flex-col gap-3">
												<div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200">
													<Switch
														size="small"
														checked={field.value}
														onChange={(e) => field.onChange(e.target.checked)}
													/>
													<span className="text-sm font-medium text-gray-700">Allow self-booking</span>
												</div>
												{field.value && (
													<div className="flex items-start gap-2 px-3 py-2 bg-blue-50 rounded-lg">
														<svg
															xmlns="http://www.w3.org/2000/svg"
															fill="none"
															viewBox="0 0 24 24"
															strokeWidth={1.5}
															stroke="currentColor"
															className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
															/>
														</svg>
														<p className="text-xs text-blue-700">
															Bookable vehicles appear in the booking portal.
														</p>
													</div>
												)}
											</div>
										)}
									/>
								</div>

								{/* Default driver */}
								<div>
									<p className="text-xs font-semibold text-gray-600 mb-2">Assign Default Driver</p>
									<Controller
										name="default_driver_id"
										control={control}
										render={({ field }) => (
											<div className="space-y-2">
												<div className="relative">
													<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
														<svg
															xmlns="http://www.w3.org/2000/svg"
															fill="none"
															viewBox="0 0 24 24"
															strokeWidth={1.5}
															stroke="currentColor"
															className="w-4 h-4"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
															/>
														</svg>
													</span>
													<select
														{...field}
														className={`${selectCls} pl-9`}
													>
														<option value="">Unassigned</option>
														{(drivers ?? []).map((d) => (
															<option
																key={d.id}
																value={d.id}
															>
																{userDisplayName(d)} — {d.driver_id_code}
															</option>
														))}
													</select>
												</div>
												<p className="text-xs text-gray-400 px-1">Optional. Can be assigned after registration.</p>
											</div>
										)}
									/>
								</div>
							</div>
						</section>

						{/* 04 Notes */}
						<section>
							<SectionHeader
								num="04"
								label="Notes"
								icon=""
							/>
							<Field label="Notes">
								<Controller
									name="notes"
									control={control}
									render={({ field }) => (
										<div>
											<textarea
												{...field}
												rows={4}
												className={`${inputCls} resize-none`}
												placeholder="Enter any additional notes, special equipment, known issues, or instructions relevant to this vehicle..."
											/>
											<div className="flex justify-between mt-1">
												<p className="text-xs text-gray-400">
													Free-form field — include anything useful for fleet managers or drivers.
												</p>
												<p className="text-xs text-gray-400">{(field.value ?? '').length} / 500</p>
											</div>
										</div>
									)}
								/>
							</Field>
						</section>
					</form>

				{/* Footer — sticky so buttons are always reachable */}
				<div className="flex items-center justify-between px-8 py-5 border-t border-gray-100 bg-gray-50 sticky bottom-0 z-10">
						<p className="text-xs text-gray-400">
							<span className="text-red-500">*</span> Fields marked * are required
						</p>
						<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => navigate('/apps/vrams/vehicles')}
							className="px-5 py-2.5 border border-gray-300 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSubmit(onSubmit)}
							disabled={isLoading || isUpdating}
							className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
						>
								{(isLoading || isUpdating) ? (
									<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
								) : (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
										className="w-4 h-4"
									>
										<path
											fillRule="evenodd"
											d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
											clipRule="evenodd"
										/>
									</svg>
								)}
								{isEditMode ? 'Save Vehicle' : 'Register Vehicle'}
							</button>
						</div>
					</div>
				</VramsCard>

				{/* Action sidebar */}
				<div className="w-96 flex-shrink-0 space-y-5 sticky top-20">

					{/* ── Live vehicle preview ── */}
					<VramsCard className="overflow-hidden">
						<div className="px-5 pt-4 pb-1">
							<p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preview</p>
						</div>
						{/* Illustration */}
						<div className="bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-5 min-h-[220px] flex items-center justify-center">
							{(carPhotoPreviewUrl || existingPhotoUrl) ? (
								<img src={carPhotoPreviewUrl || existingPhotoUrl} alt="Vehicle preview" className="w-full max-h-[210px] rounded-md object-cover" />
							) : (
								<VehicleIllustration
									vehicleType={previewType || 'Sedan'}
									style={{ width: '100%', maxHeight: 180 }}
								/>
							)}
						</div>
						{/* Details */}
						<div className="px-5 py-4 space-y-1.5">
							<div className="flex items-center justify-between">
								<span className="font-mono font-bold text-base text-gray-900 tracking-widest">
									{previewPlate || '— — —'}
								</span>
								{previewStatus && (
									<span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
										previewStatus === 'available'     ? 'bg-green-100 text-green-700' :
										previewStatus === 'in_service'    ? 'bg-amber-100 text-amber-700' :
										'bg-red-100 text-red-600'
									}`}>
										{previewStatus.replace('_', ' ')}
									</span>
								)}
							</div>
							<p className="text-sm text-gray-500">
								{[previewMake, previewModel, previewYear ? String(previewYear) : ''].filter(Boolean).join(' ') || 'Enter make, model & year'}
							</p>
							<div className="flex items-center gap-2 pt-1">
								{previewType && (
									<span className="ml-auto text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
										{previewType}
									</span>
								)}
							</div>
						</div>
					</VramsCard>

					<VramsCard className="p-5">
						<p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Quick Actions</p>
						<div className="space-y-2">
							<button
								type="button"
								onClick={() => navigate('/apps/vrams/requests?new=1')}
								className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
							>
								<span>📅</span> Book Vehicle
							</button>
						</div>
					</VramsCard>

					<div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
						<p className="text-sm font-bold text-amber-700 mb-2">💡 Required Documents</p>
						<ul className="text-sm text-amber-700 space-y-1.5 list-disc list-inside">
							<li>Valid Fitness Certificate</li>
							<li>Comprehensive Insurance</li>
							<li>Road Licence (if applicable)</li>
						</ul>
					</div>
				</div>
			</div>
		</VramsPage>
	);
}

export default VehicleRegister;
