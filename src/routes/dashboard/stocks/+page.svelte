<script lang="ts">
	import { chart } from '$lib/actions/apexcharts';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let isDarkMode = $state(false);

	// CRUD-modaler (Sprint 9.5)
	let showAddTx = $state(false);
	let showAddStock = $state(false);
	let showHistory = $state(false);

	const today = new Date().toISOString().slice(0, 10);
	let txStockId = $state('');
	let txType = $state<'BUY' | 'SELL'>('BUY');
	let txDate = $state(today);
	let txShares = $state('');
	let txPrice = $state('');
	let txRate = $state('');
	let txBrokerage = $state('25');
	let txExchangeFee = $state('');

	const toNum = (s: string) => Number((s || '').replace(',', '.'));

	// Live forhåndsvisning af kostpris i modalen
	let previewCost = $derived.by(() => {
		const s = toNum(txShares);
		const p = toNum(txPrice);
		const r = toNum(txRate);
		if (!(s > 0 && p > 0 && r > 0)) return null;
		const amount = s * p * r;
		const feeInput = toNum(txExchangeFee);
		const fee =
			txExchangeFee.trim() !== '' && !isNaN(feeInput)
				? feeInput
				: Math.round(amount * 0.0025 * 100) / 100;
		const brokerage = isNaN(toNum(txBrokerage)) ? 25 : toNum(txBrokerage);
		return amount + fee + brokerage;
	});

	function openAddTx() {
		txStockId = data.stockOptions[0]?.id ?? '';
		txType = 'BUY';
		txDate = today;
		txShares = '';
		txPrice = '';
		txRate = data.fxRate ? data.fxRate.toFixed(2) : '';
		txBrokerage = '25';
		txExchangeFee = '';
		showAddTx = true;
	}

	function getThemeColor(variableName: string, fallback: string): string {
		if (typeof window === 'undefined') return fallback;
		return (
			getComputedStyle(document.documentElement).getPropertyValue(variableName).trim() || fallback
		);
	}

	$effect(() => {
		const observer = new MutationObserver(() => {
			isDarkMode = document.documentElement.classList.contains('dark');
		});
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		isDarkMode = document.documentElement.classList.contains('dark');
		return () => observer.disconnect();
	});

	const dkk = (v: number) =>
		new Intl.NumberFormat('da-DK', {
			style: 'currency',
			currency: 'DKK',
			maximumFractionDigits: 0
		}).format(v);
	const usd = (v: number) =>
		new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'USD' }).format(v);
	const pct = (v: number) =>
		new Intl.NumberFormat('da-DK', {
			style: 'percent',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
			signDisplay: 'exceptZero'
		}).format(v);
	const dateFmt = (d: string | Date | null) =>
		d ? new Intl.DateTimeFormat('da-DK', { dateStyle: 'medium' }).format(new Date(d)) : '–';

	const gainClass = (v: number) =>
		v > 0
			? 'text-emerald-600 dark:text-emerald-400'
			: v < 0
				? 'text-rose-600 dark:text-rose-400'
				: 'text-slate-500 dark:text-slate-400';

	// Performance-bar: placér aktuel værdi mellem Krise og Eufori
	let bandMin = $derived(data.scenarioBands[0]?.valueDkk ?? 0);
	let bandMax = $derived(data.scenarioBands[data.scenarioBands.length - 1]?.valueDkk ?? 1);
	const posPct = (v: number) =>
		bandMax > bandMin ? Math.min(100, Math.max(0, ((v - bandMin) / (bandMax - bandMin)) * 100)) : 0;
	let currentPos = $derived(posPct(data.totals.valueDkk));

	// Donut-farver fra temaet (cykler). Genberegnes når isDarkMode skifter,
	// fordi donutOptions selv afhænger af isDarkMode (stroke + theme nedenfor).
	const palette = [
		'--color-indigo-500',
		'--color-violet-500',
		'--color-indigo-400',
		'--color-rose-400'
	];

	let donutOptions = $derived({
		chart: { type: 'donut', height: 360, background: 'transparent' },
		series: data.allocation.map((a) => Math.round(a.valueDkk)),
		labels: data.allocation.map((a) => a.ticker),
		colors: data.allocation.map((_, i) => getThemeColor(palette[i % palette.length], '#6c5ce7')),
		legend: { position: 'bottom' },
		dataLabels: {
			enabled: true,
			formatter: (val: number) => `${Math.round(val)}%`
		},
		plotOptions: {
			pie: {
				donut: {
					size: '72%',
					labels: {
						show: true,
						total: {
							show: true,
							label: 'Værdi',
							formatter: () => dkk(data.totals.valueDkk)
						}
					}
				}
			}
		},
		stroke: { colors: [isDarkMode ? getThemeColor('--color-slate-800', '#181c18') : '#ffffff'] },
		tooltip: { y: { formatter: (val: number) => dkk(val) } },
		theme: { mode: isDarkMode ? 'dark' : 'light' }
	});

	let areaOptions = $derived({
		chart: { type: 'area', height: 340, toolbar: { show: false }, background: 'transparent' },
		series: [
			{ name: 'Porteføljeværdi', data: data.history.valueSeries },
			{ name: 'Kostpris', data: data.history.costSeries }
		],
		xaxis: { categories: data.history.dates, type: 'datetime' },
		colors: [
			getThemeColor('--color-emerald-500', '#10b981'),
			getThemeColor('--color-slate-400', '#94a3b8')
		],
		fill: {
			type: ['gradient', 'solid'],
			gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 },
			opacity: [0.4, 0]
		},
		stroke: { curve: 'smooth', width: [3, 2], dashArray: [0, 6] },
		dataLabels: { enabled: false },
		grid: {
			borderColor: isDarkMode
				? getThemeColor('--color-slate-700', '#2a2f29')
				: getThemeColor('--color-slate-200', '#e8eae5'),
			strokeDashArray: 4
		},
		tooltip: { x: { format: 'dd MMM yyyy' }, y: { formatter: (val: number) => dkk(val) } },
		theme: { mode: isDarkMode ? 'dark' : 'light' }
	});

	const thesisBadge: Record<string, { icon: string; label: string; cls: string }> = {
		OK: {
			icon: '🟢',
			label: 'Tese intakt',
			cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
		},
		PRESSURE: {
			icon: '⚠️',
			label: 'Under pres',
			cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
		},
		UNKNOWN: {
			icon: '⏳',
			label: 'Afventer kurs',
			cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
		}
	};
</script>

<svelte:head><title>Aktier · Hostrup Hub</title></svelte:head>

<div
	class="relative min-h-screen bg-slate-50 p-4 font-sans text-slate-900 transition-colors duration-300 md:p-8 lg:p-12 dark:bg-slate-950 dark:text-slate-100"
>
	<div
		class="pointer-events-none absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-600/10"
	></div>
	<div
		class="pointer-events-none absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/10"
	></div>

	<div class="relative z-10 mx-auto max-w-7xl space-y-8">
		<!-- HEADER -->
		<header
			class="flex flex-col border-b border-slate-200/50 pb-4 md:flex-row md:items-end md:justify-between dark:border-white/10"
		>
			<div>
				<a
					href="/"
					class="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-indigo-500 dark:text-slate-400"
					>← Hub</a
				>
				<h1
					class="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-3xl font-black tracking-tight text-transparent drop-shadow-sm md:text-5xl dark:from-indigo-400 dark:to-violet-300"
				>
					Aktier
				</h1>
				<p class="mt-2 font-medium text-slate-500 dark:text-slate-400">
					Jeres fælles AI-modelportefølje — afkast, allokering og analyse.
				</p>
			</div>
			<div class="mt-4 flex flex-col items-end gap-3 md:mt-0">
				<div class="flex gap-2">
					<button
						onclick={openAddTx}
						class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-600"
					>
						+ Tilføj handel
					</button>
					<button
						onclick={() => (showAddStock = true)}
						class="rounded-xl border border-indigo-200 bg-indigo-500/10 px-4 py-2 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300"
					>
						Ny aktie
					</button>
				</div>
				<div class="text-right text-xs text-slate-400 dark:text-slate-500">
					<div>
						USD/DKK: <span class="font-bold text-slate-600 dark:text-slate-300"
							>{data.fxRate.toFixed(2)}</span
						>
					</div>
					<div>
						Kurser opdateret: {dateFmt(data.lastSyncedAt)}
						{#if !data.marketOpen}
							<span
								class="ml-1 text-slate-400 dark:text-slate-500"
								title="USA's aktiemarked er lukket lige nu">🔒 US-marked lukket</span
							>
						{/if}
					</div>
				</div>
			</div>
		</header>

		{#if form?.error}
			<div
				class="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
			>
				{form.error}
			</div>
		{/if}

		{#if !data.hasData}
			<div
				class="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200/50 bg-white/80 p-16 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
			>
				<span class="text-5xl">📈</span>
				<h2 class="text-xl font-bold text-slate-800 dark:text-white">Ingen positioner endnu</h2>
				<p class="max-w-md text-sm text-slate-500 dark:text-slate-400">
					Porteføljen er tom. Når seed-data er indlæst og kurserne synkroniseret, vises dit overblik
					her.
				</p>
			</div>
		{:else}
			<!-- KPI-TOPBJÆLKE -->
			<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div
					class="rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
				>
					<p class="text-xs font-bold tracking-widest text-slate-400 uppercase">Porteføljeværdi</p>
					<p class="mt-2 text-3xl font-black text-slate-800 dark:text-white">
						{dkk(data.totals.valueDkk)}
					</p>
					<p class="mt-1 text-sm text-slate-400">{usd(data.totals.valueDkk / data.fxRate)}</p>
				</div>
				<div
					class="rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
				>
					<p class="text-xs font-bold tracking-widest text-slate-400 uppercase">
						Urealiseret afkast
					</p>
					<p class="mt-2 text-3xl font-black {gainClass(data.totals.gainDkk)}">
						{dkk(data.totals.gainDkk)}
					</p>
					<p class="mt-1 text-sm {gainClass(data.totals.gainDkk)}">{pct(data.totals.gainPct)}</p>
				</div>
				<div
					class="rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
				>
					<p class="text-xs font-bold tracking-widest text-slate-400 uppercase">Kostpris</p>
					<p class="mt-2 text-3xl font-black text-slate-800 dark:text-white">
						{dkk(data.totals.costDkk)}
					</p>
					<p class="mt-1 text-sm text-slate-400">Inkl. gebyrer</p>
				</div>
				<div
					class="rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
				>
					<p class="text-xs font-bold tracking-widest text-slate-400 uppercase">I dag</p>
					<p class="mt-2 text-3xl font-black {gainClass(data.dayChange.dkk)}">
						{dkk(data.dayChange.dkk)}
					</p>
					<p class="mt-1 text-sm {gainClass(data.dayChange.dkk)}">{pct(data.dayChange.pct)}</p>
				</div>
			</section>

			<!-- PERFORMANCE-BAR -->
			<section
				class="rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
			>
				<h3 class="mb-6 text-sm font-bold text-slate-800 dark:text-white">
					Hvor står vi mod scenarierne (dec. 2026)?
				</h3>
				<div
					class="relative mt-10 mb-8 h-3 rounded-full bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-500"
				>
					{#each data.scenarioBands as band}
						<div class="absolute top-0 -translate-x-1/2" style="left: {posPct(band.valueDkk)}%">
							<div class="h-3 w-0.5 bg-slate-700/40 dark:bg-white/40"></div>
							<div
								class="mt-1 -translate-x-1/2 text-center text-[10px] whitespace-nowrap text-slate-500 dark:text-slate-400"
							>
								<div class="font-bold">{band.label}</div>
								<div>{dkk(band.valueDkk)}</div>
							</div>
						</div>
					{/each}
					<!-- DU ER HER -->
					<div class="absolute -top-9 -translate-x-1/2" style="left: {currentPos}%">
						<div
							class="rounded-lg bg-indigo-500 px-2 py-1 text-[10px] font-bold whitespace-nowrap text-white shadow-lg"
						>
							DU ER HER · {dkk(data.totals.valueDkk)}
						</div>
						<div class="mx-auto h-3 w-1 bg-indigo-500"></div>
					</div>
				</div>
			</section>

			<!-- PORTEFØLJETABEL -->
			<section
				class="overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
			>
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead
							class="border-b border-slate-200/50 text-xs tracking-wider text-slate-400 uppercase dark:border-white/10"
						>
							<tr>
								<th class="px-5 py-4">Aktie</th>
								<th class="px-5 py-4 text-right">Antal</th>
								<th class="px-5 py-4 text-right">Kurs (USD)</th>
								<th class="px-5 py-4 text-right">I dag</th>
								<th class="px-5 py-4 text-right">Værdi</th>
								<th class="px-5 py-4 text-right">Afkast</th>
								<th class="px-5 py-4 text-right">P/E</th>
								<th class="px-5 py-4">Tese</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 dark:divide-white/5">
							{#each data.positions as p}
								<tr class="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5">
									<td class="px-5 py-4">
										<div class="flex items-center gap-2">
											<span class="font-bold text-slate-800 dark:text-white">{p.ticker}</span>
											{#if p.isStale && data.marketOpen}
												<span
													class="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400"
													title="Kursen er ikke opdateret for nylig">stale</span
												>
											{/if}
										</div>
										<div class="text-xs text-slate-400">{p.name}</div>
									</td>
									<td class="px-5 py-4 text-right tabular-nums">{p.shares}</td>
									<td class="px-5 py-4 text-right tabular-nums">
										{p.currentPriceUsd !== null ? usd(p.currentPriceUsd) : '–'}
									</td>
									<td
										class="px-5 py-4 text-right tabular-nums {p.dayChangePct !== null
											? gainClass(p.dayChangePct)
											: ''}"
									>
										{p.dayChangePct !== null ? pct(p.dayChangePct) : '–'}
									</td>
									<td
										class="px-5 py-4 text-right font-medium text-slate-800 tabular-nums dark:text-slate-100"
									>
										{dkk(p.valueDkk)}
									</td>
									<td class="px-5 py-4 text-right tabular-nums {gainClass(p.gainDkk)}">
										<div class="font-medium">{dkk(p.gainDkk)}</div>
										<div class="text-xs">{pct(p.gainPct)}</div>
									</td>
									<td class="px-5 py-4 text-right text-slate-500 tabular-nums dark:text-slate-400">
										{p.peTrailing ? p.peTrailing.toFixed(0) : '–'}
									</td>
									<td class="px-5 py-4">
										<span
											class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium {thesisBadge[
												p.thesisStatus
											].cls}"
											title={p.breakThesisSignal}
										>
											{thesisBadge[p.thesisStatus].icon}
											{thesisBadge[p.thesisStatus].label}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			<!-- KONCENTRATION + GRAFER -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<section
					class="flex flex-col rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
				>
					<h3 class="mb-1 text-sm font-bold text-slate-800 dark:text-white">Allokering</h3>
					<p class="mb-4 text-xs text-slate-400">
						Største position: {data.concentration.largestTicker} ({pct(
							data.concentration.largestWeight
						)}) · koncentration (HHI): {data.concentration.hhi.toFixed(2)}
						{#if data.concentration.hhi > 0.4 || data.concentration.largestWeight > 0.35}
							<span class="font-bold text-amber-600 dark:text-amber-400">
								⚠️ høj koncentration</span
							>
						{/if}
					</p>
					{#key isDarkMode}
						<div use:chart={donutOptions} class="w-full"></div>
					{/key}
				</section>

				<section
					class="flex flex-col rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
				>
					<h3 class="mb-4 text-sm font-bold text-slate-800 dark:text-white">
						Udvikling: værdi vs. kostpris
					</h3>
					{#if data.history.dates.length > 1}
						{#key isDarkMode}
							<div use:chart={areaOptions} class="-ml-2 w-full flex-1"></div>
						{/key}
					{:else}
						<div
							class="flex flex-1 items-center justify-center py-12 text-center text-sm text-slate-400"
						>
							Historik bygges, når der er mindst to dage med slutkurser i databasen.
						</div>
					{/if}
				</section>
			</div>

			<!-- HANDELSHISTORIK -->
			<section
				class="rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
			>
				<button
					onclick={() => (showHistory = !showHistory)}
					class="flex w-full items-center justify-between text-sm font-bold text-slate-800 dark:text-white"
				>
					<span>Handelshistorik ({data.transactions.length})</span>
					<span class="text-slate-400">{showHistory ? '▲' : '▼'}</span>
				</button>
				{#if showHistory}
					<div class="mt-4 overflow-x-auto">
						<table class="w-full text-left text-sm">
							<thead
								class="border-b border-slate-200/50 text-xs tracking-wider text-slate-400 uppercase dark:border-white/10"
							>
								<tr>
									<th class="px-3 py-2">Dato</th>
									<th class="px-3 py-2">Aktie</th>
									<th class="px-3 py-2">Type</th>
									<th class="px-3 py-2 text-right">Antal</th>
									<th class="px-3 py-2 text-right">Kurs (USD)</th>
									<th class="px-3 py-2 text-right">FX</th>
									<th class="px-3 py-2 text-right">Gebyrer</th>
									<th class="px-3 py-2"></th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-100 dark:divide-white/5">
								{#each data.transactions as t}
									<tr>
										<td class="px-3 py-2 tabular-nums">{dateFmt(t.date)}</td>
										<td class="px-3 py-2 font-bold text-slate-800 dark:text-white">{t.ticker}</td>
										<td class="px-3 py-2">
											<span
												class="rounded px-1.5 py-0.5 text-xs font-bold {t.type === 'BUY'
													? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
													: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}"
												>{t.type === 'BUY' ? 'Køb' : 'Salg'}</span
											>
										</td>
										<td class="px-3 py-2 text-right tabular-nums">{t.shares}</td>
										<td class="px-3 py-2 text-right tabular-nums">{usd(t.priceUsd)}</td>
										<td class="px-3 py-2 text-right tabular-nums">{t.rateDkkUsd.toFixed(2)}</td>
										<td class="px-3 py-2 text-right text-slate-400 tabular-nums">
											{dkk(t.brokerageDkk + t.exchangeFeeDkk)}
										</td>
										<td class="px-3 py-2 text-right">
											<form method="POST" action="?/deleteTransaction" use:enhance>
												<input type="hidden" name="id" value={t.id} />
												<button
													type="submit"
													class="text-xs text-slate-400 transition-colors hover:text-rose-500"
													title="Slet handel">✕</button
												>
											</form>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		{/if}
	</div>

	<!-- MODAL: TILFØJ HANDEL -->
	{#if showAddTx}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
		>
			<div
				class="w-full max-w-lg rounded-3xl border border-slate-200/50 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-800"
			>
				<h2 class="mb-4 text-lg font-bold text-slate-800 dark:text-white">Tilføj handel</h2>
				<form
					method="POST"
					action="?/addTransaction"
					use:enhance={() =>
						async ({ result, update }) => {
							await update();
							if (result.type === 'success') showAddTx = false;
						}}
					class="space-y-4"
				>
					<div class="grid grid-cols-2 gap-4">
						<label class="block text-sm">
							<span class="mb-1 block font-medium text-slate-600 dark:text-slate-300">Aktie</span>
							<select
								name="stockId"
								bind:value={txStockId}
								class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-700"
							>
								{#each data.stockOptions as opt}
									<option value={opt.id}>{opt.ticker} — {opt.name}</option>
								{/each}
							</select>
						</label>
						<label class="block text-sm">
							<span class="mb-1 block font-medium text-slate-600 dark:text-slate-300">Type</span>
							<select
								name="type"
								bind:value={txType}
								class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-700"
							>
								<option value="BUY">Køb</option>
								<option value="SELL">Salg</option>
							</select>
						</label>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<label class="block text-sm">
							<span class="mb-1 block font-medium text-slate-600 dark:text-slate-300">Dato</span>
							<input
								type="date"
								name="date"
								bind:value={txDate}
								max={today}
								class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-700"
							/>
						</label>
						<label class="block text-sm">
							<span class="mb-1 block font-medium text-slate-600 dark:text-slate-300">Antal</span>
							<input
								type="text"
								name="shares"
								bind:value={txShares}
								inputmode="decimal"
								placeholder="2"
								class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-700"
							/>
						</label>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<label class="block text-sm">
							<span class="mb-1 block font-medium text-slate-600 dark:text-slate-300"
								>Kurs (USD)</span
							>
							<input
								type="text"
								name="priceUsd"
								bind:value={txPrice}
								inputmode="decimal"
								placeholder="146,09"
								class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-700"
							/>
						</label>
						<label class="block text-sm">
							<span class="mb-1 block font-medium text-slate-600 dark:text-slate-300">USD/DKK</span>
							<input
								type="text"
								name="rateDkkUsd"
								bind:value={txRate}
								inputmode="decimal"
								placeholder="6,44"
								class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-700"
							/>
						</label>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<label class="block text-sm">
							<span class="mb-1 block font-medium text-slate-600 dark:text-slate-300"
								>Kurtage (DKK)</span
							>
							<input
								type="text"
								name="brokerageDkk"
								bind:value={txBrokerage}
								inputmode="decimal"
								class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-700"
							/>
						</label>
						<label class="block text-sm">
							<span class="mb-1 block font-medium text-slate-600 dark:text-slate-300"
								>Valutaveksling (DKK)</span
							>
							<input
								type="text"
								name="exchangeFeeDkk"
								bind:value={txExchangeFee}
								inputmode="decimal"
								placeholder="auto: 0,25 %"
								class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-700"
							/>
						</label>
					</div>
					{#if previewCost !== null}
						<p class="text-sm text-slate-500 dark:text-slate-400">
							Beregnet {txType === 'BUY' ? 'kostpris' : 'handelssum'}:
							<span class="font-bold text-slate-800 dark:text-white">{dkk(previewCost)}</span>
						</p>
					{/if}
					<div class="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onclick={() => (showAddTx = false)}
							class="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white"
							>Annullér</button
						>
						<button
							type="submit"
							class="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-600"
							>Gem handel</button
						>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- MODAL: NY AKTIE -->
	{#if showAddStock}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
		>
			<div
				class="w-full max-w-lg rounded-3xl border border-slate-200/50 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-800"
			>
				<h2 class="mb-1 text-lg font-bold text-slate-800 dark:text-white">Ny aktie</h2>
				<p class="mb-4 text-xs text-slate-400">
					Kurser og nøgletal hentes automatisk ved næste synkronisering.
				</p>
				<form
					method="POST"
					action="?/addStock"
					use:enhance={() =>
						async ({ result, update }) => {
							await update();
							if (result.type === 'success') showAddStock = false;
						}}
					class="space-y-4"
				>
					<div class="grid grid-cols-2 gap-4">
						<label class="block text-sm">
							<span class="mb-1 block font-medium text-slate-600 dark:text-slate-300">Ticker</span>
							<input
								type="text"
								name="ticker"
								placeholder="ALAB"
								class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 uppercase dark:border-white/10 dark:bg-slate-700"
							/>
						</label>
						<label class="block text-sm">
							<span class="mb-1 block font-medium text-slate-600 dark:text-slate-300">Navn</span>
							<input
								type="text"
								name="name"
								placeholder="Astera Labs"
								class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-700"
							/>
						</label>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<label class="block text-sm">
							<span class="mb-1 block font-medium text-slate-600 dark:text-slate-300">Sektor</span>
							<input
								type="text"
								name="sector"
								placeholder="Semiconductors"
								class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-700"
							/>
						</label>
						<label class="block text-sm">
							<span class="mb-1 block font-medium text-slate-600 dark:text-slate-300">Tema</span>
							<input
								type="text"
								name="theme"
								placeholder="AI Connectivity"
								class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-700"
							/>
						</label>
					</div>
					<label class="block text-sm">
						<span class="mb-1 block font-medium text-slate-600 dark:text-slate-300"
							>Investeringstese</span
						>
						<textarea
							name="investmentThesis"
							rows="2"
							class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-700"
						></textarea>
					</label>
					<label class="block text-sm">
						<span class="mb-1 block font-medium text-slate-600 dark:text-slate-300"
							>Tesebrud-signal (sælg hvis…)</span
						>
						<textarea
							name="breakThesisSignal"
							rows="2"
							class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-700"
						></textarea>
					</label>
					<div class="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onclick={() => (showAddStock = false)}
							class="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white"
							>Annullér</button
						>
						<button
							type="submit"
							class="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-600"
							>Opret aktie</button
						>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
