import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { Actions, PageServerLoad } from './$types';
import { getEnv } from '$lib/server/db';
import {
	adminExists,
	createUser,
	createSession,
	SESSION_COOKIE,
	SESSION_TTL_SECONDS
} from '$lib/server/auth';

export const load: PageServerLoad = async ({ platform }) => {
	const env = platform?.env as Env | undefined;
	if (env?.DB && (await adminExists(env.DB))) throw redirect(303, '/login');
	return {};
};

export const actions: Actions = {
	default: async ({ request, platform, cookies }) => {
		const env = getEnv(platform);
		if (await adminExists(env.DB)) throw redirect(303, '/login');

		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const password = String(data.get('password') ?? '');
		const password2 = String(data.get('password2') ?? '');

		if (name.length < 2) return fail(400, { name, error: 'Bitte einen Namen (min. 2 Zeichen) angeben.' });
		if (password.length < 6) return fail(400, { name, error: 'Passwort braucht mindestens 6 Zeichen.' });
		if (password !== password2) return fail(400, { name, error: 'Die Passwörter stimmen nicht überein.' });

		const id = await createUser(env.DB, { name, role: 'admin', avatar: null, secret: password });
		const token = await createSession(env.DB, id);
		cookies.set(SESSION_COOKIE, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: SESSION_TTL_SECONDS
		});

		throw redirect(303, '/learners');
	}
};
