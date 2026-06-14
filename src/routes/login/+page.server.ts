import { fail, redirect, type Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { Actions, PageServerLoad } from './$types';
import { getEnv } from '$lib/server/db';
import {
	adminExists,
	listChildren,
	findUserForLogin,
	verifySecret,
	createSession,
	SESSION_COOKIE,
	SESSION_TTL_SECONDS
} from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (locals.user) throw redirect(303, locals.user.role === 'admin' ? '/decks' : '/start');

	const env = platform?.env as Env | undefined;
	if (!env?.DB) return { children: [] };
	if (!(await adminExists(env.DB))) throw redirect(303, '/setup');

	const children = await listChildren(env.DB);
	return { children: children.map((c) => ({ id: c.id, name: c.name, avatar: c.avatar })) };
};

function setSessionCookie(cookies: Cookies, token: string) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: SESSION_TTL_SECONDS
	});
}

export const actions: Actions = {
	child: async ({ request, platform, cookies }) => {
		const env = getEnv(platform);
		const data = await request.formData();
		const userId = Number(data.get('userId'));
		const pin = String(data.get('pin') ?? '');

		if (!Number.isFinite(userId) || userId <= 0) {
			return fail(400, { mode: 'child', error: 'Bitte ein Kind auswählen.' });
		}
		if (!/^\d{4}$/.test(pin)) {
			return fail(400, { mode: 'child', userId, error: 'Die PIN besteht aus 4 Ziffern.' });
		}

		const user = await findUserForLogin(env.DB, { id: userId, role: 'child' });
		if (!user || !(await verifySecret(pin, user.pin_hash))) {
			return fail(400, { mode: 'child', userId, error: 'Falsche PIN.' });
		}

		setSessionCookie(cookies, await createSession(env.DB, user.id));
		throw redirect(303, '/start');
	},

	admin: async ({ request, platform, cookies }) => {
		const env = getEnv(platform);
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const password = String(data.get('password') ?? '');

		if (!name || !password) {
			return fail(400, { mode: 'admin', name, error: 'Name und Passwort angeben.' });
		}

		const user = await findUserForLogin(env.DB, { name, role: 'admin' });
		if (!user || !(await verifySecret(password, user.pin_hash))) {
			return fail(400, { mode: 'admin', name, error: 'Name oder Passwort falsch.' });
		}

		setSessionCookie(cookies, await createSession(env.DB, user.id));
		throw redirect(303, '/decks');
	}
};
