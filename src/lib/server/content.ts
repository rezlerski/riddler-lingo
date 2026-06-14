import type { Deck, Word } from '$lib/types';

// ---------------------------------------------------------------------------
// Decks
// ---------------------------------------------------------------------------

export interface DeckWithCount extends Deck {
	word_count: number;
}

export async function listDecks(db: D1Database): Promise<DeckWithCount[]> {
	const res = await db
		.prepare(
			`SELECT d.id, d.name, d.language_from, d.language_to, d.created_at,
			        (SELECT COUNT(*) FROM words w WHERE w.deck_id = d.id) AS word_count
			 FROM decks d ORDER BY d.name`
		)
		.all<DeckWithCount>();
	return res.results;
}

export async function getDeck(db: D1Database, id: number): Promise<Deck | null> {
	return (
		(await db
			.prepare('SELECT id, name, language_from, language_to, created_at FROM decks WHERE id = ?')
			.bind(id)
			.first<Deck>()) ?? null
	);
}

export async function createDeck(
	db: D1Database,
	data: { name: string; language_from: string; language_to: string }
): Promise<number> {
	const row = await db
		.prepare('INSERT INTO decks (name, language_from, language_to) VALUES (?, ?, ?) RETURNING id')
		.bind(data.name, data.language_from, data.language_to)
		.first<{ id: number }>();
	return row!.id;
}

export async function updateDeck(
	db: D1Database,
	id: number,
	data: { name: string; language_from: string; language_to: string }
): Promise<void> {
	await db
		.prepare('UPDATE decks SET name = ?, language_from = ?, language_to = ? WHERE id = ?')
		.bind(data.name, data.language_from, data.language_to, id)
		.run();
}

export async function deleteDeck(db: D1Database, id: number): Promise<void> {
	await db.prepare('DELETE FROM decks WHERE id = ?').bind(id).run();
}

// ---------------------------------------------------------------------------
// Wörter
// ---------------------------------------------------------------------------

export async function listWords(db: D1Database, deckId: number): Promise<Word[]> {
	const res = await db
		.prepare(
			`SELECT id, deck_id, term, translation, hint, example, image_key, audio_key, created_at
			 FROM words WHERE deck_id = ? ORDER BY term`
		)
		.bind(deckId)
		.all<Word>();
	return res.results;
}

export async function getWord(db: D1Database, id: number): Promise<Word | null> {
	return (
		(await db
			.prepare(
				`SELECT id, deck_id, term, translation, hint, example, image_key, audio_key, created_at
				 FROM words WHERE id = ?`
			)
			.bind(id)
			.first<Word>()) ?? null
	);
}

export async function createWord(
	db: D1Database,
	data: {
		deck_id: number;
		term: string;
		translation: string;
		hint: string | null;
		example: string | null;
		created_by: number;
	}
): Promise<number> {
	const row = await db
		.prepare(
			`INSERT INTO words (deck_id, term, translation, hint, example, created_by)
			 VALUES (?, ?, ?, ?, ?, ?) RETURNING id`
		)
		.bind(data.deck_id, data.term, data.translation, data.hint, data.example, data.created_by)
		.first<{ id: number }>();
	return row!.id;
}

export async function updateWord(
	db: D1Database,
	id: number,
	data: { term: string; translation: string; hint: string | null; example: string | null }
): Promise<void> {
	await db
		.prepare('UPDATE words SET term = ?, translation = ?, hint = ?, example = ? WHERE id = ?')
		.bind(data.term, data.translation, data.hint, data.example, id)
		.run();
}

export async function deleteWord(db: D1Database, id: number): Promise<void> {
	await db.prepare('DELETE FROM words WHERE id = ?').bind(id).run();
}

export async function setWordImage(db: D1Database, id: number, key: string | null): Promise<void> {
	await db.prepare('UPDATE words SET image_key = ? WHERE id = ?').bind(key, id).run();
}

export async function setWordAudio(db: D1Database, id: number, key: string | null): Promise<void> {
	await db.prepare('UPDATE words SET audio_key = ? WHERE id = ?').bind(key, id).run();
}
