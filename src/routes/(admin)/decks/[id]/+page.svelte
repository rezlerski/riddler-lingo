<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { WordVerdict } from '$lib/types';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Neues Wort
	let term = $state('');
	let translation = $state('');
	let hint = $state('');
	let example = $state('');

	// KI-Prüfung
	let verdict = $state<WordVerdict | null>(null);
	let checking = $state(false);

	let editId = $state<number | null>(null);
	let busy = $state<Record<string, boolean>>({});

	async function checkWord() {
		if (!term.trim() || !translation.trim()) return;
		checking = true;
		verdict = null;
		try {
			const r = await fetch('/api/admin/words/validate', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					term,
					translation,
					langFrom: data.deck.language_from,
					langTo: data.deck.language_to
				})
			});
			if (r.ok) verdict = (await r.json()) as WordVerdict;
			else alert('KI-Prüfung fehlgeschlagen (im lokalen Dev ist evtl. keine Cloudflare-Anmeldung aktiv).');
		} finally {
			checking = false;
		}
	}

	function applySuggestion() {
		if (verdict?.suggestion) {
			term = verdict.suggestion.term;
			translation = verdict.suggestion.translation;
			verdict = null;
		}
	}

	async function api(url: string, method: 'POST' | 'DELETE', body?: FormData) {
		const r = await fetch(url, { method, body });
		if (r.ok) {
			await invalidateAll();
		} else {
			const msg = ((await r.json().catch(() => ({}))) as { message?: string }).message;
			alert(msg ?? 'Aktion fehlgeschlagen.');
		}
	}

	async function uploadImage(wordId: number, input: HTMLInputElement) {
		const file = input.files?.[0];
		if (!file) return;
		busy[`img-${wordId}`] = true;
		const fd = new FormData();
		fd.append('file', file);
		await api(`/api/admin/words/${wordId}/image`, 'POST', fd);
		busy[`img-${wordId}`] = false;
		input.value = '';
	}

	async function genAudio(wordId: number) {
		busy[`aud-${wordId}`] = true;
		await api(`/api/admin/words/${wordId}/audio`, 'POST');
		busy[`aud-${wordId}`] = false;
	}
</script>

<svelte:head><title>Riddler-Lingo — {data.deck.name}</title></svelte:head>

<div class="space-y-8">
	<div>
		<a href="/decks" class="text-sm text-indigo-600 hover:underline">← Wortgruppen</a>
		<h1 class="mt-1 text-2xl font-bold">{data.deck.name}</h1>
		<p class="text-sm text-gray-400">{data.deck.language_from} → {data.deck.language_to}</p>
	</div>

	{#if form?.success}
		<p class="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{form.success}</p>
	{/if}

	<!-- Neues Wort -->
	<section class="rounded-xl border border-gray-200 bg-white p-5">
		<h2 class="mb-3 text-lg font-semibold">Neues Wort</h2>
		{#if form?.error && form.action === 'createWord'}
			<p class="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
		{/if}
		<form
			method="POST"
			action="?/createWord"
			use:enhance={() =>
				async ({ result, update }) => {
					await update({ reset: false });
					if (result.type === 'success') {
						term = '';
						translation = '';
						hint = '';
						example = '';
						verdict = null;
					}
				}}
			class="space-y-3"
		>
			<div class="grid gap-3 sm:grid-cols-2">
				<label class="block space-y-1">
					<span class="text-sm font-medium">Wort ({data.deck.language_to})</span>
					<input name="term" bind:value={term} required class="w-full rounded border border-gray-300 px-3 py-2" />
				</label>
				<label class="block space-y-1">
					<span class="text-sm font-medium">Übersetzung ({data.deck.language_from})</span>
					<input name="translation" bind:value={translation} required class="w-full rounded border border-gray-300 px-3 py-2" />
				</label>
				<label class="block space-y-1">
					<span class="text-sm font-medium">Eselsbrücke (optional)</span>
					<input name="hint" bind:value={hint} class="w-full rounded border border-gray-300 px-3 py-2" />
				</label>
				<label class="block space-y-1">
					<span class="text-sm font-medium">Beispielsatz (optional)</span>
					<input name="example" bind:value={example} class="w-full rounded border border-gray-300 px-3 py-2" />
				</label>
			</div>

			{#if verdict}
				<div class="rounded-lg border p-3 text-sm {verdict.ok ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}">
					<p class="font-medium">
						{verdict.ok ? '✅ Sieht gut aus' : '⚠️ Bitte prüfen'}
						<span class="text-gray-400">(Sicherheit {Math.round(verdict.confidence * 100)}%)</span>
					</p>
					{#if verdict.issues.length}
						<ul class="ml-4 list-disc">
							{#each verdict.issues as issue}<li>{issue}</li>{/each}
						</ul>
					{/if}
					{#if verdict.suggestion}
						<p class="mt-1">
							Vorschlag: <strong>{verdict.suggestion.term}</strong> = {verdict.suggestion.translation}
							<button type="button" onclick={applySuggestion} class="ml-2 rounded border px-2 py-0.5 text-xs hover:bg-white">übernehmen</button>
						</p>
					{/if}
				</div>
			{/if}

			<div class="flex items-center gap-2">
				<button class="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">Wort anlegen</button>
				<button type="button" onclick={checkWord} disabled={checking} class="rounded-lg border px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-50">
					{checking ? 'KI prüft …' : '🤖 KI prüfen'}
				</button>
			</div>
		</form>
	</section>

	<!-- Wörter-Liste -->
	<section class="rounded-xl border border-gray-200 bg-white p-5">
		<h2 class="mb-3 text-lg font-semibold">Wörter ({data.words.length})</h2>
		{#if data.words.length === 0}
			<p class="text-gray-500">Noch keine Wörter in dieser Gruppe.</p>
		{:else}
			<ul class="divide-y">
				{#each data.words as word}
					<li class="space-y-2 py-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="flex items-start gap-3">
								{#if word.image_key}
									<img src={data.imageBaseUrl + word.image_key} alt={word.term} class="h-14 w-14 rounded object-cover" />
								{:else}
									<div class="flex h-14 w-14 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">kein Bild</div>
								{/if}
								<div>
									<div class="font-medium">{word.term} <span class="text-gray-400">→ {word.translation}</span></div>
									{#if word.hint}<div class="text-xs text-gray-500">💡 {word.hint}</div>{/if}
									{#if word.example}<div class="text-xs text-gray-500">„{word.example}"</div>{/if}
									{#if word.audio_key}
										<audio controls src={data.imageBaseUrl + word.audio_key} class="mt-1 h-8"></audio>
									{/if}
								</div>
							</div>
							<div class="flex flex-wrap items-center gap-2">
								<label class="cursor-pointer rounded border px-2 py-1 text-sm hover:bg-gray-50">
									{busy[`img-${word.id}`] ? '…' : 'Bild'}
									<input type="file" accept="image/*" class="hidden" onchange={(e) => uploadImage(word.id, e.currentTarget)} />
								</label>
								{#if word.image_key}
									<button type="button" onclick={() => api(`/api/admin/words/${word.id}/image`, 'DELETE')} class="rounded border px-2 py-1 text-sm hover:bg-gray-50">Bild ✕</button>
								{/if}
								<button type="button" onclick={() => genAudio(word.id)} disabled={busy[`aud-${word.id}`]} class="rounded border px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-50">
									{busy[`aud-${word.id}`] ? '…' : word.audio_key ? '🔊 neu' : '🔊 Audio'}
								</button>
								{#if word.audio_key}
									<button type="button" onclick={() => api(`/api/admin/words/${word.id}/audio`, 'DELETE')} class="rounded border px-2 py-1 text-sm hover:bg-gray-50">Audio ✕</button>
								{/if}
								<button type="button" onclick={() => (editId = editId === word.id ? null : word.id)} class="rounded border px-2 py-1 text-sm hover:bg-gray-50">Bearbeiten</button>
								<form method="POST" action="?/deleteWord" use:enhance onsubmit={(e) => { if (!confirm(`„${word.term}" löschen?`)) e.preventDefault(); }}>
									<input type="hidden" name="id" value={word.id} />
									<button class="rounded border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50">Löschen</button>
								</form>
							</div>
						</div>

						{#if editId === word.id}
							<form method="POST" action="?/updateWord" use:enhance={() => async ({ update }) => { await update({ reset: false }); editId = null; }} class="grid gap-2 rounded bg-gray-50 p-3 sm:grid-cols-2">
								<input type="hidden" name="id" value={word.id} />
								<input name="term" required value={word.term} class="rounded border border-gray-300 px-3 py-2" />
								<input name="translation" required value={word.translation} class="rounded border border-gray-300 px-3 py-2" />
								<input name="hint" value={word.hint ?? ''} placeholder="Eselsbrücke" class="rounded border border-gray-300 px-3 py-2" />
								<input name="example" value={word.example ?? ''} placeholder="Beispielsatz" class="rounded border border-gray-300 px-3 py-2" />
								<div class="sm:col-span-2">
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
