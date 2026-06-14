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
