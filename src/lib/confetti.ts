// Leichtgewichtiges Konfetti ohne Bibliothek (DOM + CSS-Keyframe `rl-confetti`).

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7', '#ec4899'];

export function confetti(count = 20): void {
	if (typeof document === 'undefined') return;
	const root = document.createElement('div');
	root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
	for (let i = 0; i < count; i++) {
		const p = document.createElement('div');
		const size = 7 + Math.random() * 8;
		const left = Math.random() * 100;
		const delay = Math.random() * 0.3;
		const dur = 1.1 + Math.random() * 1.1;
		p.style.cssText =
			`position:absolute;top:-16px;left:${left}%;width:${size}px;height:${size}px;` +
			`background:${COLORS[i % COLORS.length]};border-radius:2px;opacity:0.95;` +
			`animation:rl-confetti ${dur}s ${delay}s ease-in forwards;`;
		root.appendChild(p);
	}
	document.body.appendChild(root);
	setTimeout(() => root.remove(), 2600);
}
