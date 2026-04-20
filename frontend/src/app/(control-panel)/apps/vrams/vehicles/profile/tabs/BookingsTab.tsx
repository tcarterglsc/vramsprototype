import { useMemo } from 'react';
import { type MRT_ColumnDef } from 'material-react-table';
import DataTable from 'src/components/data-table/DataTable';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import FuseLoading from '@fuse/core/FuseLoading';
import { useGetVramsVehicleBookingsQuery } from '../../../VramsApi';
import VramsStatusChip from '../../../components/VramsStatusChip';
import type { VramsRequest } from '../../../types';

function BookingsTab({ vehicleId }: { vehicleId: number }) {
	const { data: bookings, isLoading } = useGetVramsVehicleBookingsQuery(vehicleId);

	const columns = useMemo<MRT_ColumnDef<VramsRequest>[]>(
		() => [
			{
				accessorKey: 'ref',
				header: 'Ref',
				Cell: ({ cell }) => (
					<Typography className="font-semibold text-indigo-600">{cell.getValue<string>()}</Typography>
				)
			},
			{
				id: 'requester',
				header: 'Requester',
				accessorFn: (r) => r.requester?.name ?? '—'
			},
			{ accessorKey: 'destination', header: 'Destination' },
			{
				accessorKey: 'departure_at',
				header: 'Departure',
				Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleString()
			},
			{
				accessorKey: 'status',
				header: 'Status',
				Cell: ({ row }) => <VramsStatusChip status={row.original.status} />
			}
		],
		[]
	);

	if (isLoading) return <FuseLoading />;

	return (
		<Paper className="rounded-xl overflow-hidden" elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
			<DataTable data={bookings ?? []} columns={columns} initialState={{ density: 'comfortable' }} />
		</Paper>
	);
}

export default BookingsTab;
