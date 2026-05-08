import type { SnackbarKey, VariantType } from 'notistack';

/** Best-effort RTK Query / Fetch error message for snackbars. */
export function vramsErrorMessage(error: unknown, fallback: string): string {
	if (error && typeof error === 'object') {
		const e = error as { data?: unknown; message?: string };
		const data = e.data;
		if (typeof data === 'object' && data !== null && 'message' in data) {
			const m = (data as { message?: unknown }).message;
			if (typeof m === 'string' && m.trim()) return m;
		}
		if (typeof data === 'string' && data.trim()) return data;
		if (typeof e.message === 'string' && e.message !== 'Failed to fetch') return e.message;
	}
	return fallback;
}

export type EnqueueFn = (message: string, options?: { variant?: VariantType }) => SnackbarKey;

export function notifyRtk(enqueueSnackbar: EnqueueFn, error: unknown, fallback: string, variant: VariantType = 'error') {
	enqueueSnackbar(vramsErrorMessage(error, fallback), { variant });
}
