import React from 'react';

/** Named colour → hex */
const COLOR_HEX: Record<string, string> = {
	Black:    '#1e293b',
	White:    '#e2e8f0',
	Silver:   '#94a3b8',
	Blue:     '#3b82f6',
	Red:      '#ef4444',
	Graphite: '#4b5563',
	Gold:     '#f59e0b',
	Green:    '#22c55e',
	Orange:   '#f97316',
	Brown:    '#92400e',
	Yellow:   '#eab308',
	Purple:   '#a855f7',
};
const DEFAULT_BODY = '#94a3b8';

/** Resolve color name or hex string → hex */
function resolveColor(color?: string): string {
	if (!color) return DEFAULT_BODY;
	if (color.startsWith('#')) return color;
	return COLOR_HEX[color] ?? DEFAULT_BODY;
}

/** Darken a hex colour for roof / shadow areas */
function darken(hex: string, factor = 0.62): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	const d = (v: number) => Math.max(0, Math.floor(v * factor)).toString(16).padStart(2, '0');
	return `#${d(r)}${d(g)}${d(b)}`;
}

/** Wheel helper – two concentric circles */
function Wheel({ cx, cy, r = 13 }: { cx: number; cy: number; r?: number }) {
	return (
		<>
			<circle cx={cx} cy={cy} r={r}     fill="#1e293b" />
			<circle cx={cx} cy={cy} r={r * 0.5} fill="#475569" />
			{/* hub bolt suggestion */}
			<circle cx={cx} cy={cy} r={r * 0.18} fill="#94a3b8" />
		</>
	);
}

/* ─── Per-type SVG bodies ──────────────────────────────────────────── */

function Sedan({ body, roof }: { body: string; roof: string }) {
	const win = 'rgba(186,230,253,0.55)';
	return (
		<>
			<ellipse cx={100} cy={76} rx={80} ry={5} fill="rgba(0,0,0,0.09)" />
			{/* Main body */}
			<path fill={body} d="M16 64 L16 56 L34 56 L56 40 L144 40 L158 56 L184 56 L184 64 Z" />
			{/* Roof */}
			<path fill={roof} d="M56 40 L67 26 L133 26 L144 40 Z" />
			{/* Front windshield */}
			<path fill={win} d="M58 40 L68 28 L98 28 L98 40 Z" />
			{/* Rear windshield */}
			<path fill={win} d="M102 28 L132 28 L142 40 L102 40 Z" />
			{/* B-pillar */}
			<rect x={98} y={28} width={4} height={14} fill={roof} />
			{/* Side windows */}
			<path fill={win} d="M58 40 L58 55 L96 55 L96 40 Z" />
			<path fill={win} d="M104 40 L104 55 L142 55 L142 40 Z" />
			{/* Door lines */}
			<line x1={97} y1={40} x2={97} y2={64} stroke={roof} strokeWidth={0.9} opacity={0.5} />
			<line x1={143} y1={40} x2={143} y2={64} stroke={roof} strokeWidth={0.9} opacity={0.3} />
			{/* Wheels */}
			<Wheel cx={52} cy={65} r={12} />
			<Wheel cx={148} cy={65} r={12} />
			{/* Lights */}
			<rect x={15} y={56} width={5} height={6} rx={2} fill="#fef08a" />
			<rect x={180} y={56} width={5} height={6} rx={2} fill="#fca5a5" />
		</>
	);
}

function Suv({ body, roof }: { body: string; roof: string }) {
	const win = 'rgba(186,230,253,0.55)';
	return (
		<>
			<ellipse cx={100} cy={77} rx={82} ry={5} fill="rgba(0,0,0,0.09)" />
			{/* Body */}
			<path fill={body} d="M14 65 L14 46 L34 46 L44 36 L156 36 L168 46 L186 46 L186 65 Z" />
			{/* Flat roof */}
			<path fill={roof} d="M44 36 L44 22 L156 22 L156 36 Z" />
			{/* Windows */}
			<rect x={46} y={23} width={32} height={13} rx={2} fill={win} />
			<rect x={81} y={23} width={34} height={13} rx={2} fill={win} />
			<rect x={118} y={23} width={36} height={13} rx={2} fill={win} />
			{/* Pillars */}
			<rect x={79} y={22} width={4} height={15} fill={body} />
			<rect x={116} y={22} width={4} height={15} fill={body} />
			{/* Door lines */}
			<line x1={79} y1={36} x2={79} y2={65} stroke={roof} strokeWidth={0.9} opacity={0.4} />
			<line x1={116} y1={36} x2={116} y2={65} stroke={roof} strokeWidth={0.9} opacity={0.4} />
			{/* Roof rack */}
			<rect x={54} y={20} width={92} height={2.5} rx={1} fill={roof} opacity={0.35} />
			{/* Wheels */}
			<Wheel cx={50} cy={67} r={14} />
			<Wheel cx={150} cy={67} r={14} />
			{/* Lights */}
			<rect x={13} y={54} width={5} height={8} rx={2} fill="#fef08a" />
			<rect x={182} y={54} width={5} height={8} rx={2} fill="#fca5a5" />
		</>
	);
}

function Van({ body, roof }: { body: string; roof: string }) {
	const win = 'rgba(186,230,253,0.55)';
	return (
		<>
			<ellipse cx={100} cy={77} rx={82} ry={5} fill="rgba(0,0,0,0.09)" />
			{/* Body (tall boxy) */}
			<path fill={body} d="M16 66 L16 36 L32 36 L42 20 L180 20 L180 66 Z" />
			{/* Roof strip */}
			<rect x={42} y={14} width={138} height={8} rx={2} fill={roof} />
			{/* Cab windshield */}
			<path fill={win} d="M42 36 L46 20 L84 20 L84 36 Z" />
			{/* Sliding door windows */}
			<rect x={90}  y={22} width={30} height={13} rx={2} fill={win} />
			<rect x={126} y={22} width={48} height={13} rx={2} fill={win} />
			{/* Pillars */}
			<rect x={84}  y={20} width={6} height={16} fill={body} />
			<rect x={122} y={20} width={6} height={16} fill={body} />
			{/* Door lines */}
			<line x1={84}  y1={36} x2={84}  y2={66} stroke={roof} strokeWidth={1.2} opacity={0.4} />
			<line x1={122} y1={36} x2={122} y2={66} stroke={roof} strokeWidth={1.5} opacity={0.5} />
			{/* Rear door handle */}
			<line x1={177} y1={46} x2={177} y2={56} stroke={roof} strokeWidth={2} strokeLinecap="round" />
			{/* Wheels */}
			<Wheel cx={50} cy={68} r={13} />
			<Wheel cx={155} cy={68} r={13} />
			{/* Lights */}
			<rect x={15} y={48} width={5} height={8} rx={2} fill="#fef08a" />
			<rect x={180} y={48} width={5} height={8} rx={2} fill="#fca5a5" />
		</>
	);
}

function Truck({ body, roof }: { body: string; roof: string }) {
	const win = 'rgba(186,230,253,0.55)';
	return (
		<>
			<ellipse cx={105} cy={77} rx={86} ry={5} fill="rgba(0,0,0,0.09)" />
			{/* Cargo box */}
			<rect x={62} y={24} width={122} height={42} rx={2} fill={body} />
			<rect x={62} y={22} width={122} height={4}  rx={1} fill={roof} />
			{/* Cab */}
			<path fill={body} d="M14 66 L14 46 L28 40 L62 40 L62 66 Z" />
			{/* Cab roof */}
			<path fill={roof} d="M28 40 L32 26 L62 26 L62 40 Z" />
			{/* Cab windshield */}
			<path fill={win} d="M34 40 L38 28 L60 28 L60 40 Z" />
			{/* Cargo door (dashed) */}
			<line x1={130} y1={26} x2={130} y2={66} stroke={roof} strokeWidth={1.2} strokeDasharray="4,3" opacity={0.6} />
			{/* Door handle */}
			<rect x={128} y={44} width={4} height={8} rx={2} fill={roof} opacity={0.6} />
			{/* Cab-box gap */}
			<rect x={58} y={38} width={6} height={6} fill={roof} opacity={0.35} />
			{/* Wheels – tandem rear */}
			<Wheel cx={42}  cy={68} r={12} />
			<Wheel cx={148} cy={68} r={12} />
			<Wheel cx={168} cy={68} r={12} />
			{/* Lights */}
			<rect x={13} y={52} width={4} height={7} rx={1} fill="#fef08a" />
		</>
	);
}

function Bus({ body, roof }: { body: string; roof: string }) {
	const win = 'rgba(186,230,253,0.55)';
	return (
		<>
			<ellipse cx={100} cy={77} rx={88} ry={5} fill="rgba(0,0,0,0.09)" />
			{/* Body */}
			<rect x={8} y={26} width={184} height={40} rx={5} fill={body} />
			{/* Roof strip */}
			<rect x={8} y={18} width={184} height={10} rx={3} fill={roof} />
			{/* Destination sign */}
			<rect x={12} y={20} width={60} height={6} rx={1} fill={roof} opacity={0.25} />
			{/* Driver windshield */}
			<rect x={12} y={28} width={22} height={16} rx={2} fill={win} />
			{/* Passenger windows */}
			{[44, 66, 88, 110, 132, 154, 174].map(x => (
				<rect key={x} x={x} y={28} width={16} height={12} rx={2} fill={win} />
			))}
			{/* Entry door */}
			<rect x={40} y={44} width={18} height={22} rx={1} fill={roof} opacity={0.3} />
			<line x1={49} y1={44} x2={49} y2={66} stroke={body} strokeWidth={1} />
			{/* Wheels */}
			<Wheel cx={38}  cy={69} r={12} />
			<Wheel cx={162} cy={69} r={12} />
			{/* Lights */}
			<rect x={8}   y={54} width={6} height={8} rx={2} fill="#fef08a" />
			<rect x={186} y={54} width={6} height={8} rx={2} fill="#fca5a5" />
		</>
	);
}

function Pickup({ body, roof }: { body: string; roof: string }) {
	const win = 'rgba(186,230,253,0.55)';
	return (
		<>
			<ellipse cx={100} cy={77} rx={82} ry={5} fill="rgba(0,0,0,0.09)" />
			{/* Pickup bed */}
			<path fill={body} d="M104 44 L184 44 L184 66 L104 66 Z" />
			{/* Bed inner floor */}
			<line x1={107} y1={60} x2={182} y2={60} stroke={roof} strokeWidth={0.9} opacity={0.3} />
			{/* Tailgate */}
			<rect x={102} y={44} width={4} height={22} rx={1} fill={roof} opacity={0.55} />
			{/* Rear wall */}
			<rect x={182} y={44} width={4} height={22} rx={1} fill={roof} opacity={0.3} />
			{/* Cab body */}
			<path fill={body} d="M14 66 L14 50 L30 42 L102 42 L102 66 Z" />
			{/* Cab roof */}
			<path fill={roof} d="M30 42 L36 26 L100 26 L100 42 Z" />
			{/* Front windshield */}
			<path fill={win} d="M40 42 L46 28 L98 28 L98 42 Z" />
			{/* Side windows */}
			<rect x={40} y={28} width={22} height={13} rx={2} fill={win} />
			<rect x={66} y={28} width={30} height={13} rx={2} fill={win} />
			{/* B-pillar */}
			<rect x={62} y={28} width={4} height={15} fill={roof} />
			{/* Door line */}
			<line x1={62} y1={42} x2={62} y2={66} stroke={roof} strokeWidth={0.9} opacity={0.5} />
			{/* Wheels */}
			<Wheel cx={46}  cy={68} r={14} />
			<Wheel cx={158} cy={68} r={14} />
			{/* Lights */}
			<rect x={13}  y={56} width={5} height={7} rx={2} fill="#fef08a" />
			<rect x={183} y={54} width={4} height={9} rx={2} fill="#fca5a5" />
		</>
	);
}

/* ─── Public component ─────────────────────────────────────────────── */

interface VehicleIllustrationProps {
	/** Vehicle type string – e.g. 'SUV', 'Van', 'Truck', 'Bus', 'Sedan', 'Pickup' */
	vehicleType?: string;
	/** Color name (Black / White / Silver / Blue …) or any hex string */
	color?: string;
	className?: string;
	style?: React.CSSProperties;
}

export default function VehicleIllustration({
	vehicleType = 'Sedan',
	color,
	className = '',
	style,
}: VehicleIllustrationProps) {
	const bodyColor = resolveColor(color);
	const roofColor = darken(bodyColor);
	const props = { body: bodyColor, roof: roofColor };

	const inner = (() => {
		switch (vehicleType) {
			case 'SUV':    return <Suv    {...props} />;
			case 'Van':    return <Van    {...props} />;
			case 'Truck':  return <Truck  {...props} />;
			case 'Bus':    return <Bus    {...props} />;
			case 'Pickup': return <Pickup {...props} />;
			default:       return <Sedan  {...props} />;
		}
	})();

	return (
		<svg
			viewBox="0 0 200 80"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			style={{ display: 'block', ...style }}
			aria-hidden="true"
		>
			{inner}
		</svg>
	);
}
