import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE, deleteSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies, platform }) => {
	const token = cookies.get(SESSION_COOKIE);
	const env = platform?.env as Env | undefined;
	if (token && env?.DB) await deleteSession(env.DB, token);
	cookies.delete(SESSION_COOKIE, { path: '/' });
	throw redirect(303, '/login');
};
