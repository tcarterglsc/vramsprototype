import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import { useSnackbar } from 'notistack';
import { useCreateVramsMaintenanceMutation } from '../../VramsApi';

type Props = {
	vehicleId: number;
	open: boolean;
	onClose: () => void;
};

const SERVICE_TYPES = ['Oil Change', 'Tyre Rotation', 'Battery Replacement', 'Brake Service', 'General Service', 'Other'];

export default function LogServiceModal({ vehicleId, open, onClose }: Props) {
	const { enqueueSnackbar } = useSnackbar();
	const [createMaintenance, { isLoading }] = useCreateVramsMaintenanceMutation();
	const [serviceType, setServiceType] = useState('General Service');
	const [datePerformed, setDatePerformed] = useState(new Date().toISOString().slice(0, 10));
	const [technician, setTechnician] = useState('');
	const [costKes, setCostKes] = useState('');
	const [nextDueDate, setNextDueDate] = useState('');
	const [notes, setNotes] = useState('');

	async function handleSave() {
		if (!technician.trim()) {
			enqueueSnackbar('Technician is required.', { variant: 'warning' });
			return;
		}

		try {
			await createMaintenance({
				vehicle_id: vehicleId,
				service_type: serviceType,
				date_performed: datePerformed,
				technician: technician.trim(),
				cost_kes: costKes ? Number(costKes) : undefined,
				next_due_date: nextDueDate || undefined,
				notes: notes || undefined
			}).unwrap();
			enqueueSnackbar('Service logged successfully.', { variant: 'success' });
			onClose();
		} catch {
			enqueueSnackbar('Failed to log service.', { variant: 'error' });
		}
	}

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Log Vehicle Service</DialogTitle>
			<DialogContent className="space-y-16 pt-8">
				<TextField select label="Service Type" value={serviceType} onChange={(e) => setServiceType(e.target.value)} fullWidth size="small">
					{SERVICE_TYPES.map((type) => (
						<MenuItem key={type} value={type}>
							{type}
						</MenuItem>
					))}
				</TextField>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
					<TextField
						label="Date Performed"
						type="date"
						value={datePerformed}
						onChange={(e) => setDatePerformed(e.target.value)}
						fullWidth
						size="small"
						InputLabelProps={{ shrink: true }}
					/>
					<TextField
						label="Next Due Date (optional)"
						type="date"
						value={nextDueDate}
						onChange={(e) => setNextDueDate(e.target.value)}
						fullWidth
						size="small"
						InputLabelProps={{ shrink: true }}
					/>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
					<TextField label="Technician" value={technician} onChange={(e) => setTechnician(e.target.value)} fullWidth size="small" />
					<TextField
						label="Cost (KES)"
						type="number"
						value={costKes}
						onChange={(e) => setCostKes(e.target.value)}
						fullWidth
						size="small"
						inputProps={{ min: 0 }}
					/>
				</div>
				<TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth size="small" multiline rows={2} />
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" onClick={handleSave} disabled={isLoading}>
					Save Service
				</Button>
			</DialogActions>
		</Dialog>
	);
}
