<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<header class="border-b bg-white">
		<div class="mx-auto flex max-w-4xl items-center justify-between p-4">
			<nav class="flex items-center gap-4">
				<a href="/decks" class="font-semibold">🦉 Admin</a>
				<a href="/decks" class="text-sm text-gray-600 hover:text-gray-900">Wortgruppen</a>
				<a href="/learners" class="text-sm text-gray-600 hover:text-gray-900">Kinder</a>
			</nav>
			<div class="flex items-center gap-3 text-sm">
				<span class="text-gray-500">{data.user.name}</span>
				<form method="POST" action="/logout">
					<button class="rounded border px-2 py-1 hover:bg-gray-50">Abmelden</button>
				</form>
			</div>
		</div>
	</header>
	<main class="mx-auto max-w-4xl p-4">
		{@render children()}
	</main>
</div>
