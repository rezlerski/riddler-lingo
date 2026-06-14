import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEnv } from '$lib/server/db';
import { requireUser } from '$lib/server/auth';
import { submitAnswer } from '$lib/server/learn';

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	const user = requireUser(locals);
	const env = getEnv(platform);

	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const wordId = Number(body.wordId);
	const answer = String(body.answer ?? '');
	if (!Number.isFinite(wordId)) throw error(400, 'wordId fehlt');

	return json(await submitAnswer(env.DB, user.id, wordId, answer));
};
