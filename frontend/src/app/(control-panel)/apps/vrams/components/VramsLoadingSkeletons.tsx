import Skeleton from '@mui/material/Skeleton';
import Box from '@mui/material/Box';

/** Table body rows with shimmer cells (use inside existing <table><tbody>). */
export function VramsTableBodySkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
	return (
		<>
			{Array.from({ length: rows }).map((_, i) => (
				<tr key={i} className="border-b border-gray-100">
					{Array.from({ length: cols }).map((_, j) => (
						<td key={j} className="px-6 py-4">
							<Skeleton variant="rounded" height={22} animation="wave" sx={{ borderRadius: 1 }} />
						</td>
					))}
				</tr>
			))}
		</>
	);
}

/** Vehicle card grid placeholders (matches VramsVehicles layout). */
export function VramsVehicleCardGridSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
			{Array.from({ length: count }).map((_, i) => (
				<Box
					key={i}
					className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4"
					sx={{ overflow: 'hidden' }}
				>
					<Skeleton variant="rounded" height={150} animation="wave" />
					<Skeleton variant="text" width="55%" height={28} animation="wave" />
					<Skeleton variant="text" width="80%" animation="wave" />
					<div className="space-y-2 pt-2">
						<Skeleton variant="text" animation="wave" />
						<Skeleton variant="text" width="90%" animation="wave" />
					</div>
					<div className="flex gap-2 pt-2">
						<Skeleton variant="rounded" height={40} animation="wave" sx={{ flex: 1 }} />
						<Skeleton variant="rounded" height={40} animation="wave" sx={{ flex: 1 }} />
					</div>
				</Box>
			))}
		</div>
	);
}

/** Stat cards row (maintenance / dashboard style). */
export function VramsStatRowSkeleton({ cards = 4 }: { cards?: number }) {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
			{Array.from({ length: cards }).map((_, i) => (
				<div key={i} className="bg-white border border-gray-200 rounded-2xl p-6">
					<Skeleton variant="text" width="40%" animation="wave" />
					<Skeleton variant="text" width="55%" height={48} animation="wave" />
					<Skeleton variant="text" width="70%" animation="wave" />
				</div>
			))}
		</div>
	);
}

/** Search result list placeholders inside a card. */
export function VramsSearchListSkeleton({ lines = 5 }: { lines?: number }) {
	return (
		<div className="divide-y divide-slate-100">
			{Array.from({ length: lines }).map((_, i) => (
				<div key={i} className="px-5 py-3 space-y-2">
					<Skeleton variant="text" width="65%" animation="wave" />
					<Skeleton variant="text" width="45%" animation="wave" />
				</div>
			))}
		</div>
	);
}

/** Sidebar / list block (dashboard audit, services). */
export function VramsListBlockSkeleton({ items = 3 }: { items?: number }) {
	return (
		<div className="p-3 space-y-2">
			{Array.from({ length: items }).map((_, i) => (
				<Skeleton key={i} variant="rounded" height={72} animation="wave" sx={{ borderRadius: 2 }} />
			))}
		</div>
	);
}

/** Material-react-table sized panel (vehicle profile tabs). */
export function VramsDataTablePanelSkeleton({ rows = 6 }: { rows?: number }) {
	return (
		<Box className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
			<Skeleton variant="rounded" height={40} animation="wave" />
			{Array.from({ length: rows }).map((_, i) => (
				<Skeleton key={i} variant="rounded" height={36} animation="wave" />
			))}
		</Box>
	);
}

/** Full-width form page (edit screens). */
export function VramsFormPageSkeleton() {
	return (
		<Box className="max-w-3xl mx-auto p-6 space-y-4">
			<Skeleton variant="text" width="40%" height={40} animation="wave" />
			<Skeleton variant="text" width="70%" animation="wave" />
			{Array.from({ length: 8 }).map((_, i) => (
				<Skeleton key={i} variant="rounded" height={48} animation="wave" />
			))}
			<Skeleton variant="rounded" width={140} height={40} animation="wave" />
		</Box>
	);
}

/** Request review / edit slide-over panel. */
export function VramsSidePanelSkeleton() {
	return (
		<div className="flex flex-col h-full min-h-[320px] bg-slate-50 p-5 gap-4 justify-center">
			<Skeleton variant="rounded" height={36} animation="wave" />
			<Skeleton variant="rounded" height={120} animation="wave" />
			<Skeleton variant="rounded" height={80} animation="wave" />
			<div className="flex gap-2 mt-4">
				<Skeleton variant="rounded" height={40} animation="wave" sx={{ flex: 1 }} />
				<Skeleton variant="rounded" height={40} animation="wave" sx={{ flex: 1 }} />
			</div>
		</div>
	);
}

/** Vehicle profile hero + tab area. */
export function VramsVehicleProfileSkeleton() {
	return (
		<div className="space-y-6">
			<Skeleton variant="rounded" height={220} animation="wave" sx={{ borderRadius: 3 }} />
			<div className="flex gap-2">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} variant="rounded" width={100} height={36} animation="wave" />
				))}
			</div>
			<Skeleton variant="rounded" height={280} animation="wave" />
		</div>
	);
}
