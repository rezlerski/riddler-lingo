<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// use:enhance erhält den Client-State über fehlgeschlagene Logins hinweg,
	// daher genügt eine leere Anfangsauswahl.
	let selected = $state<number | null>(null);

	const selectedName = $derived(data.children.find((c) => c.id === selected)?.name ?? '');
</script>

<svelte:head><title>Riddler-Lingo — Anmelden</title></svelte:head>

<main class="mx-auto max-w-2xl space-y-8 p-6">
	<header class="space-y-1 text-center">
		<img src="/logo.png" alt="Riddler-Lingo" class="mx-auto h-20 w-20" />
		<h1 class="text-3xl font-bold">Riddler-Lingo</h1>
		<p class="text-gray-500">Wer bist du?</p>
	</header>

	<!-- Kinder-Login: Avatar wählen + PIN -->
	<section class="space-y-4">
		{#if data.children.length === 0}
			<p class="text-center text-gray-500">Noch keine Kinder angelegt. Melde dich als Erwachsener an.</p>
		{:else}
			<div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
				{#each data.children as child}
					<button
						type="button"
						onclick={() => (selected = child.id)}
						class="flex flex-col items-center gap-1 rounded-xl border p-3 transition
							{selected === child.id
							? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300'
							: 'border-gray-200 hover:border-gray-300'}"
					>
						<span class="text-3xl">{child.avatar ?? '🙂'}</span>
						<span class="text-sm font-medium">{child.name}</span>
					</button>
				{/each}
			</div>

			<form method="POST" action="?/child" use:enhance class="space-y-3 rounded-xl border border-gray-200 p-4">
				<input type="hidden" name="userId" value={selected ?? ''} />
				{#if form?.error && form.mode === 'child'}
					<p class="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
				{/if}
				<label class="block space-y-1">
					<span class="text-sm font-medium">
						{selected ? `PIN für ${selectedName}` : 'Bitte zuerst oben auswählen'}
					</span>
					<input
						name="pin"
						type="password"
						inputmode="numeric"
						pattern="[0-9]*"
						maxlength="4"
						placeholder="••••"
						disabled={!selected}
						class="w-full rounded border border-gray-300 px-3 py-2 text-center text-2xl tracking-[0.5em] disabled:bg-gray-100"
					/>
				</label>
				<button
					disabled={!selected}
					class="w-full rounded-full bg-indigo-600 px-4 py-3 text-lg font-semibold text-white shadow-md transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
				>
					Los geht's
				</button>
			</form>
		{/if}
	</section>

	<!-- Admin-Login -->
	<details class="rounded-xl border border-gray-200 p-4" open={form?.mode === 'admin'}>
		<summary class="cursor-pointer text-sm font-medium text-gray-600">Erwachsene / Admin</summary>
		<form method="POST" action="?/admin" use:enhance class="mt-3 space-y-3">
			{#if form?.error && form.mode === 'admin'}
				<p class="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
			{/if}
			<label class="block space-y-1">
				<span class="text-sm font-medium">Name</span>
				<input
					name="name"
					value={form?.mode === 'admin' ? (form.name ?? '') : ''}
					required
					autocomplete="username"
					class="w-full rounded border border-gray-300 px-3 py-2"
				/>
			</label>
			<label class="block space-y-1">
				<span class="text-sm font-medium">Passwort</span>
				<input
					name="password"
					type="password"
					required
					autocomplete="current-password"
					class="w-full rounded border border-gray-300 px-3 py-2"
				/>
			</label>
			<button class="rounded-lg bg-gray-800 px-4 py-2 font-medium text-white hover:bg-gray-900">
				Anmelden
			</button>
		</form>
	</details>
</main>
