import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import { useGetVramsFleetDocumentsQuery } from '../VramsApi';
import type { FleetDocumentRow } from '../types';
import { VramsCard, VramsHeader, VramsPage } from '../components/VramsUi';
import { VramsTableBodySkeleton } from '../components/VramsLoadingSkeletons';
import { API_BASE_URL } from '@/utils/apiFetch';
import {
	documentFileName,
	documentDtTo,
	vehiclePlateNumber,
	vehicleMake,
	vehicleModel
} from '../utils/erdView';

function docHref(doc: FleetDocumentRow): string | null {
	if (!doc.file_url) return null;
	return doc.file_url.startsWith('http') ? doc.file_url : `${API_BASE_URL}${doc.file_url}`;
}

function formatDocType(t: string) {
	return t.replace(/_/g, ' ');
}

export default function VramsDocuments() {
	const [searchInput, setSearchInput] = useState('');
	const [appliedQ, setAppliedQ] = useState('');
	const { data, isLoading, isFetching } = useGetVramsFleetDocumentsQuery(appliedQ || undefined);

	const rows = data ?? [];

	const empty = !isLoading && rows.length === 0;

	const subtitle = useMemo(() => {
		if (appliedQ) return `Showing results for “${appliedQ}”.`;
		return 'Vehicle fitness, insurance, photos, and other uploaded files across the fleet.';
	}, [appliedQ]);

	return (
		<VramsPage>
			<VramsHeader
				title="Documents"
				subtitle={subtitle}
				actions={
					<span className="text-xs font-semibold text-slate-500 hidden sm:inline">
						{rows.length} file{rows.length === 1 ? '' : 's'}
					</span>
				}
			/>

			<VramsCard className="mb-6">
				<div className="flex flex-col sm:flex-row gap-12 sm:items-end">
					<TextField
						size="small"
						label="Search documents"
						placeholder="Plate, type, file name, make, model…"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') setAppliedQ(searchInput.trim());
						}}
						className="flex-1 min-w-[200px]"
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<span className="text-slate-400 text-sm" aria-hidden>
										⌕
									</span>
								</InputAdornment>
							)
						}}
					/>
					<div className="flex gap-8 shrink-0">
						<Button variant="contained" onClick={() => setAppliedQ(searchInput.trim())}>
							Search
						</Button>
						{appliedQ ? (
							<Button
								variant="text"
								onClick={() => {
									setSearchInput('');
									setAppliedQ('');
								}}
							>
								Clear
							</Button>
						) : null}
					</div>
				</div>
			</VramsCard>

			<VramsCard className="overflow-x-auto p-0">
				<table className="w-full text-left text-sm">
					<thead>
						<tr className="border-b border-slate-200 bg-slate-50/90">
							<th className="px-16 py-12 font-bold text-slate-600 whitespace-nowrap">File</th>
							<th className="px-16 py-12 font-bold text-slate-600 whitespace-nowrap">Type</th>
							<th className="px-16 py-12 font-bold text-slate-600 whitespace-nowrap">Vehicle</th>
							<th className="px-16 py-12 font-bold text-slate-600 whitespace-nowrap">Uploaded</th>
							<th className="px-16 py-12 font-bold text-slate-600 whitespace-nowrap">Expires</th>
							<th className="px-16 py-12 font-bold text-slate-600 text-right whitespace-nowrap"> </th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<VramsTableBodySkeleton rows={6} cols={6} />
						) : (
							rows.map((doc) => {
								const href = docHref(doc);
								const fileName = documentFileName(doc);
								const expiresAt = documentDtTo(doc);
								const vPlate = vehiclePlateNumber(doc.vehicle);
								const vMake = vehicleMake(doc.vehicle);
								const vModel = vehicleModel(doc.vehicle);
								
								return (
									<tr key={doc.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
										<td className="px-16 py-12 font-semibold text-slate-900 max-w-[220px]">
											<span className="truncate block" title={fileName || undefined}>
												{fileName || '—'}
											</span>
										</td>
										<td className="px-16 py-12 text-slate-700 capitalize">{formatDocType(doc.doc_type)}</td>
										<td className="px-16 py-12">
											<Link
												to={`/apps/vrams/vehicles/${doc.vehicle.id}`}
												className="font-semibold text-indigo-600 hover:underline whitespace-nowrap"
											>
												{vPlate}
											</Link>
											<span className="text-slate-500 text-xs block mt-2">
												{vMake} {vModel}
											</span>
										</td>
										<td className="px-16 py-12 text-slate-600 whitespace-nowrap">
											{doc.uploaded_at
												? new Date(doc.uploaded_at).toLocaleString(undefined, {
														dateStyle: 'medium',
														timeStyle: 'short'
													})
												: '—'}
										</td>
										<td className="px-16 py-12 text-slate-600 whitespace-nowrap">
											{expiresAt
												? new Date(expiresAt).toLocaleDateString(undefined, {
														day: 'numeric',
														month: 'short',
														year: 'numeric'
													})
												: '—'}
										</td>
										<td className="px-16 py-12 text-right whitespace-nowrap">
											{href ? (
												<a
													href={href}
													target="_blank"
													rel="noreferrer"
													className="text-sm font-bold text-indigo-600 hover:underline"
												>
													Open
												</a>
											) : (
												<span className="text-slate-400">—</span>
											)}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
				{empty ? (
					<p className="px-16 py-32 text-center text-slate-500 text-sm">
						{appliedQ ? 'No documents match your search.' : 'No documents uploaded yet. Add files from a vehicle profile.'}
					</p>
				) : null}
				{!isLoading && isFetching ? (
					<p className="px-16 py-10 text-center text-xs text-slate-400 border-t border-slate-100">Updating…</p>
				) : null}
			</VramsCard>
		</VramsPage>
	);
}
