import FusePageSimple from '@fuse/core/FusePageSimple';
import { styled } from '@mui/material/styles';
import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import FuseLoading from '@fuse/core/FuseLoading';
import FuseSvgIcon from '@fuse/core/FuseSvgIcon';
import FuseTabs from 'src/components/tabs/FuseTabs';
import FuseTab from 'src/components/tabs/FuseTab';
import { useMemo } from 'react';
import { type MRT_ColumnDef } from 'material-react-table';
import DataTable from 'src/components/data-table/DataTable';
import { Controller, useForm } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import { useGetVramsUsersQuery, useInviteVramsUserMutation, useUpdateVramsUserMutation } from '../VramsApi';
import type { VramsUser } from '../types';

const Root = styled(FusePageSimple)(({ theme }) => ({
	'& .FusePageSimple-header': {
		background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
		boxShadow: `inset 0 -1px 0 0px ${theme.vars.palette.divider}`
	},
	'& .FusePageSimple-content': {
		backgroundColor: '#f8fafc'
	}
}));

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
	const { enqueueSnackbar } = useSnackbar();
	const [invite, { isLoading }] = useInviteVramsUserMutation();
	const { control, handleSubmit, reset } = useForm({ defaultValues: { name: '', email: '', role: 'requester' } });

	async function onSubmit(values: { name: string; email: string; role: string }) {
		try {
			await invite(values).unwrap();
			enqueueSnackbar('Invitation sent!', { variant: 'success' });
			reset();
			onClose();
		} catch {
			enqueueSnackbar('Failed to invite user', { variant: 'error' });
		}
	}

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>Invite User</DialogTitle>
			<DialogContent className="space-y-16 pt-10">
				<Controller name="name" control={control} render={({ field }) => (
					<TextField {...field} label="Full Name" fullWidth size="small" />
				)} />
				<Controller name="email" control={control} render={({ field }) => (
					<TextField {...field} label="Email" type="email" fullWidth size="small" />
				)} />
				<Controller name="role" control={control} render={({ field }) => (
					<TextField {...field} label="Role" select fullWidth size="small">
						{['admin', 'fleet_manager', 'requester', 'driver'].map(r => (
							<MenuItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</MenuItem>
						))}
					</TextField>
				)} />
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isLoading}>Send Invite</Button>
			</DialogActions>
		</Dialog>
	);
}

function UsersTab() {
	const [inviteOpen, setInviteOpen] = useState(false);
	const { data: page, isLoading } = useGetVramsUsersQuery({});
	const [updateUser] = useUpdateVramsUserMutation();
	const { enqueueSnackbar } = useSnackbar();

	const columns = useMemo<MRT_ColumnDef<VramsUser>[]>(
		() => [
			{
				id: 'avatar',
				header: '',
				size: 48,
				Cell: ({ row }) => (
					<Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 12 }}>
						{row.original.avatar_initials ?? row.original.name.slice(0, 2).toUpperCase()}
					</Avatar>
				)
			},
			{ accessorKey: 'name', header: 'Name' },
			{ accessorKey: 'email', header: 'Email' },
			{
				accessorKey: 'role',
				header: 'Role',
				Cell: ({ cell }) => (
					<span className="capitalize">{cell.getValue<string>().replace('_', ' ')}</span>
				)
			},
			{
				accessorKey: 'is_active',
				header: 'Status',
				Cell: ({ cell }) => (
					<Chip label={cell.getValue<boolean>() ? 'Active' : 'Inactive'} color={cell.getValue<boolean>() ? 'success' : 'default'} size="small" />
				)
			},
			{
				id: 'actions',
				header: 'Actions',
				Cell: ({ row }) => (
					<div className="flex gap-6">
						<Button size="small" variant="outlined" onClick={async () => {
							const newRole = prompt('New role (admin/fleet_manager/requester/driver):', row.original.role);
							if (newRole) {
								await updateUser({ id: row.original.id, role: newRole });
								enqueueSnackbar('Role updated', { variant: 'success' });
							}
						}}>
							Edit Role
						</Button>
						<Button size="small" variant="outlined" color={row.original.is_active ? 'error' : 'success'}
							onClick={async () => {
								await updateUser({ id: row.original.id, is_active: !row.original.is_active });
								enqueueSnackbar('User updated', { variant: 'success' });
							}}>
							{row.original.is_active ? 'Deactivate' : 'Activate'}
						</Button>
					</div>
				)
			}
		],
		[updateUser, enqueueSnackbar]
	);

	if (isLoading) return <FuseLoading />;

	return (
		<div className="space-y-16">
			<div className="flex justify-end">
				<Button variant="contained" startIcon={<FuseSvgIcon size={16}>heroicons-outline:plus</FuseSvgIcon>}
					onClick={() => setInviteOpen(true)}>
					Invite User
				</Button>
			</div>
			<Paper className="rounded-xl overflow-hidden" elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
				<DataTable data={page?.items ?? []} columns={columns} initialState={{ density: 'comfortable' }} />
			</Paper>
			<InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
		</div>
	);
}

function VramsSettings() {
	const [tab, setTab] = useState('profile');

	return (
		<Root
			header={
				<div className="px-24 py-16">
					<Typography variant="h5" fontWeight={700}>Settings</Typography>
					<Typography variant="body2" color="text.secondary">Manage your profile, organisation, and team access.</Typography>
				</div>
			}
			contentToolbar={
				<div className="px-24 w-full">
					<FuseTabs value={tab} onChange={(_, v) => setTab(v)}>
						<FuseTab value="profile" label="Profile" />
						<FuseTab value="org" label="Organisation" />
						<FuseTab value="users" label="Users & Roles" />
					</FuseTabs>
				</div>
			}
			content={
				<div className="p-24 max-w-3xl">
					{tab === 'profile' && (
						<Paper className="p-24 rounded-xl vrams-card" elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
							<Typography variant="subtitle1" fontWeight={600} className="mb-16">Profile Settings</Typography>
							<div className="flex items-center gap-16 mb-20">
								<Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 24 }}>AU</Avatar>
								<div>
									<Typography variant="body1" fontWeight={600}>Admin User</Typography>
									<Typography variant="body2" color="text.secondary">admin@vrams.org</Typography>
								</div>
							</div>
							<div className="space-y-14">
								<TextField label="Full Name" defaultValue="Admin User" fullWidth size="small" />
								<TextField label="Email" defaultValue="admin@vrams.org" fullWidth size="small" disabled />
								<Divider />
								<Typography variant="subtitle2">Change Password</Typography>
								<TextField label="Current Password" type="password" fullWidth size="small" />
								<TextField label="New Password" type="password" fullWidth size="small" />
								<TextField label="Confirm New Password" type="password" fullWidth size="small" />
								<Button variant="contained">Save Changes</Button>
							</div>
						</Paper>
					)}

					{tab === 'org' && (
						<Paper className="p-24 rounded-xl vrams-card" elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
							<Typography variant="subtitle1" fontWeight={600} className="mb-16">Organisation Settings</Typography>
							<div className="space-y-14">
								<TextField label="Organisation Name" defaultValue="GL&SC Fleet" fullWidth size="small" />
								<div>
									<Typography variant="caption" color="text.secondary" className="mb-6 block">Logo</Typography>
									<div className="border-2 border-dashed rounded-xl p-20 text-center cursor-pointer hover:border-indigo-400 transition-colors">
										<FuseSvgIcon size={32} color="disabled">heroicons-outline:cloud-arrow-up</FuseSvgIcon>
										<Typography variant="body2" className="mt-8">Drop logo here or <span className="text-indigo-600 underline cursor-pointer">browse</span></Typography>
										<Typography variant="caption" color="text.secondary">PNG, SVG — up to 2MB</Typography>
									</div>
								</div>
								<Button variant="contained">Save Changes</Button>
							</div>
						</Paper>
					)}

					{tab === 'users' && <UsersTab />}
				</div>
			}
		/>
	);
}

export default VramsSettings;
