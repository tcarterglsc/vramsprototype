import { useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import { useSnackbar } from 'notistack';
import { API_BASE_URL } from '@/utils/apiFetch';
import { useGetVramsVehicleDocumentsQuery, useUploadVramsVehicleDocumentMutation } from '../../VramsApi';
import type { DocumentType } from '../../types';

type Props = {
	vehicleId: number;
	open: boolean;
	onClose: () => void;
};

const DOC_TYPES: DocumentType[] = ['fitness_certificate', 'insurance', 'road_licence', 'vehicle_photo', 'other'];

export default function UploadDocumentModal({ vehicleId, open, onClose }: Props) {
	const { enqueueSnackbar } = useSnackbar();
	const { data: documents = [] } = useGetVramsVehicleDocumentsQuery(vehicleId, { skip: !open });
	const [uploadDocument, { isLoading }] = useUploadVramsVehicleDocumentMutation();

	const [docType, setDocType] = useState<DocumentType>('other');
	const [expiresAt, setExpiresAt] = useState('');
	const [file, setFile] = useState<File | null>(null);

	const sortedDocuments = useMemo(
		() =>
			[...documents].sort(
				(a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
			),
		[documents]
	);

	async function handleUpload() {
		if (!file) {
			enqueueSnackbar('Please choose a file first.', { variant: 'warning' });
			return;
		}
		try {
			await uploadDocument({ vehicleId, doc_type: docType, expires_at: expiresAt || undefined, file }).unwrap();
			enqueueSnackbar('Document uploaded.', { variant: 'success' });
			setFile(null);
			setExpiresAt('');
		} catch {
			enqueueSnackbar('Upload failed.', { variant: 'error' });
		}
	}

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>Upload Vehicle Document</DialogTitle>
			<DialogContent className="space-y-16 pt-8">
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
					<TextField select label="Document Type" value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)} fullWidth size="small">
						{DOC_TYPES.map((type) => (
							<MenuItem key={type} value={type}>
								{type.replace('_', ' ')}
							</MenuItem>
						))}
					</TextField>
					<TextField
						label="Expiry (optional)"
						type="date"
						value={expiresAt}
						onChange={(e) => setExpiresAt(e.target.value)}
						fullWidth
						size="small"
						InputLabelProps={{ shrink: true }}
					/>
					<div className="flex items-center">
						<input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
					</div>
				</div>
				<div className="rounded-xl border border-slate-200 overflow-hidden">
					<div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">Uploaded Documents</div>
					<div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
						{sortedDocuments.length === 0 ? (
							<div className="px-4 py-4 text-sm text-slate-500">No documents uploaded yet.</div>
						) : (
							sortedDocuments.map((doc) => (
								<div key={doc.id} className="px-4 py-3 flex items-center justify-between gap-3">
									<div className="min-w-0">
										<p className="text-sm font-semibold text-slate-800 truncate">{doc.file_name || 'Document'}</p>
										<p className="text-xs text-slate-500">
											{doc.doc_type.replace('_', ' ')} • Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
										</p>
									</div>
									{doc.file_url ? (
										<a
											href={doc.file_url.startsWith('http') ? doc.file_url : `${API_BASE_URL}${doc.file_url}`}
											target="_blank"
											rel="noreferrer"
											className="text-sm font-semibold text-blue-600 hover:underline"
										>
											Open
										</a>
									) : null}
								</div>
							))
						)}
					</div>
				</div>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Close</Button>
				<Button variant="contained" onClick={handleUpload} disabled={isLoading}>
					Upload
				</Button>
			</DialogActions>
		</Dialog>
	);
}
