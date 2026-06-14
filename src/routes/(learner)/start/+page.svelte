<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Riddler-Lingo — Meine Wortgruppen</title></svelte:head>

<div class="space-y-6 py-4">
	<div class="text-center">
		<div class="text-5xl">{data.user.avatar ?? '🙂'}</div>
		<h1 class="mt-1 text-2xl font-bold">Hallo {data.user.name}! 👋</h1>
		<p class="text-gray-500">Wähle eine Wortgruppe zum Üben.</p>
	</div>

	{#if data.decks.length === 0}
		<p class="text-center text-gray-500">Es gibt noch keine Wortgruppen.</p>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2">
			{#each data.decks as deck}
				{@const pct = deck.total ? Math.round((deck.learned / deck.total) * 100) : 0}
				<div class="rounded-xl border border-gray-200 bg-white p-5">
					<div class="flex items-baseline justify-between">
						<h2 class="text-lg font-semibold">{deck.name}</h2>
						<span class="text-xs text-gray-400">{deck.language_from} → {deck.language_to}</span>
					</div>
					<div class="mt-3 h-2 overflow-hidden rounded bg-gray-100">
						<div class="h-full bg-green-500" style="width: {pct}%"></div>
					</div>
					<p class="mt-1 text-sm text-gray-500">{deck.learned} / {deck.total} gelernt</p>

					{#if deck.total === 0}
						<p class="mt-3 text-sm text-amber-600">Noch keine Wörter.</p>
					{:else if deck.learned === deck.total}
						<p class="mt-3 text-sm font-medium text-green-600">🎉 Alles gelernt!</p>
						<a href="/lernen/{deck.id}" class="mt-1 inline-block text-sm text-indigo-600 hover:underline">nochmal üben</a>
					{:else}
						<a
							href="/lernen/{deck.id}"
							class="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
						>
							Üben →
						</a>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
