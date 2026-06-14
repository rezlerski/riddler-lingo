import type { WordVerdict } from '$lib/types';

const VALIDATE_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const TTS_MODEL = '@cf/myshell-ai/melotts';

const VALIDATE_SYSTEM =
	'Du bist ein sorgfältiger Lektor für Vokabellisten. Antworte AUSSCHLIESSLICH mit einem ' +
	'einzigen JSON-Objekt, ohne Erklärtext, ohne Markdown.';

function buildValidatePrompt(i: { term: string; translation: string; langFrom: string; langTo: string }): string {
	return [
		`Sprachpaar: ${i.langFrom} -> ${i.langTo}`,
		`Fremdwort (${i.langTo}): "${i.term}"`,
		`Übersetzung (${i.langFrom}): "${i.translation}"`,
		'',
		'Prüfe: Ist die Übersetzung korrekt? Gibt es Rechtschreibfehler? Gibt es eine',
		'üblichere/bessere Übersetzung?',
		'',
		'Antworte mit genau diesem JSON-Format:',
		'{"ok": boolean, "confidence": number (0..1), "issues": string[], ' +
			'"suggestion": {"term": string, "translation": string} | null}'
	].join('\n');
}

function parseVerdict(text: string): WordVerdict {
	try {
		const match = text.match(/\{[\s\S]*\}/);
		if (!match) throw new Error('kein JSON');
		const o = JSON.parse(match[0]) as Record<string, unknown>;
		const sug = o.suggestion as { term?: unknown; translation?: unknown } | null | undefined;
		return {
			ok: o.ok === true,
			confidence: typeof o.confidence === 'number' ? Math.max(0, Math.min(1, o.confidence)) : 0,
			issues: Array.isArray(o.issues) ? o.issues.map((x) => String(x)) : [],
			suggestion:
				sug && typeof sug === 'object'
					? { term: String(sug.term ?? ''), translation: String(sug.translation ?? '') }
					: null
		};
	} catch {
		return {
			ok: false,
			confidence: 0,
			issues: ['Die KI-Antwort konnte nicht ausgewertet werden — bitte selbst prüfen.'],
			suggestion: null
		};
	}
}

/** Prüft eine Vokabel-Eingabe mit Workers AI und gibt eine strukturierte Bewertung zurück. */
export async function validateWord(
	ai: Ai,
	input: { term: string; translation: string; langFrom: string; langTo: string }
): Promise<WordVerdict> {
	// Modell-IDs sind generisch typisiert -> Aufruf bewusst entkoppelt.
	const run = ai.run as (model: string, inputs: unknown) => Promise<unknown>;
	const res = (await run(VALIDATE_MODEL, {
		messages: [
			{ role: 'system', content: VALIDATE_SYSTEM },
			{ role: 'user', content: buildValidatePrompt(input) }
		]
	})) as { response?: unknown };
	const text = typeof res?.response === 'string' ? res.response : '';
	return parseVerdict(text);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
	const bin = atob(b64);
	const arr = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
	return arr;
}

/** Erzeugt eine Aussprache (MP3) für einen Text via Workers AI (MeloTTS). */
export async function generateSpeech(ai: Ai, input: { text: string; lang: string }): Promise<Uint8Array<ArrayBuffer>> {
	const run = ai.run as (model: string, inputs: unknown) => Promise<unknown>;
	const res = (await run(TTS_MODEL, { prompt: input.text, lang: input.lang })) as { audio?: unknown };
	if (typeof res?.audio !== 'string') {
		throw new Error('Text-to-Speech lieferte kein Audio zurück.');
	}
	return base64ToBytes(res.audio);
}
