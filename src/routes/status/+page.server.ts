import type { PageServerLoad } from './$types';

/**
 * Healthcheck: prüft, ob die Cloudflare-Bindings vorhanden sind und listet die
 * in D1 angelegten Tabellen (verifiziert die Migration end-to-end).
 */
export const load: PageServerLoad = async ({ platform }) => {
	// adapter-cloudflare typisiert platform.env als `unknown` -> auf Env casten.
	const env = platform?.env as Env | undefined;

	const bindings = {
		DB: !!env?.DB,
		AI: !!env?.AI,
		BUCKET: !!env?.BUCKET
	};

	let tables: string[] = [];
	let dbError: string | null = null;

	if (env?.DB) {
		try {
			const res = await env.DB.prepare(
				"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name"
			).all<{ name: string }>();
			tables = res.results.map((r) => r.name);
		} catch (e) {
			dbError = e instanceof Error ? e.message : String(e);
		}
	}

	return { bindings, tables, dbError };
};
