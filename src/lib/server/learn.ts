import { error } from '@sveltejs/kit';
import type { AnswerResult, LearnTask, NextResult } from '$lib/types';
import { getWord } from '$lib/server/content';

const REVIEW_INTERVAL = '+3 days';

/** Vergleichsnormalisierung: Groß/Klein & überflüssige Leerzeichen egal. */
export function normalize(s: string): string {
	return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Erzeugt eine Lücken-Variante eines Wortes (erster Buchstabe + jeder zweite sichtbar). */
function maskTerm(term: string): string {
	return [...term]
		.map((c, i) => {
			if (!/[\p{L}]/u.test(c)) return c; // Leerzeichen, Bindestriche etc. behalten
			if (i === 0) return c;
			return i % 2 === 0 ? c : '_';
		})
		.join('');
}

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/** Wählt das nächste zu übende Wort eines Decks und baut die stufengerechte Aufgabe. */
export async function pickNextTask(db: D1Database, userId: number, deckId: number): Promise<NextResult> {
	const row = await db
		.prepare(
			`SELECT w.id, w.term, w.translation, w.image_key, w.audio_key, COALESCE(p.stage, 1) AS cur_stage
			 FROM words w
			 LEFT JOIN progress p ON p.word_id = w.id AND p.user_id = ?
			 WHERE w.deck_id = ? AND COALESCE(p.learned, 0) = 0
			 ORDER BY COALESCE(p.last_attempt_at, '1970-01-01') ASC, w.id ASC
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
		}>();

	if (!row) return { done: true };

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
		return { ...base, masked: maskTerm(row.term), translation: row.translation };
	}
	return { ...base, translation: row.translation }; // Stufe 4
}

function check(stage: number, term: string, translation: string, answer: string): { correct: boolean; expected: string } {
	if (stage === 1) {
		return { correct: normalize(answer) === normalize(translation), expected: translation };
	}
	// Stufen 2/3/4 prüfen gegen das Fremdwort
	return { correct: normalize(answer) === normalize(term), expected: term };
}

/** Prüft eine Antwort serverseitig, protokolliert sie und aktualisiert den Fortschritt. */
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

	if (prog?.learned) {
		return { correct: true, expected: word.term, stage: 4, learned: true };
	}

	const stage = prog?.stage ?? 1;
	const { correct, expected } = check(stage, word.term, word.translation, answer);

	await db
		.prepare(
			`INSERT INTO attempts (user_id, word_id, stage, is_correct, given_answer, expected_answer)
			 VALUES (?, ?, ?, ?, ?, ?)`
		)
		.bind(userId, wordId, stage, correct ? 1 : 0, answer, expected)
		.run();

	let newStage = stage;
	let learned = 0;
	let streak = prog?.streak ?? 0;
	if (correct) {
		if (stage >= 4) {
			learned = 1;
			newStage = 4;
			streak = streak + 1;
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
			.bind(REVIEW_INTERVAL, userId, wordId)
			.run();
	}

	return { correct, expected, stage: newStage, learned: learned === 1 };
}
