<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const s = $derived(data.summary);
	const accuracy = $derived(s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) : null);

	const decksWithWords = $derived(s.perDeck.filter((d) => d.total > 0));
	const completedCount = $derived(decksWithWords.filter((d) => d.learned === d.total).length);
	const allDecksDone = $derived(decksWithWords.length > 0 && completedCount === decksWithWords.length);

	// `count` = wie oft das Abzeichen verdient wurde (zeigt ein "×N"-Bubble ab 2).
	type Badge = { icon: string; label: string; earned: boolean; count?: number };
	const badges: Badge[] = $derived([
		{ icon: '🌱', label: 'Erste Schritte', earned: s.learned >= 1 },
		{ icon: '⭐', label: '5 gelernt', earned: s.learned >= 5 },
		{ icon: '🏆', label: '10 gelernt', earned: s.learned >= 10 },
		{ icon: '📚', label: '25 gelernt', earned: s.learned >= 25 },
		{ icon: '🦉', label: '50 gelernt', earned: s.learned >= 50 },
		{ icon: '👑', label: '100 gelernt', earned: s.learned >= 100 },
		{ icon: '✅', label: 'Gruppe fertig', earned: completedCount >= 1, count: completedCount },
		{ icon: '🌟', label: 'Alle Gruppen', earned: allDecksDone },
		{ icon: '🔥', label: 'Serie 5', earned: s.longestStreak >= 5 },
		{ icon: '⚡', label: 'Serie 10', earned: s.longestStreak >= 10 },
		{ icon: '🚀', label: 'Serie 20', earned: s.longestStreak >= 20 },
		{ icon: '🎯', label: 'Treffsicher', earned: s.attempts >= 10 && accuracy !== null && accuracy >= 80 },
		{ icon: '🎓', label: 'Fehlerfrei', earned: s.flawless >= 1, count: s.flawless },
		{ icon: '💪', label: '100 Antworten', earned: s.attempts >= 100 },
		{ icon: '🏋️', label: '500 Antworten', earned: s.attempts >= 500 }
	]);
</script>

<svelte:head><title>Riddler-Lingo — Meine Erfolge</title></svelte:head>

<div class="space-y-6 py-4">
	<div class="flex items-center justify-between">
		<a href="/start" class="text-sm text-indigo-600 hover:underline">← Wortgruppen</a>
	</div>
	<h1 class="text-2xl font-bold">Meine Erfolge</h1>

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div class="rounded-xl border border-gray-200 bg-white p-4 text-center">
			<div class="text-3xl font-bold text-green-600">{s.learned}</div>
			<div class="text-xs text-gray-500">von {s.totalWords} gelernt</div>
		</div>
		<div class="rounded-xl border border-gray-200 bg-white p-4 text-center">
			<div class="text-3xl font-bold">{accuracy === null ? '—' : accuracy + '%'}</div>
			<div class="text-xs text-gray-500">Trefferquote</div>
		</div>
		<div class="rounded-xl border border-gray-200 bg-white p-4 text-center">
			<div class="text-3xl font-bold text-orange-500">🔥 {s.currentStreak}</div>
			<div class="text-xs text-gray-500">aktuelle Serie</div>
		</div>
		<div class="rounded-xl border border-gray-200 bg-white p-4 text-center">
			<div class="text-3xl font-bold">{s.longestStreak}</div>
			<div class="text-xs text-gray-500">längste Serie</div>
		</div>
	</div>

	<section class="rounded-xl border border-gray-200 bg-white p-5">
		<h2 class="mb-3 text-lg font-semibold">Abzeichen</h2>
		<div class="flex flex-wrap gap-3">
			{#each badges as b}
				<div class="relative flex w-24 flex-col items-center gap-1 rounded-lg border p-3 text-center {b.earned ? 'border-amber-300 bg-amber-50' : 'border-gray-200 opacity-40'}">
					{#if b.earned && b.count && b.count >= 2}
						<span class="absolute -right-1.5 -top-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm">×{b.count}</span>
					{/if}
					<span class="text-3xl">{b.icon}</span>
					<span class="text-xs font-medium">{b.label}</span>
				</div>
			{/each}
		</div>
	</section>

	{#if s.perDeck.length}
		<section class="rounded-xl border border-gray-200 bg-white p-5">
			<h2 class="mb-3 text-lg font-semibold">Pro Wortgruppe</h2>
			<ul class="space-y-3">
				{#each s.perDeck as d}
					{@const pct = d.total ? Math.round((d.learned / d.total) * 100) : 0}
					<li>
						<div class="flex justify-between text-sm">
							<span>{d.name}</span>
							<span class="text-gray-500">{d.learned}/{d.total}</span>
						</div>
						<div class="mt-1 h-2 overflow-hidden rounded bg-gray-100">
							<div class="h-full bg-green-500" style="width: {pct}%"></div>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
