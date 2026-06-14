import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getEnv } from '$lib/server/db';
import { listDecks, createDeck, updateDeck, deleteDeck } from '$lib/server/content';

export const load: PageServerLoad = async ({ platform }) => {
	const env = getEnv(platform);
	return { decks: await listDecks(env.DB) };
};

function parseDeck(data: FormData) {
	const name = String(data.get('name') ?? '').trim();
	const language_from = String(data.get('language_from') ?? '').trim().toLowerCase();
	const language_to = String(data.get('language_to') ?? '').trim().toLowerCase();
	return { name, language_from, language_to };
}

export const actions: Actions = {
	create: async ({ request, platform }) => {
		const env = getEnv(platform);
		const d = parseDeck(await request.formData());
		if (!d.name || !d.language_from || !d.language_to) {
			return fail(400, { action: 'create', ...d, error: 'Bitte Name und beide Sprachen angeben.' });
		}
		await createDeck(env.DB, d);
		return { success: 'Wortgruppe angelegt.' };
	},

	update: async ({ request, platform }) => {
		const env = getEnv(platform);
		const data = await request.formData();
		const id = Number(data.get('id'));
		const d = parseDeck(data);
		if (!Number.isFinite(id)) return fail(400, { action: 'update', error: 'Ungültige Wortgruppe.' });
		if (!d.name || !d.language_from || !d.language_to) {
			return fail(400, { action: 'update', id, ...d, error: 'Bitte Name und beide Sprachen angeben.' });
		}
		await updateDeck(env.DB, id, d);
		return { success: 'Wortgruppe aktualisiert.' };
	},

	delete: async ({ request, platform }) => {
		const env = getEnv(platform);
		const id = Number((await request.formData()).get('id'));
		if (!Number.isFinite(id)) return fail(400, { action: 'delete', error: 'Ungültige Wortgruppe.' });
		await deleteDeck(env.DB, id);
		return { success: 'Wortgruppe gelöscht.' };
	}
};
