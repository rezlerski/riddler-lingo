import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getEnv } from '$lib/server/db';
import { requireAdmin } from '$lib/server/auth';
import { getDeck, listWords, createWord, updateWord, deleteWord } from '$lib/server/content';

export const load: PageServerLoad = async ({ platform, params }) => {
	const env = getEnv(platform);
	const id = Number(params.id);
	const deck = await getDeck(env.DB, id);
	if (!deck) throw error(404, 'Wortgruppe nicht gefunden');

	return {
		deck,
		words: await listWords(env.DB, id),
		imageBaseUrl: env.PUBLIC_IMAGE_BASE_URL
	};
};

function parseWord(data: FormData) {
	return {
		term: String(data.get('term') ?? '').trim(),
		translation: String(data.get('translation') ?? '').trim(),
		hint: String(data.get('hint') ?? '').trim() || null,
		example: String(data.get('example') ?? '').trim() || null
	};
}

export const actions: Actions = {
	createWord: async ({ request, platform, locals, params }) => {
		const admin = requireAdmin(locals);
		const env = getEnv(platform);
		const deckId = Number(params.id);
		const w = parseWord(await request.formData());
		if (!w.term || !w.translation) {
			return fail(400, { action: 'createWord', ...w, error: 'Wort und Übersetzung sind erforderlich.' });
		}
		await createWord(env.DB, { deck_id: deckId, ...w, created_by: admin.id });
		return { success: 'Wort angelegt.' };
	},

	updateWord: async ({ request, platform }) => {
		const env = getEnv(platform);
		const data = await request.formData();
		const id = Number(data.get('id'));
		const w = parseWord(data);
		if (!Number.isFinite(id)) return fail(400, { action: 'updateWord', error: 'Ungültiges Wort.' });
		if (!w.term || !w.translation) {
			return fail(400, { action: 'updateWord', id, ...w, error: 'Wort und Übersetzung sind erforderlich.' });
		}
		await updateWord(env.DB, id, w);
		return { success: 'Wort aktualisiert.' };
	},

	deleteWord: async ({ request, platform }) => {
		const env = getEnv(platform);
		const id = Number((await request.formData()).get('id'));
		if (!Number.isFinite(id)) return fail(400, { action: 'deleteWord', error: 'Ungültiges Wort.' });
		await deleteWord(env.DB, id);
		return { success: 'Wort gelöscht.' };
	}
};
