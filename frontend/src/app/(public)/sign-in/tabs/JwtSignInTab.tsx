import JwtSignInForm from '@auth/services/jwt/components/JwtSignInForm';

type JwtSignInTabProps = {
	initialEmail?: string;
	initialPassword?: string;
};

function JwtSignInTab({ initialEmail, initialPassword }: JwtSignInTabProps) {
	return (
		<div className="w-full">
			<JwtSignInForm initialEmail={initialEmail} initialPassword={initialPassword} />
		</div>
	);
}

export default JwtSignInTab;
