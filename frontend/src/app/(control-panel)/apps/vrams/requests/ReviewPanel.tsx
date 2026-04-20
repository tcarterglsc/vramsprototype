import { useState } from 'react';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router';
import {
	useGetVramsRequestQuery,
	useApproveVramsRequestMutation,
	useRejectVramsRequestMutation
} from '../VramsApi';

type Props = { requestId: number; onClose: () => void };

function PriorityBadge({ priority }: { priority: string }) {
	const map: Record<string, string> = {
		urgent: 'bg-red-100 text-red-700',
		high: 'bg-orange-100 text-orange-700',
		normal: 'bg-blue-100 text-blue-700'
	};
	return (
		<span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[priority] ?? 'bg-gray-100 text-gray-500'}`}>
			{priority}
		</span>
	);
}

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, string> = {
		pending: 'bg-yellow-100 text-yellow-700',
		approved: 'bg-green-100 text-green-700',
		dispatched: 'bg-indigo-100 text-indigo-700',
		rejected: 'bg-red-100 text-red-600',
		completed: 'bg-emerald-100 text-emerald-700'
	};
	return (
		<span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
			{status}
		</span>
	);
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="flex items-start justify-between py-2.5 border-b border-gray-50 last:border-0">
			<span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 flex-shrink-0">{label}</span>
			<span className="text-sm text-gray-800 font-medium text-right">{String(value)}</span>
		</div>
	);
}

function ReviewPanel({ requestId, onClose }: Props) {
	const { enqueueSnackbar } = useSnackbar();
	const navigate = useNavigate();
	const { data: request, isLoading } = useGetVramsRequestQuery(requestId);
	const [approve, { isLoading: approving }] = useApproveVramsRequestMutation();
	const [reject, { isLoading: rejecting }] = useRejectVramsRequestMutation();
	const [rejectMode, setRejectMode] = useState(false);
	const [rejectReason, setRejectReason] = useState('');
	const [done, setDone] = useState<'approved' | 'rejected' | null>(null);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-48 text-gray-400 text-sm">
				Loading…
			</div>
		);
	}
	if (!request) return null;

	async function handleApprove() {
		try {
			await approve(request!.id).unwrap();
			setDone('approved');
			enqueueSnackbar(`${request!.ref} approved`, { variant: 'success' });
		} catch {
			enqueueSnackbar('Failed to approve', { variant: 'error' });
		}
	}

	async function handleReject() {
		if (!rejectReason.trim()) {
			enqueueSnackbar('Please enter a rejection reason', { variant: 'warning' });
			return;
		}
		try {
			await reject({ id: request!.id, reason: rejectReason }).unwrap();
			setDone('rejected');
			enqueueSnackbar(`${request!.ref} rejected`, { variant: 'info' });
		} catch {
			enqueueSnackbar('Failed to reject', { variant: 'error' });
		}
	}

	const rows = [
		{ label: 'Requester', value: request.requester?.name ?? '—' },
		{ label: 'Department', value: request.requester?.department ?? '—' },
		{ label: 'Destination', value: request.destination },
		{ label: 'Departure', value: new Date(request.departure_at).toLocaleString() },
		{ label: 'Return', value: request.return_at ? new Date(request.return_at).toLocaleString() : '—' },
		{ label: 'Booking Type', value: request.booking_type },
		{ label: 'Passengers', value: request.passenger_count ?? 1 },
		{ label: 'Purpose', value: request.purpose ?? '—' }
	];

	return (
		<div className="flex flex-col h-full bg-white">
			{/* Header */}
			<div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
				<div>
					<div className="flex items-center gap-2 mb-1">
						<div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-sm">📋</div>
						<span className="font-semibold text-gray-900">{request.ref}</span>
					</div>
					<div className="flex items-center gap-2">
						<PriorityBadge priority={request.priority} />
						<StatusBadge status={request.status} />
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg leading-none"
				>
					×
				</button>
			</div>

			{/* Success / rejected state */}
			{done === 'approved' && (
				<div className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
					<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl">✅</div>
					<div>
						<p className="text-base font-bold text-green-700">Request Approved</p>
						<p className="text-sm text-gray-500 mt-1">{request.ref} is ready for dispatch.</p>
					</div>
					<button
						type="button"
						onClick={() => navigate('/apps/vrams/dispatch')}
						className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
					>
						→ Go to Dispatch
					</button>
					<button
						type="button"
						onClick={onClose}
						className="w-full py-2.5 border border-gray-300 text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
					>
						Back to Requests
					</button>
				</div>
			)}

			{done === 'rejected' && (
				<div className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
					<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl">❌</div>
					<div>
						<p className="text-base font-bold text-red-700">Request Rejected</p>
						<p className="text-sm text-gray-500 mt-1">The requester will be notified.</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-full py-2.5 border border-gray-300 text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
					>
						Back to Requests
					</button>
				</div>
			)}

			{!done && (
				<>
					{/* Detail rows */}
					<div className="flex-1 overflow-y-auto px-5 py-3">
						{rows.map((r) => (
							<DetailRow
								key={r.label}
								{...r}
							/>
						))}

						{rejectMode && (
							<div className="mt-4 pt-4 border-t border-gray-100">
								<label className="text-xs font-semibold tracking-widest text-gray-400 uppercase block mb-2">
									Rejection Reason
								</label>
								<textarea
									value={rejectReason}
									onChange={(e) => setRejectReason(e.target.value)}
									rows={3}
									placeholder="e.g. No vehicles available for this date…"
									className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
								/>
							</div>
						)}
					</div>

					{/* Actions */}
					{request.status === 'pending' && (
						<div className="border-t border-gray-100 p-4 space-y-2">
							{!rejectMode ? (
								<>
									<button
										type="button"
										onClick={handleApprove}
										disabled={approving}
										className="w-full py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
									>
										{approving && (
											<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
										)}
										✓ Approve Request
									</button>
									<button
										type="button"
										onClick={() => navigate('/apps/vrams/dispatch')}
										className="w-full py-2.5 border border-gray-300 text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
									>
										→ Send to Dispatch
									</button>
									<button
										type="button"
										onClick={() => setRejectMode(true)}
										className="w-full py-2.5 border border-red-200 text-sm font-semibold text-red-600 rounded-lg hover:bg-red-50 transition-colors"
									>
										✕ Reject Request
									</button>
								</>
							) : (
								<>
									<button
										type="button"
										onClick={handleReject}
										disabled={rejecting}
										className="w-full py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
									>
										{rejecting && (
											<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
										)}
										Confirm Rejection
									</button>
									<button
										type="button"
										onClick={() => setRejectMode(false)}
										className="w-full py-2.5 border border-gray-300 text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
									>
										Cancel
									</button>
								</>
							)}
						</div>
					)}

					{request.status !== 'pending' && (
						<div className="border-t border-gray-100 p-4">
							<div
								className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
									request.status === 'rejected'
										? 'bg-red-50 text-red-700'
										: request.status === 'approved'
											? 'bg-green-50 text-green-700'
											: 'bg-blue-50 text-blue-700'
								}`}
							>
								<span>
									{request.status === 'rejected' ? '✕' : request.status === 'approved' ? '✓' : 'ℹ'}
								</span>
								This request is already <strong className="ml-1 capitalize">{request.status}</strong>.
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}

export default ReviewPanel;
