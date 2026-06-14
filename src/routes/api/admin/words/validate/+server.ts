import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEnv } from '$lib/server/db';
import { requireAdmin } from '$lib/server/auth';
import { validateWord } from '$lib/server/ai';

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	requireAdmin(locals);
	const env = getEnv(platform);

	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const term = String(body.term ?? '').trim();
	const translation = String(body.translation ?? '').trim();
	if (!term || !translation) throw error(400, 'term und translation erforderlich');

	try {
		const verdict = await validateWord(env.AI, {
			term,
			translation,
			langFrom: String(body.langFrom ?? 'de'),
			langTo: String(body.langTo ?? 'en')
		});
		return json(verdict);
	} catch {
		throw error(502, 'KI-Prüfung derzeit nicht erreichbar.');
	}
};
