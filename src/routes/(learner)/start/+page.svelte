<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Riddler-Lingo</title></svelte:head>

<div class="space-y-3 py-10 text-center">
	<div class="text-6xl">{data.user.avatar ?? '🙂'}</div>
	<h1 class="text-2xl font-bold">Hallo {data.user.name}! 👋</h1>
	<p class="text-gray-500">Deine Vokabeln kommen bald hierher (Meilenstein M4).</p>
</div>
