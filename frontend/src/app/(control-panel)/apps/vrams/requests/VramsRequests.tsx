import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useGetVramsRequestsQuery } from '../VramsApi';
import type { VramsRequest } from '../types';
import NewRequestPanel from './NewRequestPanel';
import ReviewPanel from './ReviewPanel';

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, string> = {
		pending: 'bg-yellow-100 text-yellow-700',
		approved: 'bg-green-100 text-green-700',
		dispatched: 'bg-indigo-100 text-indigo-700',
		rejected: 'bg-gray-100 text-gray-500',
		completed: 'bg-emerald-100 text-emerald-700',
		cancelled: 'bg-red-100 text-red-600',
		urgent: 'bg-red-100 text-red-700',
		high: 'bg-orange-100 text-orange-700',
		normal: 'bg-blue-100 text-blue-700'
	};
	return (
		<span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
			{status}
		</span>
	);
}

function VramsRequests() {
	const [searchParams, setSearchParams] = useSearchParams();
	const openId = searchParams.get('open');
	const newMode = searchParams.get('new') === '1';

	const [panelOpen, setPanelOpen] = useState(false);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [showNew, setShowNew] = useState(false);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [priorityFilter, setPriorityFilter] = useState('');

	const { data: page, isLoading } = useGetVramsRequestsQuery({ per_page: 20, page: 1 });
	const requests: VramsRequest[] = page?.items ?? [];

	useEffect(() => {
		if (openId) {
			setSelectedId(Number(openId));
			setShowNew(false);
			setPanelOpen(true);
		} else if (newMode) {
			setSelectedId(null);
			setShowNew(true);
			setPanelOpen(true);
		}
	}, [openId, newMode]);

	function openReview(id: number) {
		setSelectedId(id);
		setShowNew(false);
		setPanelOpen(true);
		setSearchParams({ open: String(id) });
	}

	function openNew() {
		setSelectedId(null);
		setShowNew(true);
		setPanelOpen(true);
		setSearchParams({ new: '1' });
	}

	function closePanel() {
		setPanelOpen(false);
		setSearchParams({});
	}

	const filtered = requests.filter((r) => {
		const q = search.toLowerCase();
		const matchSearch =
			!q || r.ref.toLowerCase().includes(q) || (r.requester?.name ?? '').toLowerCase().includes(q);
		const matchStatus = !statusFilter || r.status === statusFilter;
		const matchPriority = !priorityFilter || r.priority === priorityFilter;
		return matchSearch && matchStatus && matchPriority;
	});

	return (
		<div className="flex h-full">
			{/* Main content */}
			<div className={`flex-1 min-w-0 p-8 transition-all ${panelOpen ? 'mr-0 lg:mr-[460px]' : ''}`}>
				{/* Page header */}
				<div className="flex items-start justify-between mb-7">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Requests Management</h1>
						<p className="text-base text-gray-500 mt-1">Review, approve, and dispatch vehicle requests.</p>
					</div>
					<button
						type="button"
						onClick={openNew}
						className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white text-base font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
					>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
							<path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
						</svg>
						New Request
					</button>
				</div>

				{/* Filters + Table card */}
				<div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
					<div className="flex flex-wrap gap-3 px-6 py-4 border-b border-gray-100">
						<div className="relative flex-1 min-w-[200px]">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
								className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
								<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
							</svg>
							<input
								type="text"
								placeholder="Search by ref or requester…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
						>
							<option value="">All Status</option>
							<option value="pending">Pending</option>
							<option value="approved">Approved</option>
							<option value="dispatched">Dispatched</option>
							<option value="rejected">Rejected</option>
							<option value="completed">Completed</option>
						</select>
						<select
							value={priorityFilter}
							onChange={(e) => setPriorityFilter(e.target.value)}
							className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
						>
							<option value="">All Priority</option>
							<option value="urgent">Urgent</option>
							<option value="high">High</option>
							<option value="normal">Normal</option>
						</select>
					</div>

					{/* Table */}
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="bg-gray-50 border-b border-gray-100">
									{['REF / REQUESTER / DESTINATION', 'DEPARTURE DATE', 'BOOKING TYPE', 'PRIORITY', 'STATUS', 'ACTION'].map((h) => (
										<th key={h} className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{isLoading ? (
									<tr>
										<td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-base">Loading…</td>
									</tr>
								) : filtered.length === 0 ? (
									<tr>
										<td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-base">No requests found</td>
									</tr>
								) : (
									filtered.map((r) => (
										<tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openReview(r.id)}>
											<td className="px-6 py-5">
												<p className="font-bold text-blue-600 text-base">{r.ref}</p>
												<p className="text-sm text-gray-500 mt-0.5">{r.requester?.name}</p>
												<p className="text-sm text-gray-400 mt-0.5">↳ {r.destination}</p>
											</td>
											<td className="px-6 py-5 whitespace-nowrap">
												<p className="text-base text-gray-700">
													{new Date(r.departure_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
												</p>
												<p className="text-sm text-gray-400 mt-0.5">
													{new Date(r.departure_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
												</p>
											</td>
											<td className="px-6 py-5">
												<span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold capitalize">
													{r.booking_type}
												</span>
											</td>
											<td className="px-6 py-5">
												<StatusBadge status={r.priority} />
											</td>
											<td className="px-6 py-5">
												<StatusBadge status={r.status} />
											</td>
											<td className="px-6 py-5">
												{r.status === 'pending' ? (
													<button
														type="button"
														className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
														onClick={(e) => { e.stopPropagation(); openReview(r.id); }}
													>
														Review
													</button>
												) : (
													<button
														type="button"
														className="px-4 py-2 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
														onClick={(e) => { e.stopPropagation(); openReview(r.id); }}
													>
														View
													</button>
												)}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					<div className="px-6 py-4 border-t border-gray-100 text-sm text-gray-400">
						Showing 1–{filtered.length} of {page?.total ?? 0} requests
					</div>
				</div>
			</div>

			{/* Right side panel */}
			{panelOpen && (
				<div className="fixed top-16 right-0 bottom-0 w-full max-w-[460px] bg-white border-l border-gray-200 overflow-y-auto z-40 shadow-xl">
					{showNew ? (
						<NewRequestPanel onClose={closePanel} />
					) : selectedId ? (
						<ReviewPanel requestId={selectedId} onClose={closePanel} />
					) : null}
				</div>
			)}
		</div>
	);
}

export default VramsRequests;
