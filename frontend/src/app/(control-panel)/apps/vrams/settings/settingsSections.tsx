import { useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import { Controller, useForm } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import useUser from '@auth/useUser';
import { notifyRtk } from '../utils/vramsNotify';

export type ProfileForm = {
	displayName: string;
	department: string;
	phone: string;
	license_number: string;
	driver_id_code: string;
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
};

export function SettingsProfileContent() {
	const { data: user, updateUser } = useUser();
	const { enqueueSnackbar } = useSnackbar();
	const roleStr = Array.isArray(user?.role) ? user?.role[0] : user?.role;
	const isDriver = roleStr === 'driver';

	const { control, handleSubmit, reset, getValues } = useForm<ProfileForm>({
		defaultValues: {
			displayName: '',
			department: '',
			phone: '',
			license_number: '',
			driver_id_code: '',
			currentPassword: '',
			newPassword: '',
			confirmPassword: ''
		}
	});

	useEffect(() => {
		if (!user) return;
		reset({
			displayName: user.displayName ?? '',
			department: user.department ?? '',
			phone: user.phone ?? '',
			license_number: user.license_number ?? '',
			driver_id_code: user.driver_id_code ?? '',
			currentPassword: '',
			newPassword: '',
			confirmPassword: ''
		});
	}, [user, reset]);

	function onProfileInvalid() {
		enqueueSnackbar('Please complete required fields before saving your profile.', { variant: 'warning' });
	}

	async function onSaveProfile(values: ProfileForm) {
		if (!user) return;
		try {
			await updateUser({
				displayName: values.displayName.trim(),
				department: values.department.trim() || null,
				phone: values.phone.trim() || null,
				...(isDriver
					? {
							license_number: values.license_number.trim() || null,
							driver_id_code: values.driver_id_code.trim() || null
						}
					: {}),
				version: user.version
			});
			enqueueSnackbar('Profile saved', { variant: 'success' });
		} catch (err) {
			notifyRtk(enqueueSnackbar, err, 'Could not save profile');
		}
	}

	async function onChangePassword(values: ProfileForm) {
		if (!user) return;
		if (!values.currentPassword || !values.newPassword) {
			enqueueSnackbar('Enter current and new password', { variant: 'warning' });
			return;
		}
		if (values.newPassword !== values.confirmPassword) {
			enqueueSnackbar('New passwords do not match', { variant: 'error' });
			return;
		}
		if (values.newPassword.length < 8) {
			enqueueSnackbar('New password must be at least 8 characters', { variant: 'error' });
			return;
		}
		try {
			await updateUser({
				current_password: values.currentPassword,
				new_password: values.newPassword,
				version: user.version
			});
			enqueueSnackbar('Password updated', { variant: 'success' });
			reset({
				...getValues(),
				currentPassword: '',
				newPassword: '',
				confirmPassword: ''
			});
		} catch (err) {
			notifyRtk(enqueueSnackbar, err, 'Password change failed');
		}
	}

	if (!user) {
		return (
			<Paper className="p-24 rounded-xl space-y-3" elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
				<Skeleton variant="text" width="40%" height={36} animation="wave" />
				<Skeleton variant="rounded" height={72} animation="wave" />
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} variant="rounded" height={48} animation="wave" />
				))}
			</Paper>
		);
	}

	return (
		<Paper className="p-24 rounded-xl vrams-card" elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
			<Typography variant="subtitle1" fontWeight={600} className="mb-16">
				Profile
			</Typography>
			<div className="flex items-center gap-16 mb-20">
				<Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 24 }}>
					{user.avatar_initials ?? user.displayName.slice(0, 2).toUpperCase()}
				</Avatar>
				<div>
					<Typography variant="body1" fontWeight={600}>
						{user.displayName}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						{user.email}
					</Typography>
					<Chip label={String(roleStr ?? '').replace('_', ' ')} size="small" className="mt-6 capitalize" />
				</div>
			</div>

			<form onSubmit={handleSubmit(onSaveProfile, onProfileInvalid)} className="space-y-14">
				<Controller
					name="displayName"
					control={control}
					rules={{ required: 'Name is required' }}
					render={({ field, fieldState }) => (
						<TextField
							{...field}
							label="Full name"
							fullWidth
							size="small"
							error={!!fieldState.error}
							helperText={fieldState.error?.message}
						/>
					)}
				/>
				<Controller
					name="department"
					control={control}
					render={({ field }) => <TextField {...field} label="Department" fullWidth size="small" />}
				/>
				<Controller
					name="phone"
					control={control}
					render={({ field }) => <TextField {...field} label="Phone" fullWidth size="small" />}
				/>
				{isDriver ? (
					<>
						<Controller
							name="license_number"
							control={control}
							render={({ field }) => <TextField {...field} label="License number" fullWidth size="small" />}
						/>
						<Controller
							name="driver_id_code"
							control={control}
							render={({ field }) => <TextField {...field} label="Driver ID code" fullWidth size="small" />}
						/>
					</>
				) : null}
				<div className="pt-8">
					<Button type="submit" variant="contained">
						Save profile
					</Button>
				</div>
			</form>

			<Typography variant="subtitle2" className="mt-24 mb-12">
				Change password
			</Typography>
			<div className="space-y-14 max-w-md">
				<Controller
					name="currentPassword"
					control={control}
					render={({ field }) => (
						<TextField
							{...field}
							label="Current password"
							type="password"
							fullWidth
							size="small"
							autoComplete="current-password"
						/>
					)}
				/>
				<Controller
					name="newPassword"
					control={control}
					render={({ field }) => (
						<TextField {...field} label="New password" type="password" fullWidth size="small" autoComplete="new-password" />
					)}
				/>
				<Controller
					name="confirmPassword"
					control={control}
					render={({ field }) => (
						<TextField
							{...field}
							label="Confirm new password"
							type="password"
							fullWidth
							size="small"
							autoComplete="new-password"
						/>
					)}
				/>
				<Button type="button" variant="outlined" onClick={handleSubmit(onChangePassword)}>
					Update password
				</Button>
			</div>
		</Paper>
	);
}
