<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Hostrup Hub</title>
</svelte:head>

<div
	class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 p-6 font-sans text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100"
>
	<!-- Aurora glows (subtly dimmed in light mode, fully vibrant in dark mode) -->
	<div class="pointer-events-none absolute inset-0 opacity-30 dark:opacity-100">
		<div
			class="absolute -top-40 -left-40 h-[600px] w-[600px] animate-[pulse_8s_ease-in-out_infinite] rounded-full bg-indigo-500/15 blur-[130px] dark:bg-indigo-500/10"
		></div>
		<div
			class="absolute top-1/2 -right-40 h-[500px] w-[500px] animate-[pulse_10s_ease-in-out_infinite_2s] rounded-full bg-rose-500/15 blur-[110px] dark:bg-rose-500/10"
		></div>
		<div
			class="absolute -bottom-20 left-1/3 h-[400px] w-[400px] animate-[pulse_12s_ease-in-out_infinite_4s] rounded-full bg-indigo-500/15 blur-[100px] dark:bg-indigo-500/10"
		></div>
	</div>

	<div class="relative z-10 flex w-full max-w-4xl flex-col items-center gap-10">
		<!-- Logo / Brand -->
		<div class="text-center">
			<div
				class="mb-5 inline-flex h-20 w-20 items-center justify-center rounded-3xl border border-slate-200/50 bg-white/80 text-5xl shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
			>
				🏠
			</div>
			<h1
				class="bg-gradient-to-r from-indigo-600 to-rose-500 bg-clip-text text-5xl font-black tracking-tight text-transparent md:text-7xl dark:from-indigo-400 dark:to-rose-300"
			>
				Hostrup Hub
			</h1>
			<p class="mt-3 text-base font-medium text-slate-500 md:text-lg dark:text-slate-400">
				Husholdningens kommandocentral
			</p>
		</div>

		<!-- Tiles (using central glassmorphism and theme styling) -->
		<div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
			<a
				href="/dashboard/wishes"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-indigo-500/50 dark:border-white/10 dark:bg-slate-800/80"
			>
				<span class="relative text-5xl">🎁</span>
				<h2 class="relative text-xl font-bold text-slate-800 dark:text-white">Ønskebrønden</h2>
				<p
					class="relative text-center text-sm text-slate-500 transition-colors group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white"
				>
					Dine og familiens ønsker, stemmer og drømmekøb
				</p>
			</a>

			<a
				href="/dashboard/finance"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-indigo-500/50 dark:border-white/10 dark:bg-slate-800/80"
			>
				<span class="relative text-5xl">📊</span>
				<h2 class="relative text-xl font-bold text-slate-800 dark:text-white">Økonomi</h2>
				<p
					class="relative text-center text-sm text-slate-500 transition-colors group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white"
				>
					Forbrugsoverblik, grafer og AI-rådgivning
				</p>
			</a>

			<a
				href="/dashboard/import"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-indigo-500/50 dark:border-white/10 dark:bg-slate-800/80"
			>
				<span class="relative text-5xl">🏦</span>
				<h2 class="relative text-xl font-bold text-slate-800 dark:text-white">Bankimport</h2>
				<p
					class="relative text-center text-sm text-slate-500 transition-colors group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white"
				>
					Upload kontoudtog og kategorisér automatisk
				</p>
			</a>

			<a
				href="https://ugeplan.hostrup.org"
				target="_blank"
				rel="noopener noreferrer"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-rose-500/50 dark:border-white/10 dark:bg-slate-800/80"
			>
				<span class="relative text-5xl">📅</span>
				<h2 class="relative text-xl font-bold text-slate-800 dark:text-white">
					Ugeplan
					<span
						class="ml-2 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
						>↗</span
					>
				</h2>
				<p
					class="relative text-center text-sm text-slate-500 transition-colors group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white"
				>
					Madplan, fremmøde og dagens noter — åbner i nyt vindue
				</p>
			</a>
		</div>

		<!-- Footer -->
		<div class="text-center text-sm text-slate-400 dark:text-slate-500">
			{#if data.user}
				Logget ind som <span class="font-bold text-slate-600 dark:text-slate-400"
					>{data.user.displayName || data.user.username}</span
				>
			{/if}
		</div>
	</div>
</div>

<style>
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.6;
			transform: scale(1.05);
		}
	}
</style>
