import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getEnv } from '$lib/server/db';
import { requireUser } from '$lib/server/auth';
import { getDeck } from '$lib/server/content';

export const load: PageServerLoad = async ({ platform, locals, params }) => {
	requireUser(locals);
	const env = getEnv(platform);
	const deck = await getDeck(env.DB, Number(params.deckId));
	if (!deck) throw error(404, 'Wortgruppe nicht gefunden');
	return { deck, imageBaseUrl: env.PUBLIC_IMAGE_BASE_URL };
};
