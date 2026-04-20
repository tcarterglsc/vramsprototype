import { Outlet, NavLink } from 'react-router';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import useUser from '@auth/useUser';

const NAV_TABS = [
	{ label: 'Dashboard', to: '/apps/vrams/dashboard' },
	{ label: 'Requests', to: '/apps/vrams/requests' },
	{ label: 'Maintenance', to: '/apps/vrams/maintenance' },
	{ label: 'Vehicles', to: '/apps/vrams/vehicles' },
	{ label: 'Dispatch', to: '/apps/vrams/dispatch' },
	{ label: '🗺 Map', to: '/apps/vrams/map' }
];

function VramsLayout() {
	const { data: user } = useUser();
	const initials = (user?.displayName ?? 'Admin User')
		.split(' ')
		.map((n: string) => n[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

	return (
		<div className="flex flex-col h-full min-h-screen bg-gray-100">
			{/* ── Top Nav ─────────────────────────────────────────── */}
		<header className="flex items-center h-16 px-8 bg-white border-b border-gray-200 sticky top-0 z-50 gap-6">
			{/* Logo */}
			<img
				src="/assets/images/glsc-logo.png"
				alt="GLSC"
				style={{ height: 40, width: 'auto', objectFit: 'contain' }}
			/>

			{/* Separator */}
			<div className="h-8 w-px bg-gray-200" />

			{/* Nav tabs */}
			<nav className="flex items-center gap-1">
				{NAV_TABS.map((tab) => (
					<NavLink
						key={tab.to}
						to={tab.to}
						className={({ isActive }) =>
							`px-5 py-2 rounded-lg text-sm font-semibold transition-colors no-underline ${
								isActive
									? 'bg-yellow-400 text-gray-900'
									: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
							}`
						}
					>
						{tab.label}
					</NavLink>
				))}
			</nav>

			{/* Right: bell + user */}
			<div className="ml-auto flex items-center gap-4">
				<button
					type="button"
					className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={1.5}
						stroke="currentColor"
						className="w-5 h-5"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
						/>
					</svg>
				</button>

				<div className="flex items-center gap-3">
					<Avatar
						src={user?.photoURL ?? undefined}
						sx={{ width: 38, height: 38, bgcolor: '#1a4731', fontSize: 14, fontWeight: 700 }}
					>
						{initials}
					</Avatar>
					<div className="hidden sm:flex flex-col leading-tight">
						<Typography
							variant="body2"
							fontWeight={700}
							lineHeight={1.3}
							fontSize="0.9rem"
						>
							{user?.displayName ?? 'Admin User'}
						</Typography>
						<Typography
							variant="caption"
							color="text.secondary"
							lineHeight={1.3}
							fontSize="0.75rem"
						>
							Fleet Manager
						</Typography>
					</div>
				</div>
			</div>
		</header>

			{/* ── Page content ────────────────────────────────────── */}
			<main className="flex-1">
				<Outlet />
			</main>
		</div>
	);
}

export default VramsLayout;
