import { error } from '@sveltejs/kit';

/**
 * Liefert die typisierten Cloudflare-Bindings aus dem Platform-Objekt.
 *
 * Hinweis: `@sveltejs/adapter-cloudflare` typisiert `platform.env` bewusst als
 * `unknown`. Wir casten daher auf das von `wrangler types` generierte `Env`
 * (siehe worker-configuration.d.ts), das die echten Bindings (DB/AI/BUCKET) kennt.
 */
export function getEnv(platform: App.Platform | undefined): Env {
	const env = platform?.env as Env | undefined;
	if (!env) {
		throw error(500, 'Cloudflare-Bindings nicht verfügbar — läuft die App über Wrangler/Cloudflare?');
	}
	return env;
}

/** Holt die D1-Datenbank aus den Cloudflare-Bindings. */
export function getDb(platform: App.Platform | undefined): D1Database {
	return getEnv(platform).DB;
}
