<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const path = $derived(page.url.pathname);
	const isActive = (prefix: string) => path === prefix || path.startsWith(prefix + '/');
	const tab = (prefix: string) =>
		isActive(prefix) ? 'font-semibold text-indigo-700' : 'text-gray-600 hover:text-gray-900';
</script>

<div class="min-h-screen bg-gray-50">
	<header class="border-b bg-white">
		<div class="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-2 p-3 sm:p-4">
			<nav class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
				<span class="flex items-center gap-1.5 font-semibold"><img src="/logo.png" alt="" class="h-6 w-6" /> Admin</span>
				<a href="/decks" class="text-sm {tab('/decks')}">Wortgruppen</a>
				<a href="/learners" class="text-sm {tab('/learners')}">Kinder</a>
				<a href="/stats" class="text-sm {tab('/stats')}">Erfolge</a>
			</nav>
			<div class="flex items-center gap-3 text-sm">
				<span class="text-gray-500">{data.user.name}</span>
				<form method="POST" action="/logout">
					<button class="rounded-lg border px-2 py-1 hover:bg-gray-50">Abmelden</button>
				</form>
			</div>
		</div>
	</header>
	<main class="mx-auto max-w-4xl p-4">
		{@render children()}
	</main>
</div>
