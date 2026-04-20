import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import JwtLoginTab from './tabs/JwtSignInTab';

/**
 * VRAMS Sign-in page — redesigned with fleet branding.
 */
function SignInPage() {
	return (
		<div className="flex min-w-0 flex-1 flex-col md:flex-row h-full">

			{/* ── Left panel: form ─────────────────────────────────────────── */}
			<div className="flex flex-col items-center justify-center w-full md:w-5/12 px-8 py-16 bg-white">
				<div className="w-full max-w-sm">

					{/* Logo + wordmark */}
					<div className="flex items-center gap-12 mb-32">
						<img
							src="/assets/images/glsc-logo.png"
							alt="GLSC logo"
							style={{ height: 48, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
						/>
						<div>
							<Typography variant="h6" fontWeight={800} lineHeight={1} letterSpacing={-0.5}>
								VRAMS
							</Typography>
							<Typography variant="caption" color="text.secondary" letterSpacing={0.3}>
								Vehicle Request &amp; Asset Management
							</Typography>
						</div>
					</div>

					{/* Heading */}
					<Typography variant="h4" fontWeight={800} lineHeight={1.2} mb={1}>
						Welcome back
					</Typography>
					<Typography variant="body2" color="text.secondary" mb={4}>
						Sign in to your fleet management account.
					</Typography>

					{/* Demo credential hint */}
					<Box
						className="rounded-xl px-16 py-12 mb-24 flex items-start gap-10"
						sx={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
					>
						<span style={{ fontSize: 18, lineHeight: 1 }}>🔑</span>
						<div>
							<Typography variant="caption" fontWeight={700} color="success.dark" display="block" mb={2}>
								Demo credentials
							</Typography>
							<Typography variant="caption" color="text.secondary" display="block">
								<b>Email:</b> admin@vrams.org
							</Typography>
							<Typography variant="caption" color="text.secondary" display="block">
								<b>Password:</b> Password123!
							</Typography>
						</div>
					</Box>

					{/* Form */}
					<JwtLoginTab />

					{/* Footer */}
					<Typography variant="caption" color="text.disabled" className="mt-24 block text-center">
						Access is restricted to authorised personnel only.
					</Typography>
				</div>
			</div>

			{/* ── Right panel: branding ─────────────────────────────────────── */}
			<Box
				className="relative hidden md:flex flex-col items-center justify-center flex-1 overflow-hidden p-32"
				sx={{
					background: 'linear-gradient(145deg, #0f2f0f 0%, #1a4d1a 40%, #0d3b2e 100%)',
					color: 'white'
				}}
			>
				{/* Logo top-left */}
				<div className="absolute top-24 left-24 z-20 flex items-center gap-10">
					<img
						src="/assets/images/glsc-logo.png"
						alt="GLSC logo"
						style={{ height: 36, width: 'auto', objectFit: 'contain' }}
					/>
				</div>

				{/* Decorative rings */}
				<svg className="pointer-events-none absolute inset-0 w-full h-full opacity-10" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
					<circle cx="650" cy="80"  r="300" fill="none" stroke="#f5d800" strokeWidth="60" />
					<circle cx="120" cy="520" r="220" fill="none" stroke="#f5d800" strokeWidth="40" />
					<circle cx="400" cy="300" r="180" fill="none" stroke="white"   strokeWidth="1"  />
				</svg>

				{/* Dot grid top-right */}
				<svg className="absolute top-0 right-0 opacity-10" width="200" height="200" viewBox="0 0 200 200">
					<defs>
						<pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
							<rect x="0" y="0" width="3" height="3" fill="white" rx="1" />
						</pattern>
					</defs>
					<rect width="200" height="200" fill="url(#dots)" />
				</svg>

				{/* Fleet vehicle illustration */}
				<div className="relative z-10 flex flex-col items-center mb-32">
					<svg width="240" height="120" viewBox="0 0 240 120" fill="none" className="drop-shadow-2xl mb-8">
						{/* Body */}
						<rect x="20" y="50" width="200" height="52" rx="8" fill="#2d6a2d" />
						{/* Cab roof */}
						<path d="M50 50 L80 20 L180 20 L210 50Z" fill="#3a7a3a" />
						{/* Windows */}
						<rect x="85" y="25" width="45" height="22" rx="3" fill="#a8d5f0" opacity="0.8" />
						<rect x="137" y="25" width="45" height="22" rx="3" fill="#a8d5f0" opacity="0.8" />
						{/* Wheels */}
						<circle cx="65"  cy="102" r="16" fill="#1a1a1a" />
						<circle cx="65"  cy="102" r="8"  fill="#555" />
						<circle cx="175" cy="102" r="16" fill="#1a1a1a" />
						<circle cx="175" cy="102" r="8"  fill="#555" />
						{/* Logo badge placeholder */}
						<rect x="22" y="57" width="32" height="22" rx="3" fill="rgba(255,255,255,0.15)" />
						{/* Headlights */}
						<rect x="210" y="58" width="10" height="8" rx="2" fill="#fef08a" />
						<rect x="210" y="70" width="10" height="6" rx="2" fill="#fef08a" opacity="0.6" />
					</svg>

					{/* Stats row */}
					<div className="flex gap-12">
						{[
							{ label: 'Vehicles', value: '60+' },
							{ label: 'Trips / month', value: '400+' },
							{ label: 'Uptime', value: '99.9%' }
						].map((s) => (
							<div key={s.label} className="text-center px-12 py-8 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
								<Typography variant="h6" fontWeight={800} style={{ color: '#f5d800' }}>{s.value}</Typography>
								<Typography variant="caption" style={{ color: 'rgba(255,255,255,0.6)' }}>{s.label}</Typography>
							</div>
						))}
					</div>
				</div>

				{/* Copy */}
				<div className="relative z-10 text-center max-w-sm">
					<Typography variant="h4" fontWeight={800} lineHeight={1.2} mb={2} style={{ color: 'white' }}>
						Fleet operations,<br />fully in control.
					</Typography>
					<Typography variant="body2" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
						Manage vehicle requests, track compliance, coordinate dispatches and monitor your entire fleet — all from one place.
					</Typography>
				</div>

				{/* Feature pills */}
				<div className="relative z-10 flex flex-wrap justify-center gap-8 mt-24">
					{['Request Management', 'Fleet Tracking', 'Dispatch Control', 'Maintenance Logs', 'Compliance Alerts'].map((f) => (
						<Chip
							key={f}
							label={f}
							size="small"
							sx={{
								background: 'rgba(255,255,255,0.1)',
								color: 'rgba(255,255,255,0.75)',
								border: '1px solid rgba(255,255,255,0.15)',
								fontSize: 11
							}}
						/>
					))}
				</div>
			</Box>
		</div>
	);
}

export default SignInPage;
