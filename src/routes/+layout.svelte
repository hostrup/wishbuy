<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	let { children } = $props();

	let isDark = $state(false);

	onMount(() => {
		if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
			isDark = true;
			document.documentElement.classList.add('dark');
		} else {
			isDark = false;
			document.documentElement.classList.remove('dark');
		}
	});

	function toggleTheme() {
		isDark = !isDark;
		if (isDark) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}
</script>

<svelte:head>
	<title>Ønskebrønden</title>
</svelte:head>

<button onclick={toggleTheme} class="fixed bottom-4 right-4 z-50 p-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all" title="Skift tema">
	{#if isDark}
		☀️
	{:else}
		🌙
	{/if}
</button>

{@render children()}