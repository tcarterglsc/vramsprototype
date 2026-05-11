import { NavLink, Outlet, Navigate } from 'react-router';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { VramsHeader, VramsPage } from '../components/VramsUi';

const BASE = '/apps/vrams/settings';

const SECTIONS = [
	{ to: `${BASE}/profile`, label: 'Profile', description: 'Name, contact, password' },
	{ to: `${BASE}/notifications`, label: 'Notifications', description: 'In-app alert refresh' }
] as const;

export default function VramsSettingsLayout() {
	return (
		<VramsPage>
			<VramsHeader
				title="Settings"
				subtitle="Account preferences for VRAMS. Changes apply to your login only."
			/>

			<div className="flex flex-col lg:flex-row gap-24 lg:gap-32 max-w-5xl">
				<nav
					className="lg:w-56 shrink-0 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
					aria-label="Settings sections"
				>
					<List disablePadding className="space-y-4">
						{SECTIONS.map((s) => (
							<ListItemButton
								key={s.to}
								component={NavLink}
								to={s.to}
								sx={{
									borderRadius: 2,
									'&.active': {
										bgcolor: 'primary.main',
										color: 'primary.contrastText',
										'& .MuiListItemText-secondary': { color: 'rgba(255,255,255,0.85)' }
									}
								}}
							>
								<ListItemText primary={s.label} secondary={s.description} primaryTypographyProps={{ fontWeight: 700 }} />
							</ListItemButton>
						))}
					</List>
				</nav>

				<div className="flex-1 min-w-0">
					<Outlet />
				</div>
			</div>
		</VramsPage>
	);
}

/** Default /settings → profile */
export function SettingsIndexRedirect() {
	return <Navigate to={`${BASE}/profile`} replace />;
}
