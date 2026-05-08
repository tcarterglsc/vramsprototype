import { useMemo } from 'react';
import { type MRT_ColumnDef } from 'material-react-table';
import DataTable from 'src/components/data-table/DataTable';
import Paper from '@mui/material/Paper';
import { VramsDataTablePanelSkeleton } from '../../../components/VramsLoadingSkeletons';
import { useGetVramsVehicleStatusLogsQuery } from '../../../VramsApi';
import VramsStatusChip from '../../../components/VramsStatusChip';
import type { StatusLog } from '../../../types';

function StatusLogTab({ vehicleId }: { vehicleId: number }) {
	const { data: logs, isLoading } = useGetVramsVehicleStatusLogsQuery(vehicleId);

	const columns = useMemo<MRT_ColumnDef<StatusLog>[]>(
		() => [
			{
				accessorKey: 'changed_at',
				header: 'Date / Time',
				Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleString()
			},
			{
				id: 'changed_by',
				header: 'Changed By',
				accessorFn: (r) => r.changed_by?.name ?? 'System'
			},
			{
				accessorKey: 'from_status',
				header: 'From',
				Cell: ({ row }) => <VramsStatusChip status={row.original.from_status} />
			},
			{
				accessorKey: 'to_status',
				header: 'To',
				Cell: ({ row }) => <VramsStatusChip status={row.original.to_status} />
			},
			{ accessorKey: 'reason', header: 'Reason' }
		],
		[]
	);

	if (isLoading) return <VramsDataTablePanelSkeleton rows={8} />;

	return (
		<Paper className="rounded-xl overflow-hidden" elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
			<DataTable data={logs ?? []} columns={columns} initialState={{ density: 'comfortable' }} />
		</Paper>
	);
}

export default StatusLogTab;
