import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getEnv } from '$lib/server/db';
import { createUser, updateSecret, deleteUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ platform }) => {
	const env = getEnv(platform);
	const res = await env.DB.prepare(
		"SELECT id, name, avatar, created_at FROM users WHERE role='child' ORDER BY name"
	).all<{ id: number; name: string; avatar: string | null; created_at: string }>();
	return { children: res.results };
};

const validPin = (pin: string) => /^\d{4}$/.test(pin);

export const actions: Actions = {
	create: async ({ request, platform }) => {
		const env = getEnv(platform);
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const avatar = String(data.get('avatar') ?? '').trim() || null;
		const pin = String(data.get('pin') ?? '');

		if (name.length < 1) return fail(400, { action: 'create', name, error: 'Bitte einen Namen angeben.' });
		if (!validPin(pin)) return fail(400, { action: 'create', name, error: 'Die PIN muss aus 4 Ziffern bestehen.' });

		await createUser(env.DB, { name, role: 'child', avatar, secret: pin });
		return { success: 'Kind angelegt.' };
	},

	resetPin: async ({ request, platform }) => {
		const env = getEnv(platform);
		const data = await request.formData();
		const id = Number(data.get('id'));
		const pin = String(data.get('pin') ?? '');

		if (!Number.isFinite(id)) return fail(400, { action: 'resetPin', error: 'Ungültiges Kind.' });
		if (!validPin(pin)) return fail(400, { action: 'resetPin', id, error: 'Die PIN muss aus 4 Ziffern bestehen.' });

		await updateSecret(env.DB, id, pin);
		return { success: 'PIN aktualisiert.' };
	},

	delete: async ({ request, platform }) => {
		const env = getEnv(platform);
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isFinite(id)) return fail(400, { action: 'delete', error: 'Ungültiges Kind.' });

		await deleteUser(env.DB, id);
		return { success: 'Kind gelöscht.' };
	}
};
