import { error } from '@sveltejs/kit';
import type { Role, SessionUser } from '$lib/types';

/** Stellt sicher, dass ein Admin angemeldet ist (für API-Endpunkte ausserhalb der (admin)-Gruppe). */
export function requireAdmin(locals: App.Locals): SessionUser {
	if (!locals.user || locals.user.role !== 'admin') {
		throw error(403, 'Nur für Admins.');
	}
	return locals.user;
}

/** Stellt sicher, dass irgendein Nutzer angemeldet ist. */
export function requireUser(locals: App.Locals): SessionUser {
	if (!locals.user) {
		throw error(401, 'Bitte anmelden.');
	}
	return locals.user;
}

/** Name des Session-Cookies. */
export const SESSION_COOKIE = 'rl_session';
/** Gültigkeitsdauer einer Session in Sekunden (30 Tage). */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

const PBKDF2_ITERATIONS = 100_000;
const enc = new TextEncoder();

// ---------------------------------------------------------------------------
// Hashing (PBKDF2 über die Web Crypto API — in Workers & Node verfügbar)
// ---------------------------------------------------------------------------

function toB64(bytes: Uint8Array): string {
	let s = '';
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s);
}

function fromB64(s: string): Uint8Array<ArrayBuffer> {
	const bin = atob(s);
	const arr = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
	return arr;
}

async function derive(secret: string, salt: Uint8Array<ArrayBuffer>, iterations: number, lenBits: number): Promise<Uint8Array> {
	const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
		keyMaterial,
		lenBits
	);
	return new Uint8Array(bits);
}

/** Hasht eine PIN bzw. ein Passwort. Format: `pbkdf2$<iter>$<salt_b64>$<hash_b64>`. */
export async function hashSecret(secret: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const hash = await derive(secret, salt, PBKDF2_ITERATIONS, 256);
	return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}

/** Prüft ein Geheimnis gegen einen gespeicherten Hash. */
export async function verifySecret(secret: string, stored: string): Promise<boolean> {
	const parts = stored.split('$');
	if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
	const iterations = Number.parseInt(parts[1], 10);
	if (!Number.isFinite(iterations)) return false;
	const salt = fromB64(parts[2]);
	const expected = fromB64(parts[3]);
	const actual = await derive(secret, salt, iterations, expected.length * 8);
	return timingSafeEqual(actual, expected);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

function generateToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Legt eine Session an und gibt das Token zurück (für das Cookie). */
export async function createSession(db: D1Database, userId: number): Promise<string> {
	const token = generateToken();
	await db
		.prepare(
			"INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', ?))"
		)
		.bind(token, userId, `+${SESSION_TTL_SECONDS} seconds`)
		.run();
	return token;
}

/** Lädt den Nutzer zu einem (gültigen) Session-Token oder null. */
export async function getSessionUser(db: D1Database, token: string): Promise<SessionUser | null> {
	const row = await db
		.prepare(
			`SELECT u.id AS id, u.name AS name, u.role AS role, u.avatar AS avatar
			 FROM sessions s JOIN users u ON u.id = s.user_id
			 WHERE s.id = ? AND s.expires_at > datetime('now')`
		)
		.bind(token)
		.first<{ id: number; name: string; role: Role; avatar: string | null }>();
	return row ?? null;
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
	await db.prepare('DELETE FROM sessions WHERE id = ?').bind(token).run();
}

// ---------------------------------------------------------------------------
// Nutzer-Queries
// ---------------------------------------------------------------------------

export async function adminExists(db: D1Database): Promise<boolean> {
	const row = await db.prepare("SELECT 1 AS x FROM users WHERE role = 'admin' LIMIT 1").first();
	return !!row;
}

export async function listChildren(db: D1Database): Promise<SessionUser[]> {
	const res = await db
		.prepare("SELECT id, name, role, avatar FROM users WHERE role = 'child' ORDER BY name")
		.all<{ id: number; name: string; role: Role; avatar: string | null }>();
	return res.results;
}

interface UserWithSecret extends SessionUser {
	pin_hash: string;
}

export async function findUserForLogin(
	db: D1Database,
	by: { id: number; role: 'child' } | { name: string; role: 'admin' }
): Promise<UserWithSecret | null> {
	const sql =
		'role' in by && by.role === 'admin'
			? "SELECT id, name, role, avatar, pin_hash FROM users WHERE name = ? AND role = 'admin'"
			: "SELECT id, name, role, avatar, pin_hash FROM users WHERE id = ? AND role = 'child'";
	const arg = by.role === 'admin' ? by.name : by.id;
	const row = await db.prepare(sql).bind(arg).first<UserWithSecret>();
	return row ?? null;
}

/** Legt einen Nutzer an und gibt die neue ID zurück. */
export async function createUser(
	db: D1Database,
	data: { name: string; role: Role; avatar: string | null; secret: string }
): Promise<number> {
	const pinHash = await hashSecret(data.secret);
	const row = await db
		.prepare('INSERT INTO users (name, role, avatar, pin_hash) VALUES (?, ?, ?, ?) RETURNING id')
		.bind(data.name, data.role, data.avatar, pinHash)
		.first<{ id: number }>();
	return row!.id;
}

export async function updateSecret(db: D1Database, userId: number, secret: string): Promise<void> {
	const pinHash = await hashSecret(secret);
	await db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').bind(pinHash, userId).run();
}

export async function deleteUser(db: D1Database, userId: number): Promise<void> {
	await db.prepare("DELETE FROM users WHERE id = ? AND role = 'child'").bind(userId).run();
}
