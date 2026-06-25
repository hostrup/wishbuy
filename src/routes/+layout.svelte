<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	let { children } = $props();

	let isDark = $state(false);

	onMount(() => {
		if (
			localStorage.getItem('theme') === 'dark' ||
			(!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
		) {
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
	<title>Hostrup Hub</title>
</svelte:head>

<button
	onclick={toggleTheme}
	class="fixed right-4 bottom-4 z-50 rounded-full border border-slate-200 bg-white p-3 text-slate-800 shadow-lg transition-all hover:scale-110 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
	title="Skift tema"
>
	{#if isDark}
		☀️
	{:else}
		🌙
	{/if}
</button>

{@render children()}
