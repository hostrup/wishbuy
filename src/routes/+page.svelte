<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Hostrup Hub</title>
</svelte:head>

<div class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#0a0e1a] via-[#0f1225] to-[#161832] p-6 font-sans text-white">
	<!-- Animated aurora background -->
	<div class="pointer-events-none absolute inset-0">
		<div class="absolute -top-40 -left-40 h-[600px] w-[600px] animate-[pulse_8s_ease-in-out_infinite] rounded-full bg-violet-600/20 blur-[120px]"></div>
		<div class="absolute top-1/2 -right-40 h-[500px] w-[500px] animate-[pulse_10s_ease-in-out_infinite_2s] rounded-full bg-cyan-500/15 blur-[100px]"></div>
		<div class="absolute -bottom-20 left-1/3 h-[400px] w-[400px] animate-[pulse_12s_ease-in-out_infinite_4s] rounded-full bg-indigo-500/15 blur-[100px]"></div>
	</div>

	<!-- Content -->
	<div class="relative z-10 flex w-full max-w-4xl flex-col items-center gap-10">
		<!-- Logo / Brand -->
		<div class="text-center">
			<div class="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-4xl shadow-2xl shadow-violet-500/20 ring-1 ring-white/20 backdrop-blur-xl">
				🏠
			</div>
			<h1 class="bg-gradient-to-r from-white via-violet-200 to-cyan-300 bg-clip-text text-5xl font-black tracking-tight text-transparent md:text-7xl">
				Hostrup Hub
			</h1>
			<p class="mt-3 text-base font-medium text-slate-400 md:text-lg">
				Husholdningens kommandocentral
			</p>
		</div>

		<!-- Tile Grid -->
		<div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
			<a
				href="/dashboard/wishes"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-amber-500/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-amber-500/10"
			>
				<div class="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl transition-all group-hover:bg-amber-500/20"></div>
				<span class="relative text-5xl">🎁</span>
				<h2 class="relative text-xl font-bold">Ønskebrønden</h2>
				<p class="relative text-center text-sm text-slate-400 transition-colors group-hover:text-slate-300">
					Dine og familiens ønsker, stemmer og drømmekøb
				</p>
			</a>

			<a
				href="/dashboard/finance"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-indigo-500/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-indigo-500/10"
			>
				<div class="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl transition-all group-hover:bg-indigo-500/20"></div>
				<span class="relative text-5xl">📊</span>
				<h2 class="relative text-xl font-bold">Økonomi</h2>
				<p class="relative text-center text-sm text-slate-400 transition-colors group-hover:text-slate-300">
					Forbrugsoverblik, grafer og AI-rådgivning
				</p>
			</a>

			<a
				href="/dashboard/import"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-emerald-500/10"
			>
				<div class="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition-all group-hover:bg-emerald-500/20"></div>
				<span class="relative text-5xl">🏦</span>
				<h2 class="relative text-xl font-bold">Bankimport</h2>
				<p class="relative text-center text-sm text-slate-400 transition-colors group-hover:text-slate-300">
					Upload kontoudtog og kategorisér automatisk
				</p>
			</a>

			<a
				href="/dashboard/weekly"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm opacity-60 transition-all duration-300 hover:scale-[1.02] hover:border-sky-500/30 hover:bg-white/10 hover:opacity-90 hover:shadow-2xl hover:shadow-sky-500/10"
			>
				<div class="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-sky-500/10 blur-2xl transition-all group-hover:bg-sky-500/20"></div>
				<span class="relative text-5xl">📅</span>
				<h2 class="relative text-xl font-bold">
					Ugeplan
					<span class="ml-2 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300">SOON</span>
				</h2>
				<p class="relative text-center text-sm text-slate-400 transition-colors group-hover:text-slate-300">
					Madplan, fremmøde og dagens noter — kommer snart
				</p>
			</a>
		</div>

		<!-- User footer -->
		<div class="text-center text-sm text-slate-500">
			{#if data.user}
				Logget ind som <span class="font-bold text-slate-300">{data.user.displayName || data.user.username}</span>
			{/if}
		</div>
	</div>
</div>

<style>
	@keyframes pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.6; transform: scale(1.1); }
	}
</style>
