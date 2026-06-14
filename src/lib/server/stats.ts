// Auswertungen für die Erfolgsübersicht (Admin) und die Erfolgsseite (Kind).

export interface WordStatRow {
	id: number;
	term: string;
	translation: string;
	stage: number;
	learned: number;
	last_attempt_at: string | null;
	last_mistake: string | null;
}

/** Pro Wort eines Decks: aktueller Stand + zuletzt versucht + letzter Fehler (für ein Kind). */
export async function wordStats(db: D1Database, userId: number, deckId: number): Promise<WordStatRow[]> {
	const res = await db
		.prepare(
			`SELECT w.id, w.term, w.translation,
			        COALESCE(p.stage, 1) AS stage,
			        COALESCE(p.learned, 0) AS learned,
			        p.last_attempt_at AS last_attempt_at,
			        (SELECT a.given_answer || ' → statt „' || a.expected_answer || '" (Stufe ' || a.stage || ')'
			           FROM attempts a
			          WHERE a.word_id = w.id AND a.user_id = ?1 AND a.is_correct = 0
			          ORDER BY a.created_at DESC, a.id DESC LIMIT 1) AS last_mistake
			 FROM words w
			 LEFT JOIN progress p ON p.word_id = w.id AND p.user_id = ?1
			 WHERE w.deck_id = ?2
			 ORDER BY w.term`
		)
		.bind(userId, deckId)
		.all<WordStatRow>();
	return res.results;
}

export interface DeckSummary {
	total: number;
	learned: number;
	attempts: number;
	correct: number;
}

export async function deckSummary(db: D1Database, userId: number, deckId: number): Promise<DeckSummary> {
	const total = await db.prepare('SELECT COUNT(*) AS c FROM words WHERE deck_id = ?').bind(deckId).first<{ c: number }>();
	const learned = await db
		.prepare(
			`SELECT COUNT(*) AS c FROM progress p JOIN words w ON w.id = p.word_id
			 WHERE p.user_id = ? AND w.deck_id = ? AND p.learned = 1`
		)
		.bind(userId, deckId)
		.first<{ c: number }>();
	const att = await db
		.prepare(
			`SELECT COUNT(*) AS c, COALESCE(SUM(is_correct), 0) AS ok
			 FROM attempts a JOIN words w ON w.id = a.word_id
			 WHERE a.user_id = ? AND w.deck_id = ?`
		)
		.bind(userId, deckId)
		.first<{ c: number; ok: number }>();
	return { total: total?.c ?? 0, learned: learned?.c ?? 0, attempts: att?.c ?? 0, correct: att?.ok ?? 0 };
}

export interface ChildSummary {
	totalWords: number;
	learned: number;
	attempts: number;
	correct: number;
	currentStreak: number;
	longestStreak: number;
	perDeck: { name: string; total: number; learned: number }[];
}

/** Gesamtüberblick für die Erfolgsseite eines Kindes. */
export async function childSummary(db: D1Database, userId: number): Promise<ChildSummary> {
	const tw = await db.prepare('SELECT COUNT(*) AS c FROM words').first<{ c: number }>();
	const lr = await db.prepare('SELECT COUNT(*) AS c FROM progress WHERE user_id = ? AND learned = 1').bind(userId).first<{ c: number }>();
	const at = await db
		.prepare('SELECT COUNT(*) AS c, COALESCE(SUM(is_correct), 0) AS ok FROM attempts WHERE user_id = ?')
		.bind(userId)
		.first<{ c: number; ok: number }>();

	const seq = await db.prepare('SELECT is_correct FROM attempts WHERE user_id = ? ORDER BY id').bind(userId).all<{ is_correct: number }>();
	let longest = 0;
	let run = 0;
	for (const r of seq.results) {
		if (r.is_correct) {
			run += 1;
			if (run > longest) longest = run;
		} else {
			run = 0;
		}
	}
	let current = 0;
	for (let i = seq.results.length - 1; i >= 0; i--) {
		if (seq.results[i].is_correct) current += 1;
		else break;
	}

	const pd = await db
		.prepare(
			`SELECT d.name AS name,
			        (SELECT COUNT(*) FROM words w WHERE w.deck_id = d.id) AS total,
			        (SELECT COUNT(*) FROM words w JOIN progress p ON p.word_id = w.id AND p.user_id = ?
			           WHERE w.deck_id = d.id AND p.learned = 1) AS learned
			 FROM decks d ORDER BY d.name`
		)
		.bind(userId)
		.all<{ name: string; total: number; learned: number }>();

	return {
		totalWords: tw?.c ?? 0,
		learned: lr?.c ?? 0,
		attempts: at?.c ?? 0,
		correct: at?.ok ?? 0,
		currentStreak: current,
		longestStreak: longest,
		perDeck: pd.results
	};
}
