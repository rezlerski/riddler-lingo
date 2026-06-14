import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { adminExists } from '$lib/server/auth';

/** Einstieg: leitet je nach Anmeldestatus weiter. */
export const load: PageServerLoad = async ({ locals, platform }) => {
	if (locals.user) {
		throw redirect(303, locals.user.role === 'admin' ? '/learners' : '/start');
	}

	const env = platform?.env as Env | undefined;
	if (env?.DB && !(await adminExists(env.DB))) {
		throw redirect(303, '/setup');
	}

	throw redirect(303, '/login');
};
