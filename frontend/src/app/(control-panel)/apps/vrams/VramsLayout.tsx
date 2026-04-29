import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import useUser from '@auth/useUser';
import './vramsTheme.css';

const NAV_TABS = [
	{ label: 'Dashboard', to: '/apps/vrams/dashboard', icon: '📊' },
	{ label: 'Requests', to: '/apps/vrams/requests', icon: '📥' },
	{ label: 'Maintenance', to: '/apps/vrams/maintenance', icon: '🛠' },
	{ label: 'Vehicles', to: '/apps/vrams/vehicles', icon: '🚘' },
	{ label: 'Drivers', to: '/apps/vrams/drivers', icon: '🧑‍✈️' },
	{ label: 'Dispatch', to: '/apps/vrams/dispatch', icon: '🚦' },
	{ label: 'Map', to: '/apps/vrams/map', icon: '🗺' },
	{ label: 'Settings', to: '/apps/vrams/settings', icon: '⚙' }
];

function VramsLayout() {
	const navigate = useNavigate();
	const location = useLocation();
	const { data: user, signOut } = useUser();
	const [lastRoute, setLastRoute] = useState<string | null>(null);
	const [globalSearch, setGlobalSearch] = useState('');
	const role = Array.isArray(user?.role) ? user?.role[0] : user?.role;

	const visibleTabs = NAV_TABS.filter((tab) => {
		if (role === 'driver') {
			return ['/apps/vrams/map', '/apps/vrams/dispatch', '/apps/vrams/vehicles'].includes(tab.to);
		}
		if (role === 'requester') {
			return ['/apps/vrams/requests', '/apps/vrams/dashboard', '/apps/vrams/map'].includes(tab.to);
		}
		return true;
	});

	useEffect(() => {
		const saved = window.localStorage.getItem('vrams:last-route');
		if (saved) setLastRoute(saved);
	}, []);

	useEffect(() => {
		if (location.pathname.startsWith('/apps/vrams')) {
			window.localStorage.setItem('vrams:last-route', location.pathname);
			setLastRoute(location.pathname);
		}
	}, [location.pathname]);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const q = params.get('q') ?? '';
		if (location.pathname === '/apps/vrams/search') {
			setGlobalSearch(q);
		}
	}, [location.pathname, location.search]);

	const initials = (user?.displayName ?? 'Admin User')
		.split(' ')
		.map((n: string) => n[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

	const handleLogout = () => {
		signOut();
		navigate('/sign-in');
	};

	const handleGlobalSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const q = globalSearch.trim();
		if (!q) return;
		navigate(`/apps/vrams/search?q=${encodeURIComponent(q)}`);
	};

	return (
		<div className="vrams-app flex h-full min-h-screen bg-[#f3f5fa]">
			<aside className="hidden md:flex w-68 h-screen shrink-0 flex-col border-r border-slate-800 bg-[#0b1328] sticky top-0 overflow-y-auto">
				<div className="px-4 py-4 border-b border-slate-800">
					<div className="flex items-center gap-3">
						<img src="/assets/images/glsc-logo.png" alt="GLSC logo" className="w-8 h-8 rounded-md object-contain bg-white p-0.5" />
						<div className="leading-tight">
							<p className="text-sm font-semibold text-slate-100">GLSC VRAMS</p>
							<p className="text-[11px] text-slate-400">Operations</p>
						</div>
					</div>
				</div>

				<nav className="px-3 py-3 space-y-1">
					{visibleTabs.map((tab) => (
						<NavLink
							key={tab.to}
							to={tab.to}
							className={({ isActive }) =>
								`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-bold transition-colors no-underline ${
									isActive ? 'bg-[#4f46e5] text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'
								}`
							}
						>
							<span>{tab.icon}</span>
							<span>{tab.label}</span>
						</NavLink>
					))}
				</nav>

				{lastRoute && lastRoute !== location.pathname && (
					<div className="px-4 py-3 border-t border-slate-800">
						<button
							type="button"
							onClick={() => navigate(lastRoute)}
							className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
						>
							Continue where you left off
						</button>
					</div>
				)}

				<div className="mt-auto px-4 py-4 border-t border-slate-800">
					<div className="flex items-center gap-3 mb-3">
						<Avatar src={user?.photoURL ?? undefined} sx={{ width: 38, height: 38, bgcolor: '#1a4731', fontSize: 14, fontWeight: 700 }}>
							{initials}
						</Avatar>
						<div className="flex flex-col leading-tight min-w-0">
							<Typography variant="body2" fontWeight={700} lineHeight={1.3} fontSize="0.85rem" className="truncate" sx={{ color: '#f8fafc' }}>
								{user?.displayName ?? 'Admin User'}
							</Typography>
							<Typography variant="caption" lineHeight={1.3} fontSize="0.72rem" sx={{ color: '#94a3b8' }}>
								Fleet Manager
							</Typography>
						</div>
					</div>
					<button
						type="button"
						onClick={handleLogout}
						className="w-full inline-flex justify-center items-center px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm font-bold hover:bg-slate-800"
					>
						Logout
					</button>
				</div>
			</aside>

			<main className="flex-1 min-w-0 flex flex-col">
				<div className="h-14 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-6 flex items-center justify-between">
					<form className="w-full max-w-md" onSubmit={handleGlobalSearchSubmit}>
						<input
							type="text"
							placeholder="Search requests, drivers, vehicles..."
							value={globalSearch}
							onChange={(e) => setGlobalSearch(e.target.value)}
							className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</form>
					<div className="ml-4 text-[11px] text-slate-500 whitespace-nowrap">Fleet Manager · Operations</div>
				</div>
				<Outlet />
			</main>
		</div>
	);
}

export default VramsLayout;
