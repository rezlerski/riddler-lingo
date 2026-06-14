import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEnv } from '$lib/server/db';
import { requireAdmin } from '$lib/server/auth';
import { getWord, setWordImage } from '$lib/server/content';

const ALLOWED: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/gif': 'gif'
};
const MAX_BYTES = 2 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, platform, locals, params }) => {
	requireAdmin(locals);
	const env = getEnv(platform);
	const id = Number(params.id);

	const word = await getWord(env.DB, id);
	if (!word) throw error(404, 'Wort nicht gefunden');

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) throw error(400, 'Keine Datei übermittelt');

	const ext = ALLOWED[file.type];
	if (!ext) throw error(400, 'Nur PNG, JPG, WEBP oder GIF erlaubt');
	if (file.size > MAX_BYTES) throw error(400, 'Bild ist zu groß (max. 2 MB)');

	if (word.image_key) await env.BUCKET.delete(word.image_key);

	const key = `words/${id}/image.${ext}`;
	await env.BUCKET.put(key, await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type }
	});
	await setWordImage(env.DB, id, key);

	return json({ image_key: key });
};

export const DELETE: RequestHandler = async ({ platform, locals, params }) => {
	requireAdmin(locals);
	const env = getEnv(platform);
	const id = Number(params.id);

	const word = await getWord(env.DB, id);
	if (word?.image_key) await env.BUCKET.delete(word.image_key);
	await setWordImage(env.DB, id, null);

	return json({ ok: true });
};
