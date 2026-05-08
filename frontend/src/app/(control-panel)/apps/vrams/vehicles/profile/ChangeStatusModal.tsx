import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import TextField from '@mui/material/TextField';
import { useEffect, useState } from 'react';
import { useSnackbar } from 'notistack';
import { useUpdateVramsVehicleStatusMutation } from '../../VramsApi';
import type { VehicleStatus } from '../../types';

type Props = { vehicleId: number; currentStatus: VehicleStatus; open: boolean; onClose: () => void };

function ChangeStatusModal({ vehicleId, currentStatus, open, onClose }: Props) {
	const { enqueueSnackbar } = useSnackbar();
	const [newStatus, setNewStatus] = useState<VehicleStatus>(currentStatus);
	const [reason, setReason] = useState('');
	const [updateStatus, { isLoading }] = useUpdateVramsVehicleStatusMutation();

	useEffect(() => {
		if (!open) return;
		setNewStatus(currentStatus);
		setReason('');
	}, [open, currentStatus]);

	async function handleSave() {
		try {
			await updateStatus({ id: vehicleId, status: newStatus, reason }).unwrap();
			enqueueSnackbar('Vehicle status updated', { variant: 'success' });
			onClose();
		} catch {
			enqueueSnackbar('Failed to update status', { variant: 'error' });
		}
	}

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>Change Vehicle Status</DialogTitle>
			<DialogContent className="space-y-16 pt-8">
				<RadioGroup value={newStatus} onChange={(e) => setNewStatus(e.target.value as VehicleStatus)}>
					{(['available', 'in_service', 'out_of_service'] as VehicleStatus[]).map((s) => (
						<FormControlLabel key={s} value={s} control={<Radio />} label={s.replace('_', ' ')} className="capitalize" />
					))}
				</RadioGroup>
				<TextField
					label="Reason (optional)"
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					fullWidth
					size="small"
					multiline
					rows={2}
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" onClick={handleSave} disabled={isLoading}>Save Status</Button>
			</DialogActions>
		</Dialog>
	);
}

export default ChangeStatusModal;
