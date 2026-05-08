import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useSnackbar } from 'notistack';
import { useAcceptVramsInviteMutation } from '../VramsApi';
import { VramsCard, VramsPage } from '../components/VramsUi';

export default function AcceptInvitePage() {
	const location = useLocation();
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const [password, setPassword] = useState('');
	const [acceptInvite, { isLoading }] = useAcceptVramsInviteMutation();
	const token = useMemo(() => new URLSearchParams(location.search).get('token') ?? '', [location.search]);

	async function onSubmit() {
		if (!token) {
			enqueueSnackbar('Missing invite token.', { variant: 'error' });
			return;
		}
		if (password.length < 8) {
			enqueueSnackbar('Password must be at least 8 characters.', { variant: 'warning' });
			return;
		}
		try {
			await acceptInvite({ token, password }).unwrap();
			enqueueSnackbar('Invite accepted. You can now sign in.', { variant: 'success' });
			navigate('/sign-in');
		} catch {
			enqueueSnackbar('Failed to accept invite token.', { variant: 'error' });
		}
	}

	return (
		<VramsPage>
			<div className="max-w-xl mx-auto">
				<VramsCard className="p-6">
					<p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Driver Onboarding</p>
					<h1 className="text-2xl font-bold text-slate-900 mt-1">Accept Invite</h1>
					<p className="text-sm text-slate-600 mt-2">Set your password to complete your fleet account setup.</p>
					<div className="mt-4 space-y-3">
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="Create password"
							className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
						/>
						<button
							type="button"
							onClick={onSubmit}
							disabled={isLoading}
							className="w-full h-10 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
						>
							{isLoading ? 'Submitting...' : 'Accept Invite'}
						</button>
					</div>
				</VramsCard>
			</div>
		</VramsPage>
	);
}
