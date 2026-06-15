// Kleine Sound-Effekte über die Web Audio API — keine Audiodateien nötig.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!ctx) {
		const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!Ctor) return null;
		ctx = new Ctor();
	}
	return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType, delay = 0, gain = 0.14): void {
	const a = audio();
	if (!a) return;
	const osc = a.createOscillator();
	const env = a.createGain();
	osc.type = type;
	osc.frequency.value = freq;
	osc.connect(env);
	env.connect(a.destination);
	const t = a.currentTime + delay;
	env.gain.setValueAtTime(gain, t);
	env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
	osc.start(t);
	osc.stop(t + duration);
}

export function isMuted(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem('rl_muted') === '1';
}

export function setMuted(muted: boolean): void {
	if (typeof localStorage !== 'undefined') localStorage.setItem('rl_muted', muted ? '1' : '0');
}

export function playCorrect(): void {
	if (isMuted()) return;
	tone(660, 0.12, 'sine', 0);
	tone(880, 0.16, 'sine', 0.1);
}

export function playWrong(): void {
	if (isMuted()) return;
	tone(196, 0.28, 'sawtooth', 0, 0.1);
}

export function playWin(): void {
	if (isMuted()) return;
	[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', i * 0.12));
}
