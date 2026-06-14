import type { PageServerLoad } from './$types';
import { getEnv } from '$lib/server/db';
import { requireUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const user = requireUser(locals);
	const env = getEnv(platform);

	const res = await env.DB.prepare(
		`SELECT d.id, d.name, d.language_from, d.language_to,
		   (SELECT COUNT(*) FROM words w WHERE w.deck_id = d.id) AS total,
		   (SELECT COUNT(*) FROM words w
		      JOIN progress p ON p.word_id = w.id AND p.user_id = ?
		    WHERE w.deck_id = d.id AND p.learned = 1) AS learned
		 FROM decks d ORDER BY d.name`
	)
		.bind(user.id)
		.all<{
			id: number;
			name: string;
			language_from: string;
			language_to: string;
			total: number;
			learned: number;
		}>();

	return { decks: res.results };
};
