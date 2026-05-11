import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useSnackbar } from 'notistack';
import { Link } from 'react-router';
import { useVramsNotificationPrefs } from '../hooks/useVramsNotificationPrefs';

const POLL_OPTIONS: { label: string; ms: number }[] = [
	{ label: 'Every 15 seconds', ms: 15_000 },
	{ label: 'Every 30 seconds', ms: 30_000 },
	{ label: 'Every 60 seconds', ms: 60_000 },
	{ label: 'Off (check when opening the bell)', ms: 0 }
];

export default function SettingsNotificationsPage() {
	const { enqueueSnackbar } = useSnackbar();
	const { pollMs, setPollMs, defaultPollMs } = useVramsNotificationPrefs();

	return (
		<div className="max-w-2xl space-y-20">
			<Paper className="p-24 rounded-xl space-y-20" elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
				<div>
					<Typography variant="subtitle1" fontWeight={700} className="mb-6 text-slate-900">
						Notifications
					</Typography>
					<Typography variant="body2" color="text.secondary" className="mb-16">
						How often the header bell checks for new alerts. Opening the list always loads the latest.
					</Typography>
					<Typography variant="subtitle2" fontWeight={600} className="mb-12 text-slate-800">
						Background refresh
					</Typography>
					<TextField
						select
						label="Poll for unread count"
						value={POLL_OPTIONS.some((o) => o.ms === pollMs) ? pollMs : defaultPollMs}
						onChange={(e) => setPollMs(Number(e.target.value))}
						fullWidth
						size="small"
						helperText="Saved automatically for this browser. Lower intervals use slightly more network traffic."
					>
						{POLL_OPTIONS.map((o) => (
							<MenuItem key={o.ms} value={o.ms}>
								{o.label}
							</MenuItem>
						))}
					</TextField>
				</div>

				<div className="rounded-lg border border-slate-100 bg-slate-50 px-16 py-14">
					<Typography variant="body2" color="text.secondary">
						Email or SMS delivery is not configured in this prototype. All alerts are in-app under the{' '}
						<span className="font-semibold text-slate-700">🔔</span> icon.
					</Typography>
				</div>

				<Button
					variant="outlined"
					size="small"
					onClick={() => {
						setPollMs(defaultPollMs);
						enqueueSnackbar('Reset to default refresh interval.', { variant: 'success' });
					}}
				>
					Reset to default (30s)
				</Button>
			</Paper>

			<p className="text-sm text-slate-500">
				<Link to="/apps/vrams/settings/profile" className="font-semibold text-indigo-600 hover:underline">
					Profile & password
				</Link>{' '}
				— account security settings.
			</p>
		</div>
	);
}
