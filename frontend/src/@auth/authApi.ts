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
 * Update user
 */
export function authUpdateDbUser(user: PartialDeep<User>) {
	return apiFetch(`/api/mock/auth/user/${user.id}`, {
		method: 'PUT',
		body: JSON.stringify(UserModel(user))
	});
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
