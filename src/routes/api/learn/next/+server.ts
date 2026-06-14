import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEnv } from '$lib/server/db';
import { requireUser } from '$lib/server/auth';
import { pickNextTask } from '$lib/server/learn';

export const GET: RequestHandler = async ({ url, platform, locals }) => {
	const user = requireUser(locals);
	const env = getEnv(platform);

	const deckId = Number(url.searchParams.get('deckId'));
	if (!Number.isFinite(deckId)) throw error(400, 'deckId fehlt');

	return json(await pickNextTask(env.DB, user.id, deckId));
};
