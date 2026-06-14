<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const accuracy = $derived(
		data.summary && data.summary.attempts > 0
			? Math.round((data.summary.correct / data.summary.attempts) * 100)
			: null
	);

	function fmt(ts: string | null): string {
		return ts ? ts.replace('T', ' ').slice(0, 16) : '—';
	}
</script>

<svelte:head><title>Riddler-Lingo — Erfolge</title></svelte:head>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Erfolge</h1>

	{#if data.children.length === 0 || data.decks.length === 0}
		<p class="text-gray-500">Es braucht mindestens ein Kind und eine Wortgruppe mit Wörtern.</p>
	{:else}
		<form method="GET" class="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
			<label class="space-y-1">
				<span class="text-sm font-medium">Kind</span>
				<select name="childId" onchange={(e) => e.currentTarget.form?.requestSubmit()} class="block rounded border border-gray-300 px-3 py-2">
					{#each data.children as c}
						<option value={c.id} selected={c.id === data.childId}>{c.avatar ?? '🙂'} {c.name}</option>
					{/each}
				</select>
			</label>
			<label class="space-y-1">
				<span class="text-sm font-medium">Wortgruppe</span>
				<select name="deckId" onchange={(e) => e.currentTarget.form?.requestSubmit()} class="block rounded border border-gray-300 px-3 py-2">
					{#each data.decks as d}
						<option value={d.id} selected={d.id === data.deckId}>{d.name}</option>
					{/each}
				</select>
			</label>
			<noscript><button class="rounded bg-gray-800 px-3 py-2 text-sm text-white">Anzeigen</button></noscript>
		</form>

		{#if data.summary}
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<div class="rounded-xl border border-gray-200 bg-white p-4">
					<div class="text-2xl font-bold">{data.summary.learned}/{data.summary.total}</div>
					<div class="text-xs text-gray-500">gelernt</div>
				</div>
				<div class="rounded-xl border border-gray-200 bg-white p-4">
					<div class="text-2xl font-bold">{accuracy === null ? '—' : accuracy + '%'}</div>
					<div class="text-xs text-gray-500">Trefferquote</div>
				</div>
				<div class="rounded-xl border border-gray-200 bg-white p-4">
					<div class="text-2xl font-bold">{data.summary.attempts}</div>
					<div class="text-xs text-gray-500">Versuche</div>
				</div>
				<div class="rounded-xl border border-gray-200 bg-white p-4">
					<div class="text-2xl font-bold">{data.summary.correct}</div>
					<div class="text-xs text-gray-500">richtig</div>
				</div>
			</div>
		{/if}

		<div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
			<table class="w-full text-left text-sm">
				<thead class="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
					<tr>
						<th class="px-4 py-2">Wort</th>
						<th class="px-4 py-2">Stufe</th>
						<th class="px-4 py-2">zuletzt versucht</th>
						<th class="px-4 py-2">letzter Fehler</th>
					</tr>
				</thead>
				<tbody class="divide-y">
					{#each data.rows as r}
						<tr>
							<td class="px-4 py-2">
								<span class="font-medium">{r.term}</span>
								<span class="text-gray-400"> → {r.translation}</span>
							</td>
							<td class="px-4 py-2 whitespace-nowrap">
								{#if r.learned}
									<span class="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">⭐ gelernt</span>
								{:else}
									<span class="text-gray-600">{r.stage}/4</span>
								{/if}
							</td>
							<td class="px-4 py-2 whitespace-nowrap text-gray-500">{fmt(r.last_attempt_at)}</td>
							<td class="px-4 py-2 text-red-600">{r.last_mistake ?? '—'}</td>
						</tr>
					{/each}
					{#if data.rows.length === 0}
						<tr><td colspan="4" class="px-4 py-6 text-center text-gray-400">Keine Wörter in dieser Wortgruppe.</td></tr>
					{/if}
				</tbody>
			</table>
		</div>
	{/if}
</div>
