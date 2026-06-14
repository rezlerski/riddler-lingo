import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEnv } from '$lib/server/db';
import { requireAdmin } from '$lib/server/auth';
import { getWord, getDeck, setWordAudio } from '$lib/server/content';
import { generateSpeech } from '$lib/server/ai';

export const POST: RequestHandler = async ({ platform, locals, params }) => {
	requireAdmin(locals);
	const env = getEnv(platform);
	const id = Number(params.id);

	const word = await getWord(env.DB, id);
	if (!word) throw error(404, 'Wort nicht gefunden');

	const deck = await getDeck(env.DB, word.deck_id);
	const lang = deck?.language_to ?? 'en';

	let bytes: Uint8Array<ArrayBuffer>;
	try {
		bytes = await generateSpeech(env.AI, { text: word.term, lang });
	} catch {
		throw error(502, 'Aussprache konnte nicht erzeugt werden (TTS nicht erreichbar).');
	}
	const key = `audio/${id}.mp3`;
	await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: 'audio/mpeg' } });
	await setWordAudio(env.DB, id, key);

	return json({ audio_key: key });
};

export const DELETE: RequestHandler = async ({ platform, locals, params }) => {
	requireAdmin(locals);
	const env = getEnv(platform);
	const id = Number(params.id);

	const word = await getWord(env.DB, id);
	if (word?.audio_key) await env.BUCKET.delete(word.audio_key);
	await setWordAudio(env.DB, id, null);

	return json({ ok: true });
};
