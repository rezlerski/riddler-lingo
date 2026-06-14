<script lang="ts">
	import { onMount } from 'svelte';
	import type { AnswerResult, LearnTask, NextResult } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const stageNames: Record<number, string> = {
		1: 'Übersetzung',
		2: 'Auswahl',
		3: 'Lücken füllen',
		4: 'Wort schreiben'
	};

	let task = $state<LearnTask | null>(null);
	let finished = $state(false);
	let loading = $state(true);
	let submitting = $state(false);
	let answer = $state('');
	let revealed = $state(false); // Stufe 1: Lernkarte -> Frage
	let feedback = $state<AnswerResult | null>(null);
	let solved = $state(0);

	function imgSrc(key: string | null) {
		return key ? data.imageBaseUrl + key : '';
	}

	async function loadNext() {
		loading = true;
		feedback = null;
		answer = '';
		revealed = false;
		const r = await fetch(`/api/learn/next?deckId=${data.deck.id}`);
		const res = (await r.json()) as NextResult;
		if ('done' in res && res.done) {
			finished = true;
			task = null;
		} else {
			task = res as LearnTask;
			finished = false;
		}
		loading = false;
	}

	async function submit(given: string) {
		if (!task || submitting) return;
		submitting = true;
		const r = await fetch('/api/learn/answer', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ wordId: task.wordId, answer: given })
		});
		submitting = false;
		if (r.ok) {
			feedback = (await r.json()) as AnswerResult;
			if (feedback.correct) solved += 1;
		} else {
			alert('Antwort konnte nicht gespeichert werden.');
		}
	}

	onMount(loadNext);
</script>

<svelte:head><title>Riddler-Lingo — {data.deck.name}</title></svelte:head>

<div class="mx-auto max-w-md space-y-6 py-4">
	<div class="flex items-center justify-between">
		<a href="/start" class="text-sm text-indigo-600 hover:underline">← Wortgruppen</a>
		<span class="text-sm text-gray-400">richtig: {solved}</span>
	</div>
	<h1 class="text-center text-xl font-bold">{data.deck.name}</h1>

	{#if loading}
		<p class="py-10 text-center text-gray-400">Lädt …</p>
	{:else if finished}
		<div class="space-y-3 rounded-xl border border-green-200 bg-green-50 p-8 text-center">
			<div class="text-5xl">🎉</div>
			<p class="text-lg font-semibold text-green-700">Super! Alles in dieser Gruppe gelernt.</p>
			<a href="/start" class="inline-block rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">Zurück</a>
		</div>
	{:else if feedback}
		<div class="space-y-4 rounded-xl border p-6 text-center {feedback.correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
			<div class="text-4xl">{feedback.correct ? '✅' : '❌'}</div>
			<p class="font-semibold {feedback.correct ? 'text-green-700' : 'text-red-700'}">
				{feedback.correct ? 'Richtig!' : 'Leider falsch.'}
				{#if feedback.learned}<span class="block text-sm">⭐ Dieses Wort ist jetzt gelernt!</span>{/if}
			</p>
			{#if !feedback.correct}
				<p class="text-sm text-gray-600">Richtig wäre: <strong>{feedback.expected}</strong></p>
			{/if}
			<button onclick={loadNext} class="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700">Weiter →</button>
		</div>
	{:else if task}
		<div class="rounded-xl border border-gray-200 bg-white p-6">
			<p class="mb-4 text-center text-xs font-medium uppercase tracking-wide text-gray-400">
				Stufe {task.stage}/4 · {stageNames[task.stage]}
			</p>

			{#if task.imageKey}
				<img src={imgSrc(task.imageKey)} alt="" class="mx-auto mb-4 h-32 w-32 rounded-lg object-cover" />
			{/if}

			{#if task.stage === 1}
				{#if !revealed}
					<!-- Lernkarte -->
					<div class="space-y-2 text-center">
						<div class="text-3xl font-bold">{task.term}</div>
						<div class="text-xl text-gray-600">= {task.translation}</div>
						<button onclick={() => (revealed = true)} class="mt-4 rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700">Verstanden →</button>
					</div>
				{:else}
					<form onsubmit={(e) => { e.preventDefault(); submit(answer); }} class="space-y-4 text-center">
						<p class="text-lg">Was bedeutet <strong>{task.term}</strong>?</p>
						<!-- svelte-ignore a11y_autofocus -->
						<input bind:value={answer} autofocus class="w-full rounded border border-gray-300 px-3 py-2 text-center text-lg" placeholder="Bedeutung …" />
						<button disabled={submitting} class="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">Prüfen</button>
					</form>
				{/if}
			{:else if task.stage === 2}
				<div class="space-y-4 text-center">
					<p class="text-lg">Welches Wort heißt <strong>{task.translation}</strong>?</p>
					<div class="grid gap-2">
						{#each task.options ?? [] as opt}
							<button onclick={() => submit(opt)} disabled={submitting} class="rounded-lg border border-gray-300 px-4 py-3 text-lg hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50">{opt}</button>
						{/each}
					</div>
				</div>
			{:else if task.stage === 3}
				<form onsubmit={(e) => { e.preventDefault(); submit(answer); }} class="space-y-4 text-center">
					<p class="text-sm text-gray-500">Fülle die Lücken (bedeutet: {task.translation})</p>
					<div class="text-3xl font-bold tracking-[0.3em]">{task.masked}</div>
					<!-- svelte-ignore a11y_autofocus -->
					<input bind:value={answer} autofocus class="w-full rounded border border-gray-300 px-3 py-2 text-center text-lg" placeholder="ganzes Wort …" />
					<button disabled={submitting} class="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">Prüfen</button>
				</form>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); submit(answer); }} class="space-y-4 text-center">
					<p class="text-lg">Schreibe das Wort für <strong>{task.translation}</strong></p>
					{#if task.audioKey}
						<audio controls src={imgSrc(task.audioKey)} class="mx-auto h-8"></audio>
					{/if}
					<!-- svelte-ignore a11y_autofocus -->
					<input bind:value={answer} autofocus class="w-full rounded border border-gray-300 px-3 py-2 text-center text-lg" placeholder="Wort …" />
					<button disabled={submitting} class="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">Prüfen</button>
				</form>
			{/if}
		</div>
	{/if}
</div>
