<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const s = $derived(data.summary);
	const accuracy = $derived(s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) : null);

	const badges = $derived([
		{ icon: '🌱', label: 'Erste Schritte', earned: s.learned >= 1 },
		{ icon: '⭐', label: '5 gelernt', earned: s.learned >= 5 },
		{ icon: '🏆', label: '10 gelernt', earned: s.learned >= 10 },
		{ icon: '🔥', label: 'Serie 5', earned: s.longestStreak >= 5 },
		{ icon: '🎯', label: 'Treffsicher', earned: s.attempts >= 10 && accuracy !== null && accuracy >= 80 }
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
				<div class="flex w-24 flex-col items-center gap-1 rounded-lg border p-3 text-center {b.earned ? 'border-amber-300 bg-amber-50' : 'border-gray-200 opacity-40'}">
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
