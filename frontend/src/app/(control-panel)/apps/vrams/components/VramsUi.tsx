import type { CSSProperties, ReactNode } from 'react';

export function VramsPage({
	children,
	className = ''
}: {
	children: ReactNode;
	className?: string;
}) {
	return <div className={`vrams-page ${className}`.trim()}>{children}</div>;
}

export function VramsHeader({
	title,
	subtitle,
	actions
}: {
	title: string;
	subtitle?: string;
	actions?: ReactNode;
}) {
	return (
		<div className="vrams-header">
			<div>
				<h1 className="vrams-title">{title}</h1>
				{subtitle && <p className="vrams-subtitle">{subtitle}</p>}
			</div>
			{actions ? <div className="vrams-header-actions">{actions}</div> : null}
		</div>
	);
}

export function VramsCard({
	children,
	className = '',
	style
}: {
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
}) {
	return (
		<div className={`vrams-card ${className}`.trim()} style={style}>
			{children}
		</div>
	);
}

export function VramsCardHeader({
	title,
	subtitle,
	right
}: {
	title: string;
	subtitle?: string;
	right?: ReactNode;
}) {
	return (
		<div className="vrams-card-header">
			<div>
				<p className="vrams-card-title">{title}</p>
				{subtitle ? <p className="vrams-card-subtitle">{subtitle}</p> : null}
			</div>
			{right ? <div>{right}</div> : null}
		</div>
	);
}

export function VramsMetricStrip({
	items
}: {
	items: Array<{ label: string; value: string | number; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' }>;
}) {
	const toneClass: Record<string, string> = {
		default: 'vrams-metric-default',
		success: 'vrams-metric-success',
		warning: 'vrams-metric-warning',
		danger: 'vrams-metric-danger',
		info: 'vrams-metric-info'
	};

	return (
		<div className="vrams-metric-strip">
			{items.map((item) => (
				<div key={item.label} className={`vrams-metric-pill ${toneClass[item.tone ?? 'default']}`}>
					<span className="vrams-metric-value">{item.value}</span>
					<span className="vrams-metric-label">{item.label}</span>
				</div>
			))}
		</div>
	);
}

