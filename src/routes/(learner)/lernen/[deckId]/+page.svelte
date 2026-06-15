<script lang="ts">
	import { onMount } from 'svelte';
	import { scale, fade } from 'svelte/transition';
	import type { AnswerResult, LearnTask, NextResult } from '$lib/types';
	import { playCorrect, playWrong, playWin, isMuted, setMuted } from '$lib/sounds';
	import { confetti } from '$lib/confetti';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const stageNames: Record<number, string> = {
		1: 'Übersetzung',
		2: 'Auswahl',
		3: 'Lücken füllen',
		4: 'Wort schreiben'
	};
	// Akzentfarbe je Stufe (statische Klassen, damit Tailwind sie behält)
	const stageChip: Record<number, string> = {
		1: 'bg-emerald-100 text-emerald-700',
		2: 'bg-sky-100 text-sky-700',
		3: 'bg-violet-100 text-violet-700',
		4: 'bg-orange-100 text-orange-700'
	};

	const btnPrimary =
		'rounded-full bg-indigo-600 px-7 py-3 text-lg font-semibold text-white shadow-md transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50';

	let task = $state<LearnTask | null>(null);
	let finished = $state(false);
	let loading = $state(true);
	let submitting = $state(false);
	let answer = $state('');
	let revealed = $state(false); // Stufe 1: Lernkarte -> Frage
	let feedback = $state<AnswerResult | null>(null);
	let solved = $state(0);
	let muted = $state(false);
	let picked = $state<number[]>([]); // Stufe 3: gewählte Buchstaben-Button-Indizes
	let extraMode = $state(false); // "Trotzdem weiter üben" (Extra-Wiederholung über alle Decks)

	function imgSrc(key: string | null) {
		return key ? data.imageBaseUrl + key : '';
	}

	// --- Stufe 3 (Lücken per Buttons) ---
	const gapCount = $derived(task?.masked ? (task.masked.match(/_/g)?.length ?? 0) : 0);
	const fills = $derived(picked.map((i) => task?.letters?.[i] ?? ''));
	const slots = $derived(
		(() => {
			let k = 0;
			return [...(task?.masked ?? '')].map((c) =>
				c === '_' ? { gap: true, char: fills[k++] ?? '' } : { gap: false, char: c }
			);
		})()
	);
	const reconstructed = $derived(slots.map((s) => (s.gap ? s.char || '_' : s.char)).join(''));
	const gapComplete = $derived(picked.length >= gapCount);

	function pickLetter(i: number) {
		if (gapComplete || picked.includes(i)) return;
		picked = [...picked, i];
	}
	function undoLetter() {
		picked = picked.slice(0, -1);
	}

	function toggleMute() {
		muted = !muted;
		setMuted(muted);
	}

	async function loadNext() {
		loading = true;
		feedback = null;
		answer = '';
		revealed = false;
		picked = [];
		const r = await fetch(`/api/learn/next?deckId=${data.deck.id}${extraMode ? '&extra=1' : ''}`);
		const res = (await r.json()) as NextResult;
		if ('done' in res && res.done) {
			finished = true;
			task = null;
			if (!extraMode) {
				playWin();
				confetti(60);
			}
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
			if (feedback.correct) {
				solved += 1;
				if (feedback.learned && !feedback.review) {
					playWin();
					confetti(45);
				} else {
					playCorrect();
					confetti(16);
				}
			} else {
				playWrong();
			}
		} else {
			alert('Antwort konnte nicht gespeichert werden.');
		}
	}

	onMount(() => {
		muted = isMuted();
		loadNext();
	});
</script>

<svelte:head><title>Riddler-Lingo — {data.deck.name}</title></svelte:head>

<div class="mx-auto max-w-md space-y-6 py-4">
	<div class="flex items-center justify-between">
		<a href="/start" class="text-sm font-medium text-indigo-600 hover:underline">← Wortgruppen</a>
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-500 shadow-sm">⭐ {solved}</span>
			<button onclick={toggleMute} title="Ton an/aus" class="rounded-full border bg-white px-2.5 py-1.5 text-sm shadow-sm hover:bg-gray-50">
				{muted ? '🔇' : '🔊'}
			</button>
		</div>
	</div>
	<h1 class="text-center text-2xl font-extrabold">{data.deck.name}</h1>

	{#if loading}
		<p class="py-10 text-center text-gray-400">Lädt …</p>
	{:else if finished}
		<div in:scale={{ duration: 250, start: 0.8 }} class="space-y-4 rounded-3xl border border-green-200 bg-green-50 p-8 text-center shadow-sm">
			<div class="animate-bounce text-7xl">{extraMode ? '💪' : '🎉'}</div>
			{#if extraMode}
				<p class="text-lg font-semibold text-green-700">Stark! Im Moment gibt es nichts mehr zu wiederholen.</p>
				<a href="/start" class={btnPrimary}>Zurück</a>
			{:else}
				<p class="text-lg font-semibold text-green-700">Super! Für jetzt ist alles geübt.</p>
				<div class="flex flex-col items-center gap-3">
					<button onclick={() => { extraMode = true; loadNext(); }} class={btnPrimary}>Trotzdem weiter üben →</button>
					<a href="/start" class="text-sm font-medium text-indigo-600 hover:underline">Zurück zu den Wortgruppen</a>
				</div>
			{/if}
		</div>
	{:else if feedback}
		<div in:scale={{ duration: 200, start: 0.85 }} class="space-y-4 rounded-3xl border p-8 text-center shadow-sm {feedback.correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
			<div class="text-7xl {feedback.correct ? 'animate-bounce' : ''}">{feedback.correct ? '🎉' : '🤔'}</div>
			<p class="text-xl font-bold {feedback.correct ? 'text-green-700' : 'text-red-700'}">
				{feedback.correct ? 'Richtig!' : 'Fast!'}
			</p>
			{#if feedback.learned && !feedback.review}<p class="font-semibold text-green-700">⭐ Dieses Wort ist jetzt gelernt!</p>{/if}
			{#if feedback.review && feedback.correct}<p class="font-semibold text-green-700">🔁 Wiederholung gemeistert!</p>{/if}
			{#if !feedback.correct}
				<p class="text-gray-600">Richtig wäre: <strong class="text-gray-900">{feedback.expected}</strong></p>
			{/if}
			<button onclick={loadNext} class={btnPrimary}>Weiter →</button>
		</div>
	{:else if task}
		{#key task.wordId + '-' + task.stage}
			<div in:fade={{ duration: 150 }} class="rounded-3xl border border-gray-200 bg-white p-6 shadow-md">
				<div class="mb-5 flex justify-center">
					<span class="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide {task.review ? 'bg-amber-100 text-amber-700' : stageChip[task.stage]}">
						{#if task.review}🔁 Wiederholung{:else}Stufe {task.stage}/4 · {stageNames[task.stage]}{/if}
					</span>
				</div>

				{#if task.imageKey}
					<img src={imgSrc(task.imageKey)} alt="" class="mx-auto mb-4 h-32 w-32 rounded-2xl object-cover shadow-sm" />
				{/if}

				{#if task.stage === 1}
					{#if !revealed}
						<!-- Lernkarte -->
						<div class="space-y-3 text-center">
							<div class="text-4xl font-extrabold">{task.term}</div>
							<div class="text-2xl text-gray-500">= {task.translation}</div>
							<button onclick={() => (revealed = true)} class="mt-3 {btnPrimary}">Verstanden →</button>
						</div>
					{:else}
						<form onsubmit={(e) => { e.preventDefault(); submit(answer); }} class="space-y-4 text-center">
							<p class="text-lg">Was bedeutet <strong>{task.term}</strong>?</p>
							<!-- svelte-ignore a11y_autofocus -->
							<input bind:value={answer} autofocus autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" class="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-center text-xl focus:border-indigo-400 focus:outline-none" placeholder="Bedeutung …" />
							<button disabled={submitting} class={btnPrimary}>Prüfen</button>
						</form>
					{/if}
				{:else if task.stage === 2}
					<div class="space-y-4 text-center">
						<p class="text-lg">Welches Wort heißt <strong>{task.translation}</strong>?</p>
						<div class="grid gap-3">
							{#each task.options ?? [] as opt}
								<button onclick={() => submit(opt)} disabled={submitting} class="rounded-2xl border-2 border-sky-200 bg-sky-50 px-4 py-4 text-xl font-semibold text-sky-900 shadow-sm transition hover:border-sky-400 hover:bg-sky-100 active:scale-95 disabled:opacity-50">{opt}</button>
							{/each}
						</div>
					</div>
				{:else if task.stage === 3}
					<div class="space-y-6 text-center">
						<p class="text-sm text-gray-500">Tippe die fehlenden Buchstaben (bedeutet: {task.translation})</p>

						<!-- Wort: sichtbare Buchstaben + Lücken als gleich große Kacheln -->
						<div class="flex flex-wrap justify-center gap-2">
							{#each slots as s}
								{#if s.gap}
									<span class="flex h-14 w-12 items-center justify-center rounded-xl border-2 border-dashed text-3xl font-bold {s.char ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-300 text-gray-300'}">{s.char || '?'}</span>
								{:else}
									<span class="flex h-14 w-12 items-center justify-center rounded-xl bg-gray-100 text-3xl font-bold text-gray-700">{s.char}</span>
								{/if}
							{/each}
						</div>

						<!-- Buchstaben-Auswahl (richtige + falsche, gemischt) -->
						<div class="flex flex-wrap justify-center gap-2.5">
							{#each task.letters ?? [] as letter, i}
								<button
									type="button"
									onclick={() => pickLetter(i)}
									disabled={picked.includes(i) || gapComplete}
									class="h-14 w-14 rounded-2xl bg-violet-100 text-2xl font-bold text-violet-800 shadow-sm transition hover:bg-violet-200 active:scale-95 disabled:opacity-30"
								>
									{letter}
								</button>
							{/each}
						</div>

						<div class="flex items-center justify-center gap-3">
							<button type="button" onclick={undoLetter} disabled={picked.length === 0} class="rounded-full border-2 border-gray-200 bg-white px-5 py-3 text-xl shadow-sm hover:bg-gray-50 active:scale-95 disabled:opacity-40" aria-label="Zurück">⌫</button>
							<button type="button" onclick={() => submit(reconstructed)} disabled={!gapComplete || submitting} class={btnPrimary}>Prüfen</button>
						</div>
					</div>
				{:else}
					<form onsubmit={(e) => { e.preventDefault(); submit(answer); }} class="space-y-4 text-center">
						<p class="text-lg">Schreibe das Wort für <strong>{task.translation}</strong></p>
						{#if task.audioKey}
							<audio controls src={imgSrc(task.audioKey)} class="mx-auto h-8"></audio>
						{/if}
						<!-- svelte-ignore a11y_autofocus -->
						<input bind:value={answer} autofocus autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" class="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-center text-xl focus:border-indigo-400 focus:outline-none" placeholder="Wort …" />
						<button disabled={submitting} class={btnPrimary}>Prüfen</button>
					</form>
				{/if}
			</div>
		{/key}
	{/if}
</div>
