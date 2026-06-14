<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<header class="border-b bg-white">
		<div class="mx-auto flex max-w-3xl items-center justify-between p-4">
			<a href="/start" class="font-semibold">{data.user.avatar ?? '🙂'} {data.user.name}</a>
			<div class="flex items-center gap-3">
				<a href="/progress" class="text-sm text-gray-600 hover:text-gray-900">Erfolge</a>
				<form method="POST" action="/logout">
					<button class="rounded border px-2 py-1 text-sm hover:bg-gray-50">Abmelden</button>
				</form>
			</div>
		</div>
	</header>
	<main class="mx-auto max-w-3xl p-4">
		{@render children()}
	</main>
</div>
