import { User } from '@auth/user';
import UserModel from '@auth/user/models/UserModel';
import { PartialDeep } from 'type-fest';
import apiFetch from '@/utils/apiFetch';

/**
 * Refreshes the access token — not yet implemented in the Flask backend;
 * return an error so the caller falls back to re-authentication.
 */
export async function authRefreshToken(): Promise<Response> {
	return Promise.reject(new Error('Token refresh not supported'));
}

/**
 * Sign in with an existing stored token — calls /api/auth/me to validate
 * and hydrate the user object.
 */
export async function authSignInWithToken(accessToken: string): Promise<Response> {
	return apiFetch('/api/auth/me', {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
}

/**
 * Sign in with email + password against the Flask backend.
 */
export async function authSignIn(credentials: { email: string; password: string }): Promise<Response> {
	return apiFetch('/api/auth/login', {
		method: 'POST',
		body: JSON.stringify(credentials)
	});
}

/**
 * Sign up — not yet implemented in the Flask backend.
 */
export async function authSignUp(data: { displayName: string; email: string; password: string }): Promise<Response> {
	return apiFetch('/api/mock/auth/sign-up', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

/**
 * Get user by id
 */
export async function authGetDbUser(userId: string): Promise<Response> {
	return apiFetch(`/api/mock/auth/user/${userId}`);
}

/**
 * Get user by email
 */
export async function authGetDbUserByEmail(email: string): Promise<Response> {
	return apiFetch(`/api/mock/auth/user-by-email/${email}`);
}

/**
 * Update current user profile / password (Flask JWT).
 */
export function authUpdateDbUser(user: PartialDeep<User>) {
	const body: Record<string, unknown> = {};
	const u = user as Partial<User> & { current_password?: string; new_password?: string };
	if (u.displayName !== undefined) body.name = u.displayName;
	if (u.department !== undefined) body.department = u.department;
	if (u.phone !== undefined) body.phone = u.phone;
	if (u.license_number !== undefined) body.license_number = u.license_number;
	if (u.driver_id_code !== undefined) body.driver_id_code = u.driver_id_code;
	if (u.current_password !== undefined) body.current_password = u.current_password;
	if (u.new_password !== undefined) body.new_password = u.new_password;
	if (u.version !== undefined) body.expected_version = u.version;
	if (Object.keys(body).length === 0) {
		return Promise.reject(new Error('No fields to update'));
	}
	return apiFetch('/api/auth/me', { method: 'PATCH', body: JSON.stringify(body) });
}

/**
 * Create user
 */
export async function authCreateDbUser(user: PartialDeep<User>) {
	return apiFetch('/api/mock/users', {
		method: 'POST',
		body: JSON.stringify(UserModel(user))
	});
}
