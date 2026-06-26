<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

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
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<!-- FÆLLES CENTRAL NAVIGATION -->
{#if $page.url.pathname !== '/'}
	<!-- Desktop Top-Navbar -->
	<nav
		class="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/80"
	>
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-16 items-center justify-between">
				<!-- Venstre: Logo -->
				<a
					href="/"
					class="flex items-center gap-2 text-lg font-black tracking-tight text-slate-800 transition-opacity hover:opacity-80 dark:text-white"
				>
					<span class="text-xl">🏠</span>
					<span>Hostrup Hub</span>
				</a>

				<!-- Midte: Links -->
				<div class="hidden items-center gap-1 md:flex">
					<a
						href="/dashboard/wishes"
						class="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors {$page
							.url.pathname === '/dashboard/wishes'
							? 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white'}"
					>
						<span>🎁</span> Ønsker
					</a>
					<a
						href="/dashboard/finance"
						class="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors {$page
							.url.pathname === '/dashboard/finance'
							? 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white'}"
					>
						<span>📊</span> Økonomi
					</a>
					<a
						href="/dashboard/import"
						class="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors {$page
							.url.pathname === '/dashboard/import'
							? 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white'}"
					>
						<span>🏦</span> Bankimport
					</a>
					<a
						href="/dashboard/weekly"
						class="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors {$page.url.pathname.startsWith(
							'/dashboard/weekly'
						)
							? 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white'}"
					>
						<span>📅</span> Ugeplan
					</a>
				</div>

				<!-- Højre: Bruger & Tema -->
				<div class="flex items-center gap-3">
					{#if $page.data.user}
						<div
							class="hidden items-center gap-1.5 rounded-xl border border-slate-200/50 bg-slate-50/50 px-3.5 py-1.5 text-xs font-bold text-slate-600 sm:flex dark:border-white/5 dark:bg-slate-900/50 dark:text-slate-300"
						>
							<span>{$page.data.user.emoji || '👤'}</span>
							<span>{$page.data.user.displayName || $page.data.user.username}</span>
						</div>
					{/if}

					<button
						onclick={toggleTheme}
						class="rounded-xl border border-slate-200 bg-slate-50/50 p-2 text-slate-600 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-white/5 dark:bg-slate-900/50 dark:text-slate-300"
						title="Skift tema"
					>
						{#if isDark}
							☀️
						{:else}
							🌙
						{/if}
					</button>
				</div>
			</div>
		</div>
	</nav>

	<!-- Mobile Bottom-Navbar (floating glassmorphism app bar) -->
	<div class="fixed right-4 bottom-4 left-4 z-50 md:hidden">
		<div
			class="flex items-center justify-around rounded-2xl border border-slate-200/50 bg-white/80 p-2 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80"
		>
			<a
				href="/"
				class="flex flex-col items-center gap-0.5 p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400"
			>
				<span class="text-xl">🏠</span>
				<span class="text-[9px] font-bold">Hub</span>
			</a>
			<a
				href="/dashboard/wishes"
				class="flex flex-col items-center gap-0.5 p-2 transition-colors {$page.url.pathname ===
				'/dashboard/wishes'
					? 'text-indigo-500 dark:text-indigo-400'
					: 'text-slate-500 dark:text-slate-400'}"
			>
				<span class="text-xl">🎁</span>
				<span class="text-[9px] font-bold">Ønsker</span>
			</a>
			<a
				href="/dashboard/finance"
				class="flex flex-col items-center gap-0.5 p-2 transition-colors {$page.url.pathname ===
				'/dashboard/finance'
					? 'text-indigo-500 dark:text-indigo-400'
					: 'text-slate-500 dark:text-slate-400'}"
			>
				<span class="text-xl">📊</span>
				<span class="text-[9px] font-bold">Økonomi</span>
			</a>
			<a
				href="/dashboard/weekly"
				class="flex flex-col items-center gap-0.5 p-2 transition-colors {$page.url.pathname.startsWith(
					'/dashboard/weekly'
				)
					? 'text-indigo-500 dark:text-indigo-400'
					: 'text-slate-500 dark:text-slate-400'}"
			>
				<span class="text-xl">📅</span>
				<span class="text-[9px] font-bold">Ugeplan</span>
			</a>
			<a
				href="/dashboard/import"
				class="flex flex-col items-center gap-0.5 p-2 transition-colors {$page.url.pathname ===
				'/dashboard/import'
					? 'text-indigo-500 dark:text-indigo-400'
					: 'text-slate-500 dark:text-slate-400'}"
			>
				<span class="text-xl">🏦</span>
				<span class="text-[9px] font-bold">Import</span>
			</a>
			<button
				onclick={toggleTheme}
				class="flex flex-col items-center gap-0.5 p-2 text-slate-500 dark:text-slate-400"
				title="Skift tema"
			>
				<span class="text-xl">{isDark ? '☀️' : '🌙'}</span>
				<span class="text-[9px] font-bold">Tema</span>
			</button>
		</div>
	</div>
{:else}
	<!-- Desktop theme toggle button ONLY on home page (fixed bottom right) -->
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
{/if}

{@render children()}
