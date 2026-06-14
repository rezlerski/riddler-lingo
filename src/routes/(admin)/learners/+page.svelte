<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const avatarChoices = ['🦊', '🐼', '🐯', '🐶', '🐱', '🐵', '🦁', '🐸', '🐰', '🐧', '🦉', '🐢'];
	let newAvatar = $state('🦊');
	let resetFor = $state<number | null>(null);
</script>

<svelte:head><title>Riddler-Lingo — Kinder</title></svelte:head>

<div class="space-y-8">
	<h1 class="text-2xl font-bold">Kinder verwalten</h1>

	{#if form?.success}
		<p class="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{form.success}</p>
	{/if}

	<!-- Neues Kind anlegen -->
	<section class="rounded-xl border border-gray-200 bg-white p-5">
		<h2 class="mb-3 text-lg font-semibold">Neues Kind</h2>
		{#if form?.error && form.action === 'create'}
			<p class="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
		{/if}
		<form method="POST" action="?/create" use:enhance class="space-y-4">
			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block space-y-1">
					<span class="text-sm font-medium">Name</span>
					<input
						name="name"
						required
						class="w-full rounded border border-gray-300 px-3 py-2"
						placeholder="z. B. Mia"
					/>
				</label>
				<label class="block space-y-1">
					<span class="text-sm font-medium">PIN (4 Ziffern)</span>
					<input
						name="pin"
						inputmode="numeric"
						pattern="[0-9]*"
						maxlength="4"
						required
						class="w-full rounded border border-gray-300 px-3 py-2 tracking-widest"
						placeholder="1234"
					/>
				</label>
			</div>
			<div class="space-y-1">
				<span class="text-sm font-medium">Avatar</span>
				<input type="hidden" name="avatar" value={newAvatar} />
				<div class="flex flex-wrap gap-2">
					{#each avatarChoices as a}
						<button
							type="button"
							onclick={() => (newAvatar = a)}
							class="rounded-lg border p-2 text-2xl transition
								{newAvatar === a ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}"
						>
							{a}
						</button>
					{/each}
				</div>
			</div>
			<button class="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
				Kind anlegen
			</button>
		</form>
	</section>

	<!-- Liste -->
	<section class="rounded-xl border border-gray-200 bg-white p-5">
		<h2 class="mb-3 text-lg font-semibold">Angelegte Kinder ({data.children.length})</h2>
		{#if data.children.length === 0}
			<p class="text-gray-500">Noch keine Kinder angelegt.</p>
		{:else}
			<ul class="divide-y">
				{#each data.children as child}
					<li class="flex flex-wrap items-center justify-between gap-3 py-3">
						<div class="flex items-center gap-3">
							<span class="text-3xl">{child.avatar ?? '🙂'}</span>
							<div>
								<div class="font-medium">{child.name}</div>
								<div class="text-xs text-gray-400">angelegt {child.created_at}</div>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => (resetFor = resetFor === child.id ? null : child.id)}
								class="rounded border px-2 py-1 text-sm hover:bg-gray-50"
							>
								PIN ändern
							</button>
							<form
								method="POST"
								action="?/delete"
								use:enhance
								onsubmit={(e) => {
									if (!confirm(`„${child.name}" wirklich löschen? Alle Lernfortschritte gehen verloren.`))
										e.preventDefault();
								}}
							>
								<input type="hidden" name="id" value={child.id} />
								<button class="rounded border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50">
									Löschen
								</button>
							</form>
						</div>

						{#if resetFor === child.id}
							<form
								method="POST"
								action="?/resetPin"
								use:enhance={() => {
									return async ({ update }) => {
										await update();
										resetFor = null;
									};
								}}
								class="flex w-full items-end gap-2 rounded bg-gray-50 p-3"
							>
								<input type="hidden" name="id" value={child.id} />
								<label class="space-y-1">
									<span class="text-xs font-medium">Neue PIN</span>
									<input
										name="pin"
										inputmode="numeric"
										pattern="[0-9]*"
										maxlength="4"
										required
										class="w-28 rounded border border-gray-300 px-3 py-2 tracking-widest"
										placeholder="0000"
									/>
								</label>
								<button class="rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-900">
									Speichern
								</button>
								{#if form?.action === 'resetPin' && 'id' in form && form.id === child.id}
									<span class="text-sm text-red-600">{form.error}</span>
								{/if}
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
