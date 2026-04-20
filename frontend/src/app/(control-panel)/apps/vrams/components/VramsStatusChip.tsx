import Chip from '@mui/material/Chip';
import type { RequestStatus, VehicleStatus, DispatchStatus, RequestPriority } from '../types';

type Status = RequestStatus | VehicleStatus | DispatchStatus | RequestPriority;

const STATUS_MAP: Record<
	Status,
	{ label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' | 'primary' | 'secondary' }
> = {
	// Request status
	pending: { label: 'Pending', color: 'warning' },
	approved: { label: 'Approved', color: 'success' },
	dispatched: { label: 'Dispatched', color: 'info' },
	rejected: { label: 'Rejected', color: 'error' },
	completed: { label: 'Completed', color: 'success' },
	cancelled: { label: 'Cancelled', color: 'default' },
	// Vehicle status
	available: { label: 'Available', color: 'success' },
	in_service: { label: 'In Service', color: 'warning' },
	out_of_service: { label: 'Out of Service', color: 'error' },
	// Dispatch status
	en_route: { label: 'En Route', color: 'info' },
	returned: { label: 'Returned', color: 'success' },
	delayed: { label: 'Delayed', color: 'error' },
	// Priority
	normal: { label: 'Normal', color: 'default' },
	high: { label: 'High', color: 'warning' },
	urgent: { label: 'Urgent', color: 'error' }
};

type Props = { status: Status; size?: 'small' | 'medium' };

function VramsStatusChip({ status, size = 'small' }: Props) {
	const cfg = STATUS_MAP[status] ?? { label: status, color: 'default' as const };
	return (
		<Chip
			label={cfg.label}
			color={cfg.color}
			size={size}
			variant="filled"
		/>
	);
}

export default VramsStatusChip;
