import { useMemo } from 'react';
import { type MRT_ColumnDef } from 'material-react-table';
import DataTable from 'src/components/data-table/DataTable';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import { VramsDataTablePanelSkeleton } from '../../../components/VramsLoadingSkeletons';
import { useGetVramsVehicleMaintenanceQuery } from '../../../VramsApi';
import type { MaintenanceLog } from '../../../types';
import {
	serviceTypeLabel,
	serviceDate,
	serviceTechnician,
	serviceCost,
	serviceNextDate
} from '../../../utils/erdView';

function ServiceHistoryTab({ vehicleId }: { vehicleId: number }) {
	const { data: logs, isLoading } = useGetVramsVehicleMaintenanceQuery(vehicleId);

	const columns = useMemo<MRT_ColumnDef<MaintenanceLog>[]>(
		() => [
			{
				accessorKey: 'service_type',
				header: 'Service Type',
				Cell: ({ row }) => serviceTypeLabel(row.original)
			},
			{
				accessorKey: 'date_performed',
				header: 'Date',
				Cell: ({ row }) => new Date(serviceDate(row.original)).toLocaleDateString()
			},
			{
				accessorKey: 'technician',
				header: 'Technician',
				Cell: ({ row }) => serviceTechnician(row.original)
			},
			{
				accessorKey: 'cost_kes',
				header: 'Cost (KES)',
				Cell: ({ row }) => serviceCost(row.original)?.toLocaleString() ?? '—'
			},
			{
				accessorKey: 'next_due_date',
				header: 'Next Due',
				Cell: ({ row }) => {
					const v = serviceNextDate(row.original);
					if (!v) return '—';
					const days = Math.ceil((new Date(v).getTime() - Date.now()) / 86400000);
					return (
						<Chip
							label={new Date(v).toLocaleDateString()}
							color={days < 0 ? 'error' : days < 30 ? 'warning' : 'success'}
							size="small"
						/>
					);
				}
			}
		],
		[]
	);

	if (isLoading) return <VramsDataTablePanelSkeleton rows={8} />;

	return (
		<Paper className="rounded-xl overflow-hidden" elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
			<DataTable
				data={logs ?? []}
				columns={columns}
				initialState={{ density: 'comfortable' }}
			/>
		</Paper>
	);
}

export default ServiceHistoryTab;
