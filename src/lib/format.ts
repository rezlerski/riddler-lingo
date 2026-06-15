/** "2026-06-15 20:30:00" → "15.06.2026" (string-basiert, ohne Zeitzonen-Verschiebung). */
export function formatDate(s: string | null | undefined): string {
	if (!s) return '—';
	const [date] = s.replace('T', ' ').split(' ');
	const [y, m, d] = date.split('-');
	if (!y || !m || !d) return s;
	return `${d}.${m}.${y}`;
}

/** "2026-06-15 20:30:00" → "15.06.2026 20:30". */
export function formatDateTime(s: string | null | undefined): string {
	if (!s) return '—';
	const [date, time = ''] = s.replace('T', ' ').split(' ');
	return `${formatDate(date)}${time ? ' ' + time.slice(0, 5) : ''}`;
}
