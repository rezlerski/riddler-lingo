import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, getSessionUser } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;

	const token = event.cookies.get(SESSION_COOKIE);
	const env = event.platform?.env as Env | undefined;

	if (token && env?.DB) {
		try {
			event.locals.user = await getSessionUser(env.DB, token);
		} catch {
			event.locals.user = null;
		}
	}

	return resolve(event);
};
