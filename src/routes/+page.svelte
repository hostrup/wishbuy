<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Hostrup Hub</title>
</svelte:head>

<div class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 font-sans text-[#f0f2ef]" style="background: linear-gradient(180deg, var(--color-bg-root) 0%, #0c110c 60%, #111711 100%);">
	<!-- Aurora glows -->
	<div class="pointer-events-none absolute inset-0">
		<div class="absolute -top-40 -left-40 h-[600px] w-[600px] animate-[pulse_8s_ease-in-out_infinite] rounded-full bg-[var(--color-accent-glow)] blur-[130px]"></div>
		<div class="absolute top-1/2 -right-40 h-[500px] w-[500px] animate-[pulse_10s_ease-in-out_infinite_2s] rounded-full bg-[var(--color-pink-glow)] blur-[110px]"></div>
		<div class="absolute -bottom-20 left-1/3 h-[400px] w-[400px] animate-[pulse_12s_ease-in-out_infinite_4s] rounded-full bg-[var(--color-accent-glow)] blur-[100px]"></div>
	</div>

	<div class="relative z-10 flex w-full max-w-4xl flex-col items-center gap-10">
		<!-- Logo -->
		<div class="text-center">
			<div class="mb-5 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 text-5xl shadow-2xl ring-1 ring-white/10 backdrop-blur-xl" style="box-shadow: var(--shadow-glow-indigo)">
				🏠
			</div>
			<h1 class="bg-gradient-to-r from-[var(--color-text-primary)] via-[var(--color-accent)] to-[var(--color-pink)] bg-clip-text text-5xl font-black tracking-tight text-transparent md:text-7xl" style="font-family: 'Inter', system-ui, -apple-system, sans-serif;">
				Hostrup Hub
			</h1>
			<p class="mt-3 text-base font-medium text-[var(--color-text-secondary)] md:text-lg">
				Husholdningens kommandocentral
			</p>
		</div>

		<!-- Tiles -->
		<div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
			<a
				href="/dashboard/wishes"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-white/5 bg-white/3 p-8 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-[var(--color-accent)]/30 hover:bg-white/8"
				style="box-shadow: var(--shadow-elevated); --shadow-glow-indigo on hover"
			>
				<div class="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-[var(--color-accent-glow)] blur-2xl transition-all group-hover:bg-[var(--color-accent)]/20"></div>
				<span class="relative text-5xl">🎁</span>
				<h2 class="relative text-xl font-bold" style="font-family: 'Inter', system-ui, sans-serif;">Ønskebrønden</h2>
				<p class="relative text-center text-sm text-[var(--color-text-secondary)] transition-colors group-hover:text-[var(--color-text-primary)]">
					Dine og familiens ønsker, stemmer og drømmekøb
				</p>
			</a>

			<a
				href="/dashboard/finance"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-white/5 bg-white/3 p-8 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-[var(--color-accent)]/30 hover:bg-white/8"
				style="box-shadow: var(--shadow-elevated); --shadow-glow-indigo on hover"
			>
				<div class="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-[var(--color-accent-glow)] blur-2xl transition-all group-hover:bg-[var(--color-accent)]/20"></div>
				<span class="relative text-5xl">📊</span>
				<h2 class="relative text-xl font-bold" style="font-family: 'Inter', system-ui, sans-serif;">Økonomi</h2>
				<p class="relative text-center text-sm text-[var(--color-text-secondary)] transition-colors group-hover:text-[var(--color-text-primary)]">
					Forbrugsoverblik, grafer og AI-rådgivning
				</p>
			</a>

			<a
				href="/dashboard/import"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-white/5 bg-white/3 p-8 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-[var(--color-accent)]/30 hover:bg-white/8"
				style="box-shadow: var(--shadow-elevated); --shadow-glow-indigo on hover"
			>
				<div class="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-[var(--color-accent-glow)] blur-2xl transition-all group-hover:bg-[var(--color-accent)]/20"></div>
				<span class="relative text-5xl">🏦</span>
				<h2 class="relative text-xl font-bold" style="font-family: 'Inter', system-ui, sans-serif;">Bankimport</h2>
				<p class="relative text-center text-sm text-[var(--color-text-secondary)] transition-colors group-hover:text-[var(--color-text-primary)]">
					Upload kontoudtog og kategorisér automatisk
				</p>
			</a>

			<a
				href="https://ugeplan.hostrup.org"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-white/5 bg-white/3 p-8 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-[var(--color-pink)]/30 hover:bg-white/8"
				style="box-shadow: var(--shadow-elevated); --shadow-glow-pink on hover"
			>
				<div class="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-[var(--color-pink-glow)] blur-2xl transition-all group-hover:bg-[var(--color-pink)]/20"></div>
				<span class="relative text-5xl">📅</span>
				<h2 class="relative text-xl font-bold" style="font-family: 'Inter', system-ui, sans-serif;">
					Ugeplan
					<span class="ml-2 rounded-full bg-[var(--color-pink)]/20 px-2 py-0.5 text-[11px] font-bold text-[var(--color-text-primary)]" style="box-shadow: 0 0 0 1px rgba(255,255,255,0.06);">↗</span>
				</h2>
				<p class="relative text-center text-sm text-[var(--color-text-secondary)] transition-colors group-hover:text-[var(--color-text-primary)]">
					Madplan, fremmøde og dagens noter — åbner i nyt vindue
				</p>
			</a>
		</div>

		<!-- Footer -->
		<div class="text-center text-sm text-[var(--color-text-tertiary)]">
			{#if data.user}
				Logget ind som <span class="font-bold text-[var(--color-text-secondary)]">{data.user.displayName || data.user.username}</span>
			{/if}
		</div>
	</div>
</div>

<style>
	@keyframes pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.6; transform: scale(1.05); }
	}
</style>
