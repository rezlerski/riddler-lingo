import { error } from '@sveltejs/kit';
import type { AnswerResult, LearnTask, NextResult } from '$lib/types';
import { getWord } from '$lib/server/content';

/** Wiederholungs-Intervall (Spaced Repetition) je erreichter Serie eines gelernten Wortes. */
function intervalForStreak(streak: number): string {
	if (streak <= 1) return '+3 days';
	if (streak === 2) return '+7 days';
	if (streak === 3) return '+14 days';
	return '+30 days';
}

/**
 * Vergleichsnormalisierung mit Fehlertoleranz:
 * Groß/Klein, Leerzeichen, Satzzeichen, führende Artikel sowie Umlaut-Schreibweisen
 * (ä→ae, ö→oe, ü→ue, ß→ss) werden vereinheitlicht.
 */
export function normalize(s: string): string {
	return s
		.trim()
		.toLowerCase()
		.replace(/[.,!?;:"'„“”()]/g, '')
		.replace(/\s+/g, ' ')
		.replace(/^(der|die|das|den|dem|des|ein|eine|einen|the|a|an|to)\s+/u, '')
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/ß/g, 'ss')
		.trim();
}

/**
 * Erzeugt die Lücken-Aufgabe: maskiertes Wort (erster Buchstabe + jeder zweite sichtbar)
 * sowie eine gemischte Buchstaben-Auswahl aus den fehlenden Buchstaben + 3 Ablenkern.
 */
function buildGapTask(term: string): { masked: string; letters: string[] } {
	const masked: string[] = [];
	const missing: string[] = [];
	[...term].forEach((c, i) => {
		if (!/[\p{L}]/u.test(c)) {
			masked.push(c); // Leerzeichen, Bindestriche etc. behalten
		} else if (i === 0 || i % 2 === 0) {
			masked.push(c);
		} else {
			masked.push('_');
			missing.push(c.toLowerCase());
		}
	});
	// Ablenker: zufällige, eindeutig FALSCHE Buchstaben (kommen im Wort nicht vor)
	const inWord = new Set([...term.toLowerCase()]);
	const pool = 'abcdefghijklmnopqrstuvwxyz'.split('').filter((c) => !inWord.has(c));
	const distractors: string[] = [];
	for (let n = 0; n < 3 && pool.length > 0; n++) {
		distractors.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
	}
	return { masked: masked.join(''), letters: shuffle([...missing, ...distractors]) };
}

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/**
 * Wählt das nächste zu übende Wort eines Decks: noch nicht gelernte Wörter ODER
 * gelernte Wörter, deren Wiederholung fällig ist (next_review_at <= jetzt).
 * Fällige Wiederholungen werden bevorzugt und als Stufe-4-Aufgabe gestellt.
 */
export async function pickNextTask(db: D1Database, userId: number, deckId: number): Promise<NextResult> {
	const row = await db
		.prepare(
			`SELECT w.id, w.term, w.translation, w.image_key, w.audio_key,
			        COALESCE(p.stage, 1) AS cur_stage, COALESCE(p.learned, 0) AS learned
			 FROM words w
			 LEFT JOIN progress p ON p.word_id = w.id AND p.user_id = ?1
			 WHERE w.deck_id = ?2 AND (
			   COALESCE(p.learned, 0) = 0
			   OR (p.learned = 1 AND p.next_review_at IS NOT NULL AND p.next_review_at <= datetime('now'))
			 )
			 ORDER BY (CASE WHEN COALESCE(p.learned, 0) = 1 THEN 0 ELSE 1 END),
			          COALESCE(p.last_attempt_at, '1970-01-01') ASC, w.id ASC
			 LIMIT 1`
		)
		.bind(userId, deckId)
		.first<{
			id: number;
			term: string;
			translation: string;
			image_key: string | null;
			audio_key: string | null;
			cur_stage: number;
			learned: number;
		}>();

	if (!row) return { done: true };

	// Fällige Wiederholung eines gelernten Wortes -> Stufe 4
	if (row.learned) {
		return {
			wordId: row.id,
			stage: 4,
			review: true,
			imageKey: row.image_key,
			audioKey: row.audio_key,
			translation: row.translation
		};
	}

	const stage = row.cur_stage;
	const base: LearnTask = {
		wordId: row.id,
		stage,
		imageKey: row.image_key,
		audioKey: row.audio_key
	};

	if (stage === 1) {
		return { ...base, term: row.term, translation: row.translation };
	}
	if (stage === 2) {
		const distractors = await db
			.prepare('SELECT term FROM words WHERE deck_id = ? AND id <> ? ORDER BY RANDOM() LIMIT 2')
			.bind(deckId, row.id)
			.all<{ term: string }>();
		const options = shuffle([row.term, ...distractors.results.map((d) => d.term)]);
		return { ...base, translation: row.translation, options };
	}
	if (stage === 3) {
		const { masked, letters } = buildGapTask(row.term);
		return { ...base, masked, letters, translation: row.translation };
	}
	return { ...base, translation: row.translation }; // Stufe 4
}

/**
 * Extra-Übung („Trotzdem weiter üben"): zieht das am ehesten fällige bereits gelernte
 * Wort aus ALLEN Decks vor und stellt es als Stufe-4-Wiederholung. So kann ein Kind
 * auch dann üben, wenn gerade nichts regulär fällig ist — ohne die SR-Logik zu brechen.
 */
export async function pickExtraReview(db: D1Database, userId: number): Promise<NextResult> {
	const row = await db
		.prepare(
			`SELECT w.id, w.translation, w.image_key, w.audio_key
			 FROM progress p JOIN words w ON w.id = p.word_id
			 WHERE p.user_id = ? AND p.learned = 1
			 ORDER BY COALESCE(p.next_review_at, '9999-12-31') ASC,
			          COALESCE(p.last_attempt_at, '1970-01-01') ASC, w.id ASC
			 LIMIT 1`
		)
		.bind(userId)
		.first<{ id: number; translation: string; image_key: string | null; audio_key: string | null }>();

	if (!row) return { done: true };

	return {
		wordId: row.id,
		stage: 4,
		review: true,
		imageKey: row.image_key,
		audioKey: row.audio_key,
		translation: row.translation
	};
}

function check(stage: number, term: string, translation: string, answer: string): { correct: boolean; expected: string } {
	if (stage === 1) {
		return { correct: normalize(answer) === normalize(translation), expected: translation };
	}
	// Stufen 2/3/4 prüfen gegen das Fremdwort
	return { correct: normalize(answer) === normalize(term), expected: term };
}

/** Prüft eine Antwort serverseitig, protokolliert sie und aktualisiert Fortschritt bzw. Wiederholung. */
export async function submitAnswer(
	db: D1Database,
	userId: number,
	wordId: number,
	answer: string
): Promise<AnswerResult> {
	const word = await getWord(db, wordId);
	if (!word) throw error(404, 'Wort nicht gefunden');

	const prog = await db
		.prepare('SELECT stage, learned, streak FROM progress WHERE user_id = ? AND word_id = ?')
		.bind(userId, wordId)
		.first<{ stage: number; learned: number; streak: number }>();

	const isReview = !!prog?.learned;
	const stage = isReview ? 4 : (prog?.stage ?? 1);
	const { correct, expected } = check(stage, word.term, word.translation, answer);

	await db
		.prepare(
			`INSERT INTO attempts (user_id, word_id, stage, is_correct, given_answer, expected_answer)
			 VALUES (?, ?, ?, ?, ?, ?)`
		)
		.bind(userId, wordId, stage, correct ? 1 : 0, answer, expected)
		.run();

	// --- Wiederholung (Spaced Repetition) eines bereits gelernten Wortes ---
	if (isReview) {
		const streak = correct ? (prog?.streak ?? 1) + 1 : 0;
		const interval = correct ? intervalForStreak(streak) : '+1 day';
		await db
			.prepare(
				`UPDATE progress SET streak = ?, next_review_at = datetime('now', ?), last_attempt_at = datetime('now')
				 WHERE user_id = ? AND word_id = ?`
			)
			.bind(streak, interval, userId, wordId)
			.run();
		return { correct, expected, stage: 4, learned: true, review: true };
	}

	// --- Normale Stufen-Progression ---
	let newStage = stage;
	let learned = 0;
	let streak = prog?.streak ?? 0;
	if (correct) {
		if (stage >= 4) {
			learned = 1;
			newStage = 4;
			streak = 1;
		} else {
			newStage = stage + 1;
		}
	} else {
		streak = 0;
	}

	await db
		.prepare(
			`INSERT INTO progress (user_id, word_id, stage, learned, last_attempt_at, streak)
			 VALUES (?, ?, ?, ?, datetime('now'), ?)
			 ON CONFLICT(user_id, word_id) DO UPDATE SET
			   stage = excluded.stage,
			   learned = excluded.learned,
			   last_attempt_at = excluded.last_attempt_at,
			   streak = excluded.streak`
		)
		.bind(userId, wordId, newStage, learned, streak)
		.run();

	if (learned) {
		await db
			.prepare(
				`UPDATE progress SET learned_at = datetime('now'), next_review_at = datetime('now', ?)
				 WHERE user_id = ? AND word_id = ? AND learned_at IS NULL`
			)
			.bind(intervalForStreak(1), userId, wordId)
			.run();
	}

	return { correct, expected, stage: newStage, learned: learned === 1 };
}
