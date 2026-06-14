export type Role = 'child' | 'admin';

/** Im Cookie/Session referenzierter, angemeldeter Nutzer (ohne Geheimnisse). */
export interface SessionUser {
	id: number;
	name: string;
	role: Role;
	avatar: string | null;
}
