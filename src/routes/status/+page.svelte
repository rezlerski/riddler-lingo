<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const expectedTables = ['users', 'decks', 'words', 'progress', 'attempts', 'sessions'];
	const haveAllTables = $derived(expectedTables.every((t) => data.tables.includes(t)));

	const bindingRows = $derived([
		{ name: 'DB (D1)', ok: data.bindings.DB },
		{ name: 'AI (Workers AI)', ok: data.bindings.AI },
		{ name: 'BUCKET (R2)', ok: data.bindings.BUCKET }
	]);
</script>

<svelte:head><title>Riddler-Lingo — Status</title></svelte:head>

<main class="mx-auto max-w-2xl space-y-8 p-6">
	<header class="space-y-1">
		<h1 class="flex items-center gap-2 text-3xl font-bold tracking-tight"><img src="/logo.png" alt="" class="h-8 w-8" /> Riddler-Lingo</h1>
		<p class="text-gray-500">System-Status</p>
	</header>

	<section class="rounded-xl border border-gray-200 p-5">
		<h2 class="mb-3 text-lg font-semibold">Cloudflare-Bindings</h2>
		<ul class="space-y-2">
			{#each bindingRows as b}
				<li class="flex items-center justify-between">
					<span class="font-mono text-sm">{b.name}</span>
					<span class={b.ok ? 'text-green-600' : 'text-red-600'}>
						{b.ok ? '✅ verbunden' : '❌ fehlt'}
					</span>
				</li>
			{/each}
		</ul>
	</section>

	<section class="rounded-xl border border-gray-200 p-5">
		<h2 class="mb-3 text-lg font-semibold">Datenbank-Schema</h2>
		{#if data.dbError}
			<p class="text-red-600">Fehler beim Lesen der DB: {data.dbError}</p>
		{:else if data.tables.length === 0}
			<p class="text-amber-600">
				Keine Tabellen gefunden — Migration noch ausführen:
				<code class="rounded bg-gray-100 px-1">wrangler d1 migrations apply riddler-lingo --local</code>
			</p>
		{:else}
			<p class="mb-2">
				{haveAllTables ? '✅ Alle erwarteten Tabellen vorhanden.' : '⚠️ Es fehlen Tabellen.'}
			</p>
			<ul class="flex flex-wrap gap-2">
				{#each data.tables as t}
					<li class="rounded bg-gray-100 px-2 py-1 font-mono text-xs">{t}</li>
				{/each}
			</ul>
		{/if}
	</section>

	<a href="/" class="inline-block text-sm text-indigo-600 hover:underline">← zur App</a>
</main>
