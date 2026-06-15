<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let editId = $state<number | null>(null);
</script>

<svelte:head><title>Riddler-Lingo — Wortgruppen</title></svelte:head>

<div class="space-y-8">
	<h1 class="text-2xl font-bold">Wortgruppen</h1>

	{#if form?.success}
		<p class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{form.success}</p>
	{/if}

	<!-- Neue Wortgruppe -->
	<section class="rounded-xl border border-gray-200 bg-white p-5">
		<h2 class="mb-3 text-lg font-semibold">Neue Wortgruppe</h2>
		{#if form?.error && form.action === 'create'}
			<p class="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
		{/if}
		<form method="POST" action="?/create" use:enhance class="grid gap-3 sm:grid-cols-4">
			<label class="block space-y-1 sm:col-span-2">
				<span class="text-sm font-medium">Name</span>
				<input name="name" required placeholder="z. B. Englisch – Tiere" class="w-full rounded-lg border border-gray-300 px-3 py-2" />
			</label>
			<label class="block space-y-1">
				<span class="text-sm font-medium">von (Sprache)</span>
				<input name="language_from" required value="de" class="w-full rounded-lg border border-gray-300 px-3 py-2" />
			</label>
			<label class="block space-y-1">
				<span class="text-sm font-medium">nach (Sprache)</span>
				<input name="language_to" required value="en" class="w-full rounded-lg border border-gray-300 px-3 py-2" />
			</label>
			<div class="sm:col-span-4">
				<button class="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">Anlegen</button>
			</div>
		</form>
	</section>

	<!-- Liste -->
	<section class="rounded-xl border border-gray-200 bg-white p-5">
		<h2 class="mb-3 text-lg font-semibold">Vorhandene Wortgruppen ({data.decks.length})</h2>
		{#if data.decks.length === 0}
			<p class="text-gray-500">Noch keine Wortgruppen.</p>
		{:else}
			<ul class="divide-y">
				{#each data.decks as deck}
					<li class="space-y-2 py-3">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<div>
								<a href="/decks/{deck.id}" class="font-medium text-indigo-700 hover:underline">{deck.name}</a>
								<span class="ml-2 text-xs text-gray-400">{deck.language_from} → {deck.language_to} · {deck.word_count} Wörter</span>
							</div>
							<div class="flex items-center gap-2">
								<a href="/decks/{deck.id}" class="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Wörter</a>
								<button type="button" onclick={() => (editId = editId === deck.id ? null : deck.id)} class="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Bearbeiten</button>
								<form method="POST" action="?/delete" use:enhance onsubmit={(e) => { if (!confirm(`„${deck.name}" mit allen Wörtern löschen?`)) e.preventDefault(); }}>
									<input type="hidden" name="id" value={deck.id} />
									<button class="rounded-lg border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50">Löschen</button>
								</form>
							</div>
						</div>

						{#if editId === deck.id}
							<form method="POST" action="?/update" use:enhance={() => async ({ update }) => { await update({ reset: false }); editId = null; }} class="grid gap-2 rounded bg-gray-50 p-3 sm:grid-cols-4">
								<input type="hidden" name="id" value={deck.id} />
								<input name="name" required value={deck.name} class="rounded-lg border border-gray-300 px-3 py-2 sm:col-span-2" />
								<input name="language_from" required value={deck.language_from} class="rounded-lg border border-gray-300 px-3 py-2" />
								<input name="language_to" required value={deck.language_to} class="rounded-lg border border-gray-300 px-3 py-2" />
								<div class="sm:col-span-4">
									<button class="rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-900">Speichern</button>
								</div>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
