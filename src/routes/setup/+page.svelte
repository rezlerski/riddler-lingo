<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head><title>Riddler-Lingo — Einrichtung</title></svelte:head>

<main class="mx-auto max-w-md space-y-6 p-6">
	<header class="space-y-1">
		<img src="/logo.png" alt="" class="mb-1 h-14 w-14" />
		<h1 class="text-2xl font-bold">Erste Einrichtung</h1>
		<p class="text-gray-500">Lege den Admin-Account an (das bist du).</p>
	</header>

	<form method="POST" use:enhance class="space-y-4 rounded-xl border border-gray-200 p-5">
		{#if form?.error}
			<p class="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
		{/if}

		<label class="block space-y-1">
			<span class="text-sm font-medium">Name</span>
			<input
				name="name"
				value={form?.name ?? ''}
				required
				class="w-full rounded border border-gray-300 px-3 py-2"
				autocomplete="username"
			/>
		</label>

		<label class="block space-y-1">
			<span class="text-sm font-medium">Passwort</span>
			<input
				name="password"
				type="password"
				required
				minlength="6"
				class="w-full rounded border border-gray-300 px-3 py-2"
				autocomplete="new-password"
			/>
		</label>

		<label class="block space-y-1">
			<span class="text-sm font-medium">Passwort wiederholen</span>
			<input
				name="password2"
				type="password"
				required
				minlength="6"
				class="w-full rounded border border-gray-300 px-3 py-2"
				autocomplete="new-password"
			/>
		</label>

		<button class="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
			Admin anlegen
		</button>
	</form>
</main>
