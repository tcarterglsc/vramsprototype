import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
	useGetVramsNotificationsQuery,
	useGetVramsUnreadNotificationCountQuery,
	useMarkAllVramsNotificationsReadMutation,
	useMarkVramsNotificationReadMutation
} from '../VramsApi';
import type { VramsNotificationItem } from '../types';
import { useVramsNotificationPrefs } from '../hooks/useVramsNotificationPrefs';

export default function VramsNotificationsBell() {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const panelRef = useRef<HTMLDivElement>(null);
	const { pollMs } = useVramsNotificationPrefs();
	const pollActive = pollMs > 0;

	const { data: countData } = useGetVramsUnreadNotificationCountQuery(undefined, {
		pollingInterval: pollActive ? pollMs : 0,
		skip: false
	});
	const { data: page, isFetching } = useGetVramsNotificationsQuery(
		{ page: 1, per_page: 20 },
		{ pollingInterval: open && pollActive ? pollMs : 0, skip: !open }
	);
	const [markRead] = useMarkVramsNotificationReadMutation();
	const [markAllRead, { isLoading: markingAll }] = useMarkAllVramsNotificationsReadMutation();

	const unread = countData?.count ?? 0;
	const items: VramsNotificationItem[] = page?.items ?? [];

	useEffect(() => {
		if (!open) return;
		function onDocMouseDown(e: MouseEvent) {
			if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener('mousedown', onDocMouseDown);
		return () => document.removeEventListener('mousedown', onDocMouseDown);
	}, [open]);

	async function onItemClick(n: VramsNotificationItem) {
		if (!n.read_at) {
			try {
				await markRead(n.id).unwrap();
			} catch {
				/* ignore */
			}
		}
		setOpen(false);
		if (n.link) {
			navigate(n.link);
		}
	}

	return (
		<div className="relative shrink-0" ref={panelRef}>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg leading-none text-slate-700 hover:bg-slate-50"
				aria-label="Notifications"
			>
				🔔
				{unread > 0 ? (
					<span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
						{unread > 9 ? '9+' : unread}
					</span>
				) : null}
			</button>

			{open ? (
				<div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-slate-200 bg-white shadow-lg">
					<div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
						<p className="text-sm font-bold text-slate-900">Notifications</p>
						<button
							type="button"
							disabled={unread === 0 || markingAll}
							onClick={() => markAllRead()}
							className="text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-40 disabled:no-underline"
						>
							Mark all read
						</button>
					</div>
					<div className="max-h-80 overflow-y-auto">
						{isFetching && items.length === 0 ? (
							<p className="px-3 py-6 text-center text-sm text-slate-500">Loading…</p>
						) : items.length === 0 ? (
							<p className="px-3 py-6 text-center text-sm text-slate-500">No notifications yet.</p>
						) : (
							items.map((n) => (
								<button
									key={n.id}
									type="button"
									onClick={() => onItemClick(n)}
									className={`w-full border-b border-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${
										n.read_at ? 'opacity-75' : 'bg-indigo-50/40'
									}`}
								>
									<p className="text-xs font-bold uppercase tracking-wide text-slate-500">{n.category}</p>
									<p className="text-sm font-semibold text-slate-900">{n.title}</p>
									<p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{n.body}</p>
									<p className="text-[10px] text-slate-400 mt-1">
										{new Date(n.created_at).toLocaleString()}
									</p>
								</button>
							))
						)}
					</div>
				</div>
			) : null}
		</div>
	);
}
