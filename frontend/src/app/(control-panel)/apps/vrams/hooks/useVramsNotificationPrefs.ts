import { useCallback, useEffect, useState } from 'react';

const POLL_KEY = 'vrams_settings_notify_poll_ms';

export const VRAMS_NOTIFY_PREFS_EVENT = 'vrams-notify-prefs-changed';

const DEFAULT_POLL = 30_000;

function readPollMs(): number {
	if (typeof window === 'undefined') return DEFAULT_POLL;
	const v = Number(localStorage.getItem(POLL_KEY));
	if (v === 0) return 0;
	if (!Number.isFinite(v) || v < 0) return DEFAULT_POLL;
	return v;
}

/** Polling interval for notification bell (0 = disabled). */
export function useVramsNotificationPrefs() {
	const [pollMs, setPollMsState] = useState(readPollMs);

	const setPollMs = useCallback((ms: number) => {
		const next = ms === 0 ? 0 : Math.max(10_000, ms);
		localStorage.setItem(POLL_KEY, String(next));
		setPollMsState(next);
		window.dispatchEvent(new Event(VRAMS_NOTIFY_PREFS_EVENT));
	}, []);

	useEffect(() => {
		function onStorage(e: StorageEvent) {
			if (e.key === POLL_KEY) setPollMsState(readPollMs());
		}
		function onCustom() {
			setPollMsState(readPollMs());
		}
		window.addEventListener('storage', onStorage);
		window.addEventListener(VRAMS_NOTIFY_PREFS_EVENT, onCustom);
		return () => {
			window.removeEventListener('storage', onStorage);
			window.removeEventListener(VRAMS_NOTIFY_PREFS_EVENT, onCustom);
		};
	}, []);

	return { pollMs, setPollMs, defaultPollMs: DEFAULT_POLL };
}
