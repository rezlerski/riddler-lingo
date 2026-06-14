import type { PageServerLoad } from './$types';
import { getEnv } from '$lib/server/db';
import { requireUser } from '$lib/server/auth';
import { childSummary } from '$lib/server/stats';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const user = requireUser(locals);
	const env = getEnv(platform);
	return { summary: await childSummary(env.DB, user.id) };
};
