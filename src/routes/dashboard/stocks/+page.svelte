<script lang="ts">
	import { chart } from '$lib/actions/apexcharts';
	import { enhance } from '$app/forms';
	import { verdictMeta, thesisStatusMeta, scopeLabel } from '$lib/stocks/glossary';
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	let { data, form } = $props();

	let isDarkMode = $state(false);

	// CRUD-modaler (Sprint 9.5)
	let showAddTx = $state(false);
	let showAddStock = $state(false);
	let showHistory = $state(false);
	let isSyncing = $state(false);
	let analysisBusy = $state<string | null>(null);
	let showAnalysisHistory = $state(false);
	let openAnalysisId = $state<string | null>(null);

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

	const dateTimeFmt = (d: string | Date | null) =>
		d
			? new Intl.DateTimeFormat('da-DK', {
					dateStyle: 'medium',
					timeStyle: 'short'
				}).format(new Date(d))
			: '–';

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

	const latestAnalysis = $derived(data.analyses[0] ?? null);

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
			cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
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
				<div class="flex flex-wrap items-center justify-end gap-2">
					<form method="POST" action="?/checkCostAlerts" use:enhance class="inline">
						<input type="hidden" name="force" value="true" />
						<button
							type="submit"
							class="rounded-xl border border-indigo-200/80 bg-white/80 px-4 py-2 text-sm font-bold text-indigo-600 shadow-sm backdrop-blur-xl transition-all hover:scale-[1.02] hover:bg-indigo-50 active:scale-[0.98] dark:border-indigo-500/30 dark:bg-slate-800/80 dark:text-indigo-400 dark:hover:bg-slate-800"
							title="Send en notifikation til Telegram med aktier nær deres kostpris (inden for 200 kr.)"
						>
							📱 Telegram tjek
						</button>
					</form>
					<form
						method="POST"
						action="?/syncPrices"
						use:enhance={() => {
							isSyncing = true;
							return async ({ update }) => {
								await update();
								isSyncing = false;
							};
						}}
						class="inline"
					>
						<button
							type="submit"
							disabled={isSyncing}
							class="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm backdrop-blur-xl transition-all hover:scale-[1.02] hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800"
							title="Hent de nyeste live-kurser fra Yahoo Finance"
						>
							<span class="inline-block {isSyncing ? 'animate-spin' : ''}">🔄</span>
							{isSyncing ? 'Opdaterer...' : 'Opdater priser'}
						</button>
					</form>
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
				<div
					class="flex flex-col items-end gap-1 text-right text-xs text-slate-400 dark:text-slate-500"
				>
					<div class="flex flex-wrap items-center justify-end gap-2">
						{#if data.marketOpen}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
								title="USA's aktiemarked er åbent lige nu"
							>
								<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
								🟢 US-marked åbent
							</span>
						{:else}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-500/20 dark:text-slate-400"
								title="USA's aktiemarked er lukket lige nu"
							>
								<span class="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
								🔒 US-marked lukket
							</span>
						{/if}
						<span class="text-slate-300 dark:text-slate-700">|</span>
						<span>
							USD/DKK: <span class="font-bold text-slate-600 dark:text-slate-300"
								>{data.fxRate.toFixed(2)}</span
							>
						</span>
					</div>
					<div>
						Kurser opdateret: {dateTimeFmt(data.lastSyncedAt)}
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

		{#if form?.alertResult}
			<div
				class="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-medium text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
			>
				{#if form.alertResult.nearCostPriceCount > 0}
					🎯 <strong>{form.alertResult.nearCostPriceCount} aktie(r) nær kostpris</strong> (inden for
					200 kr.).
					{#if form.alertResult.telegramResult?.success}
						Notifikation sendt til Telegram for: <strong
							>{form.alertResult.alertsSent.join(', ')}</strong
						>.
					{:else if form.alertResult.telegramResult?.error}
						Fejl ved afsendelse til Telegram: {form.alertResult.telegramResult.error}
					{:else}
						Telegram-notifikation allerede sendt (cooldown aktiv).
					{/if}
				{:else}
					ℹ️ Ingen aktier er inden for 200 kr. af deres kostpris lige nu.
				{/if}
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
					class="relative mt-10 mb-8 h-3 rounded-full bg-gradient-to-r from-rose-400 via-yellow-400 to-emerald-500"
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
								<th class="px-5 py-4"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 dark:divide-white/5">
							{#each data.positions as p}
								<tr class="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5">
									<td class="px-5 py-4">
										<div class="flex items-center gap-2">
											<span class="font-bold text-slate-800 dark:text-white">{p.ticker}</span>
											{#if p.isNearCostPrice}
												<span
													class="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400"
													title="Aktuel værdi er inden for 200 kr. af kostpris!"
													>🎯 Nær kostpris</span
												>
											{/if}
											{#if p.isStale && data.marketOpen}
												<span
													class="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400"
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
									<td class="px-5 py-4">
										<form
											method="POST"
											action="?/requestStockAnalysis"
											use:enhance={() => {
												analysisBusy = p.id;
												return async ({ update }) => {
													await update();
													analysisBusy = null;
												};
											}}
										>
											<input type="hidden" name="stockId" value={p.id} />
											<button
												type="submit"
												disabled={analysisBusy !== null}
												title="Anmod om AI-analyse for {p.ticker}"
												class="rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1.5 text-sm font-bold text-slate-500 shadow-sm transition-all hover:scale-[1.02] hover:border-indigo-300 hover:text-indigo-500 active:scale-[0.98] disabled:opacity-50 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-indigo-500/40 dark:hover:text-indigo-400"
											>
												<span class="inline-block {analysisBusy === p.id ? 'animate-spin' : ''}"
													>🤖</span
												>
											</button>
										</form>
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
							<span class="font-bold text-orange-600 dark:text-orange-400">
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

			<!-- AI-ANALYSE (Sprint 9.8) -->
			<section
				class="rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
			>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h3 class="text-sm font-bold text-slate-800 dark:text-white">AI-analyse</h3>
						<p class="text-xs text-slate-400">
							Gemini vurderer porteføljen og jeres teser. Analysen gemmes i historikken.
						</p>
					</div>
					<form
						method="POST"
						action="?/requestPortfolioAnalysis"
						use:enhance={() => {
							analysisBusy = 'PORTFOLIO';
							return async ({ update }) => {
								await update();
								analysisBusy = null;
							};
						}}
					>
						<button
							type="submit"
							disabled={analysisBusy !== null}
							class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-600 disabled:opacity-50"
							title="Gemini analyserer hele porteføljen og giver en samlet vurdering"
						>
							<span class="inline-block {analysisBusy === 'PORTFOLIO' ? 'animate-spin' : ''}"
								>🤖</span
							>
							{analysisBusy === 'PORTFOLIO' ? 'Analyserer...' : 'Anmod om analyse'}
						</button>
					</form>
				</div>

				{#if latestAnalysis}
					{@const latestPositions = latestAnalysis.data?.positions ?? []}
					<div class="mt-5 space-y-5 border-t border-slate-200/50 pt-5 dark:border-white/10">
						<div class="flex flex-wrap items-center gap-2 text-xs">
							<span
								class="rounded-full bg-indigo-500/10 px-2.5 py-1 font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
							>
								{scopeLabel(latestAnalysis.scope, latestAnalysis.ticker)}
							</span>
							{#if latestAnalysis.verdict}
								<span
									class="rounded-full px-2.5 py-1 font-bold {verdictMeta[latestAnalysis.verdict]
										.badgeCls}"
								>
									{verdictMeta[latestAnalysis.verdict].icon}
									{verdictMeta[latestAnalysis.verdict].label}
								</span>
							{/if}
							<span class="text-slate-400">{dateTimeFmt(latestAnalysis.createdAt)}</span>
							{#if latestAnalysis.snapshotValueDkk !== null}
								<span class="text-slate-400">Værdi: {dkk(latestAnalysis.snapshotValueDkk)}</span>
							{/if}
							<span class="text-slate-400">{latestAnalysis.model}</span>
						</div>

						<div
							class="prose dark:prose-invert prose-slate prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-strong:text-indigo-600 dark:prose-strong:text-indigo-400 max-w-none text-sm"
						>
							{@html DOMPurify.sanitize(marked(latestAnalysis.content) as string)}
						</div>

						{#if latestPositions.length}
							<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
								{#each latestPositions as pos}
									<div
										class="rounded-2xl border border-slate-200/50 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-slate-900/40"
									>
										<div class="flex flex-wrap items-center justify-between gap-2">
											<span class="font-bold text-slate-800 dark:text-white">{pos.ticker}</span>
											<span
												class="inline-flex items-center gap-1.5"
												title="Tese: {thesisStatusMeta[pos.thesisStatus].label}"
											>
												<span
													class="h-2 w-2 rounded-full {thesisStatusMeta[pos.thesisStatus].dotCls}"
												></span>
												<span
													class="rounded-full px-2 py-0.5 text-[10px] font-bold {verdictMeta[
														pos.verdict
													].badgeCls}"
												>
													{verdictMeta[pos.verdict].label}
												</span>
											</span>
										</div>
										<p class="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
											{pos.rationale}
										</p>
										<p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
											Risiko: {pos.keyRisk}
										</p>
									</div>
								{/each}
							</div>
						{/if}

						{#if latestAnalysis.data?.portfolioRisks?.length || latestAnalysis.data?.suggestions?.length}
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								{#if latestAnalysis.data?.portfolioRisks?.length}
									<div>
										<p class="mb-2 text-xs font-bold tracking-widest text-slate-400 uppercase">
											Porteføljerisici
										</p>
										<ul
											class="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-300"
										>
											{#each latestAnalysis.data.portfolioRisks as risk}
												<li>{risk}</li>
											{/each}
										</ul>
									</div>
								{/if}
								{#if latestAnalysis.data?.suggestions?.length}
									<div>
										<p class="mb-2 text-xs font-bold tracking-widest text-slate-400 uppercase">
											Forslag
										</p>
										<ul
											class="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-300"
										>
											{#each latestAnalysis.data.suggestions as suggestion}
												<li>{suggestion}</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{:else}
					<p
						class="mt-5 border-t border-slate-200/50 pt-5 text-sm text-slate-400 dark:border-white/10"
					>
						Endnu ingen analyser. Klik på "Anmod om analyse" for at få AI'ens vurdering af
						porteføljen.
					</p>
				{/if}

				{#if data.analyses.length > 1}
					<button
						onclick={() => (showAnalysisHistory = !showAnalysisHistory)}
						class="mt-5 flex w-full items-center justify-between border-t border-slate-200/50 pt-4 text-sm font-bold text-slate-800 dark:border-white/10 dark:text-white"
					>
						<span>Tidligere analyser ({data.analyses.length - 1})</span>
						<span class="text-slate-400">{showAnalysisHistory ? '▲' : '▼'}</span>
					</button>
					{#if showAnalysisHistory}
						<div class="mt-3 space-y-2">
							{#each data.analyses.slice(1) as a}
								<div
									class="rounded-2xl border border-slate-200/50 bg-slate-50/50 dark:border-white/10 dark:bg-slate-900/40"
								>
									<button
										onclick={() => (openAnalysisId = openAnalysisId === a.id ? null : a.id)}
										class="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
									>
										<span class="flex flex-wrap items-center gap-2 text-xs">
											<span class="font-bold text-slate-700 dark:text-slate-200">
												{scopeLabel(a.scope, a.ticker)}
											</span>
											{#if a.verdict}
												<span
													class="rounded-full px-2 py-0.5 text-[10px] font-bold {verdictMeta[
														a.verdict
													].badgeCls}"
												>
													{verdictMeta[a.verdict].label}
												</span>
											{/if}
											<span class="text-slate-400">{dateTimeFmt(a.createdAt)}</span>
										</span>
										<span class="text-slate-400">{openAnalysisId === a.id ? '▲' : '▼'}</span>
									</button>
									{#if openAnalysisId === a.id}
										<div
											class="prose dark:prose-invert prose-slate prose-p:text-slate-600 dark:prose-p:text-slate-300 max-w-none border-t border-slate-200/50 px-4 py-3 text-sm dark:border-white/10"
										>
											{@html DOMPurify.sanitize(marked(a.content) as string)}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</section>

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
