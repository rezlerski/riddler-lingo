import type { PageServerLoad } from './$types';
import { getEnv } from '$lib/server/db';
import { listChildren } from '$lib/server/auth';
import { listDecks } from '$lib/server/content';
import { wordStats, deckSummary, type WordStatRow, type DeckSummary } from '$lib/server/stats';

export const load: PageServerLoad = async ({ platform, url }) => {
	const env = getEnv(platform);
	const children = await listChildren(env.DB);
	const decks = await listDecks(env.DB);

	const childId = Number(url.searchParams.get('childId')) || children[0]?.id || 0;
	const deckId = Number(url.searchParams.get('deckId')) || decks[0]?.id || 0;

	let rows: WordStatRow[] = [];
	let summary: DeckSummary | null = null;
	if (childId && deckId) {
		rows = await wordStats(env.DB, childId, deckId);
		summary = await deckSummary(env.DB, childId, deckId);
	}

	return {
		children: children.map((c) => ({ id: c.id, name: c.name, avatar: c.avatar })),
		decks: decks.map((d) => ({ id: d.id, name: d.name })),
		childId,
		deckId,
		rows,
		summary
	};
};
