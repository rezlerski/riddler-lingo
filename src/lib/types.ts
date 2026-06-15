export type Role = 'child' | 'admin';

/** Im Cookie/Session referenzierter, angemeldeter Nutzer (ohne Geheimnisse). */
export interface SessionUser {
	id: number;
	name: string;
	role: Role;
	avatar: string | null;
}

export interface Deck {
	id: number;
	name: string;
	language_from: string;
	language_to: string;
	created_at: string;
}

export interface Word {
	id: number;
	deck_id: number;
	term: string;
	translation: string;
	hint: string | null;
	example: string | null;
	image_key: string | null;
	audio_key: string | null;
	created_at: string;
}

/** Ergebnis der KI-Eingabeprüfung beim Anlegen eines Wortes. */
export interface WordVerdict {
	ok: boolean;
	confidence: number;
	issues: string[];
	suggestion: { term: string; translation: string } | null;
}

/** Eine Übungsaufgabe für die aktuelle Stufe eines Wortes (ohne durchgesickerte Lösung). */
export interface LearnTask {
	done?: false;
	wordId: number;
	stage: number; // 1..4
	imageKey: string | null;
	audioKey: string | null;
	term?: string; // Stufe 1 (Lernkarte)
	translation?: string; // Stufe 1/2/3/4 (Frage bzw. Hinweis)
	options?: string[]; // Stufe 2 (3 Auswahlmöglichkeiten)
	masked?: string; // Stufe 3 (Wort mit Lücken)
	letters?: string[]; // Stufe 3 (antippbare Buchstaben: fehlende + falsche, gemischt)
	review?: boolean; // fällige Wiederholung eines bereits gelernten Wortes
}

export type NextResult = LearnTask | { done: true };

export interface AnswerResult {
	correct: boolean;
	expected: string;
	stage: number; // neue/aktuelle Stufe nach dem Versuch
	learned: boolean;
	review?: boolean; // war eine Wiederholung
}
