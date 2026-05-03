<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { chart } from '$lib/actions/apexcharts';
	import { onMount } from 'svelte';
	import { marked } from 'marked';
	
	let { data, form } = $props();
	
	let isGenerating = $state(false);

	// ApexCharts configs
	const donutOptions = {
		chart: { type: 'donut', height: 320, background: 'transparent' },
		series: data.charts.donut.series,
		labels: data.charts.donut.labels,
		colors: data.charts.donut.colors,
		plotOptions: {
			pie: {
				donut: {
					size: '70%',
					labels: { show: true, name: { show: true }, value: { show: true } }
				}
			}
		},
		dataLabels: { enabled: false },
		stroke: { show: false },
		theme: { mode: 'light' }
	};

	const barOptions = {
		chart: { type: 'bar', height: 320, toolbar: { show: false }, background: 'transparent' },
		series: data.charts.bar.series,
		xaxis: { categories: data.charts.bar.labels },
		colors: ['#6366f1'],
		dataLabels: { enabled: false },
		grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
		theme: { mode: 'light' }
	};

	// State
	let selectedCategory = $state<string | null>(null);
	let filteredTransactions = $derived(
		selectedCategory 
			? data.recentTransactions.filter(t => (t.category?.name || 'Ukategoriseret') === selectedCategory)
			: data.recentTransactions
	);

	let fromDate = $state(data.currentFilter.from);
	let toDate = $state(data.currentFilter.to);
	let isDarkMode = $state(false);

	const formatCur = (val: number) => new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(Math.abs(val));
	const formatDate = (date: string | Date) => new Intl.DateTimeFormat('da-DK', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));

	onMount(() => {
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.attributeName === 'class') {
					isDarkMode = document.documentElement.classList.contains('dark');
					donutOptions.theme.mode = isDarkMode ? 'dark' : 'light';
					barOptions.theme.mode = isDarkMode ? 'dark' : 'light';
					donutOptions.grid = { borderColor: isDarkMode ? '#334155' : '#e2e8f0' };
					barOptions.grid = { borderColor: isDarkMode ? '#334155' : '#e2e8f0' };
				}
			});
		});
		observer.observe(document.documentElement, { attributes: true });
		isDarkMode = document.documentElement.classList.contains('dark');
	});

	// Date Shortcuts
	function setShortcut(type: 'this_month' | 'prev_month' | 'this_year' | 'all') {
		const now = new Date();
		let from, to;
		let newAiPeriod = data.aiPeriod;

		if (type === 'this_month') {
			from = new Date(now.getFullYear(), now.getMonth(), 1);
			to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
			newAiPeriod = 'CURRENT_MONTH';
		} else if (type === 'prev_month') {
			from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			to = new Date(now.getFullYear(), now.getMonth(), 0);
			newAiPeriod = 'LAST_MONTH';
		} else if (type === 'this_year') {
			from = new Date(now.getFullYear(), 0, 1);
			to = new Date(now.getFullYear(), 11, 31);
			newAiPeriod = 'CURRENT_YEAR';
		} else {
			from = new Date(2000, 0, 1); // "All time"
			to = new Date(now.getFullYear() + 1, 0, 1);
		}

		fromDate = from.toISOString().split('T')[0];
		toDate = to.toISOString().split('T')[0];
		applyFilter(newAiPeriod);
	}

	function applyFilter(aiPeriod = data.aiPeriod) {
		goto(`?from=${fromDate}&to=${toDate}&aiPeriod=${aiPeriod}`, { keepFocus: true });
	}

</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 md:p-12 font-sans transition-colors duration-300">
	<div class="max-w-7xl mx-auto space-y-6 md:space-y-8">
		
		<header class="flex flex-col md:flex-row md:justify-between md:items-end border-b border-slate-200 dark:border-slate-800 pb-4 md:pb-6">
			<div>
				<h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500 dark:from-indigo-400 dark:to-sky-300">Analytics Dashboard</h1>
				<p class="text-slate-500 dark:text-slate-400 mt-2">Dybdegående analyse af dine vaner og drømme.</p>
			</div>
			<div class="mt-4 md:mt-0">
				<a href="/" class="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl font-bold text-sm shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
					← Tilbage til Brønden
				</a>
			</div>
		</header>

		<!-- Control Panel (Date Filter) -->
		<section class="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-xs font-bold text-slate-400 uppercase mr-2">Hurtigvalg:</span>
				<button onclick={() => setShortcut('this_month')} class="px-3 py-1.5 text-sm font-semibold rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors">Denne Måned</button>
				<button onclick={() => setShortcut('prev_month')} class="px-3 py-1.5 text-sm font-semibold rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Forrige Måned</button>
				<button onclick={() => setShortcut('this_year')} class="px-3 py-1.5 text-sm font-semibold rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Dette År</button>
				<button onclick={() => setShortcut('all')} class="px-3 py-1.5 text-sm font-semibold rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Altid</button>
			</div>
			
			<div class="flex flex-wrap items-center gap-3">
				<div class="flex items-center gap-2">
					<label for="from" class="text-xs font-bold text-slate-400 uppercase">Fra:</label>
					<input type="date" id="from" bind:value={fromDate} class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500">
				</div>
				<div class="flex items-center gap-2">
					<label for="to" class="text-xs font-bold text-slate-400 uppercase">Til:</label>
					<input type="date" id="to" bind:value={toDate} class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500">
				</div>
				<button onclick={applyFilter} class="px-4 py-1.5 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition-colors shadow-sm ml-auto xl:ml-0">
					Opdater
				</button>
			</div>
		</section>

		<!-- KPIs -->
		<section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center relative overflow-hidden">
				<div class="absolute right-0 top-0 h-full w-2 bg-indigo-500"></div>
				<p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Samlet Forbrug</p>
				<p class="text-3xl font-black text-slate-800 dark:text-white">{formatCur(data.kpis.periodExpenses)}</p>
				<p class="text-[10px] text-slate-500 mt-1 font-medium">I den valgte periode ({data.currentFilter.daysInPeriod} dage)</p>
			</div>
			
			<div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
				<p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Dagligt Gennemsnit</p>
				<p class="text-3xl font-black text-slate-800 dark:text-white">{formatCur(data.kpis.avgDailySpend)}</p>
				<p class="text-[10px] text-slate-500 mt-1 font-medium">Hvad du brænder af hver dag</p>
			</div>

			<div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
				<p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Største Udgiftspost</p>
				<p class="text-xl md:text-2xl font-black text-slate-800 dark:text-white truncate">{data.kpis.topCategoryName}</p>
				<p class="text-[10px] text-slate-500 mt-1 font-medium">Den kategori der trækker mest</p>
			</div>

			<div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
				<p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Dyreste Transaktion</p>
				<p class="text-xl font-black text-rose-500 dark:text-rose-400 truncate" title={data.kpis.largestTransaction.text}>{formatCur(data.kpis.largestTransaction.amount)}</p>
				<p class="text-[10px] text-slate-500 mt-1 font-medium truncate">"{data.kpis.largestTransaction.text}"</p>
			</div>
		</section>

		<!-- AI Financial Advisor -->
		<section class="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 md:p-8 rounded-3xl shadow-xl text-white relative overflow-hidden border border-indigo-500/30">
			<div class="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500 opacity-20 rounded-full blur-3xl pointer-events-none"></div>
			
			<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative z-10">
				<div>
					<h2 class="text-xl md:text-2xl font-bold flex items-center gap-3">
						<span class="text-3xl">🤖</span> Din Formuerådgiver
					</h2>
					<p class="text-indigo-200 mt-1 text-sm">Få personlig økonomisk indsigt baseret på dine data via Google Gemini AI.</p>
				</div>
				
				<div class="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
					<button onclick={() => goto(`?from=${fromDate}&to=${toDate}&aiPeriod=CURRENT_MONTH`, { keepFocus: true })} class="px-4 py-2 text-xs font-bold rounded-lg transition-colors {data.aiPeriod === 'CURRENT_MONTH' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}">
						Denne Måned
					</button>
					<button onclick={() => goto(`?from=${fromDate}&to=${toDate}&aiPeriod=LAST_MONTH`, { keepFocus: true })} class="px-4 py-2 text-xs font-bold rounded-lg transition-colors {data.aiPeriod === 'LAST_MONTH' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}">
						Forrige Måned
					</button>
					<button onclick={() => goto(`?from=${fromDate}&to=${toDate}&aiPeriod=CURRENT_YEAR`, { keepFocus: true })} class="px-4 py-2 text-xs font-bold rounded-lg transition-colors {data.aiPeriod === 'CURRENT_YEAR' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}">
						Dette År
					</button>
				</div>
			</div>

			<div class="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 relative z-10">
				{#if form?.error}
					<div class="mb-6 p-4 bg-red-500/20 text-red-200 rounded-xl border border-red-500/30 text-sm">{form.error}</div>
				{/if}

				{#if data.aiInsight}
					<div class="prose prose-invert prose-indigo max-w-none prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-indigo-300 text-sm md:text-base">
						{@html marked(data.aiInsight.content)}
					</div>
					<div class="mt-8 flex justify-between items-center border-t border-white/10 pt-4">
						<span class="text-xs text-slate-400">Sidst opdateret: {new Intl.DateTimeFormat('da-DK', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(data.aiInsight.updatedAt))}</span>
						
						<form method="POST" action="?/generateInsight" use:enhance={() => {
							isGenerating = true;
							return async ({ update }) => {
								await update();
								isGenerating = false;
							};
						}} onsubmit={(e) => {
							if (!confirm('Advarsel: Dette vil overskrive din nuværende analyse og generere en ny via AI. Er du sikker?')) {
								e.preventDefault();
							}
						}}>
							<input type="hidden" name="period" value={data.aiPeriod} />
							<button type="submit" disabled={isGenerating} class="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-400/30 text-indigo-200 text-xs font-bold rounded-lg transition-all flex items-center gap-2">
								{#if isGenerating} ⏳ Genererer... {:else} 🔄 Opdater Analyse {/if}
							</button>
						</form>
					</div>
				{:else}
					<div class="text-center py-8">
						<div class="text-5xl mb-4 opacity-50">🧠</div>
						<p class="text-slate-300 mb-6 max-w-md mx-auto">Der er ikke genereret en analyse for denne periode endnu. Klik på knappen herunder for at lade AI'en dykke ned i dine tal.</p>
						
						<form method="POST" action="?/generateInsight" use:enhance={() => {
							isGenerating = true;
							return async ({ update }) => {
								await update();
								isGenerating = false;
							};
						}}>
							<input type="hidden" name="period" value={data.aiPeriod} />
							<button type="submit" disabled={isGenerating} class="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95">
								{#if isGenerating} ⏳ Analyserer Data... {:else} ✨ Generer Analyse via AI {/if}
							</button>
						</form>
					</div>
				{/if}
			</div>
		</section>

		<!-- Visualizations & Top 3 -->
		<section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 lg:col-span-1 flex flex-col">
				<h3 class="text-sm font-bold text-slate-800 dark:text-white mb-4">Forbrugsfordeling (Klik for at filtrere)</h3>
				{#if data.charts.donut.series.length > 0}
					{#key isDarkMode}
						<div use:chart={{...donutOptions, theme: { mode: isDarkMode ? 'dark' : 'light' }, chart: { ...donutOptions.chart, events: {
							dataPointSelection: (event, chartContext, config) => {
								const cat = data.charts.donut.labels[config.dataPointIndex];
								selectedCategory = selectedCategory === cat ? null : cat;
							}
						}}}} class="w-full"></div>
					{/key}
					
					<!-- Top 3 Categories List -->
					<div class="mt-auto pt-6 border-t border-slate-100 dark:border-slate-700/50 space-y-3">
						<h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dine top 3 kategorier</h4>
						{#each data.top3Categories as cat}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 rounded-full" style="background-color: {cat.color || '#94a3b8'}"></div>
									<span class="text-sm font-medium text-slate-700 dark:text-slate-300">{cat.name}</span>
								</div>
								<div class="flex items-center gap-3">
									<span class="text-xs font-bold text-slate-500 dark:text-slate-400">{formatCur(cat.amount)}</span>
									<span class="text-xs font-black bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 w-12 text-right">{cat.percentage}%</span>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="h-64 flex items-center justify-center text-slate-400">Ingen data for denne periode</div>
				{/if}
			</div>

			<div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 lg:col-span-2 flex flex-col">
				<h3 class="text-sm font-bold text-slate-800 dark:text-white mb-4">
					Udvikling over tid 
					<span class="text-xs font-medium text-slate-500 font-normal ml-2">
						(Grupperet {data.currentFilter.daysInPeriod <= 31 ? 'dagligt' : data.currentFilter.daysInPeriod <= 90 ? 'ugentligt' : 'månedligt'})
					</span>
				</h3>
				{#if data.charts.bar.series[0].data.length > 0}
					{#key isDarkMode}
						<div use:chart={{...barOptions, theme: { mode: isDarkMode ? 'dark' : 'light' }, grid: { borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}} class="w-full flex-1"></div>
					{/key}
				{:else}
					<div class="flex-1 flex items-center justify-center text-slate-400">Ingen data for denne periode</div>
				{/if}
			</div>
		</section>

		<!-- Wishbuy Cross-over Feature -->
		{#if data.topWish && data.kpis.guiltyPleasureSpending > 0}
			{@const wishPct = Math.min(100, (data.kpis.guiltyPleasureSpending / data.topWish.price) * 100)}
			<section class="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 md:p-8 rounded-3xl shadow-lg text-white relative overflow-hidden">
				<div class="absolute -right-10 -top-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
				<h2 class="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">🎯 Reality Check</h2>
				<p class="text-indigo-100 text-lg mb-6 leading-relaxed max-w-3xl">
					I den valgte periode har du brugt <strong>{formatCur(data.kpis.guiltyPleasureSpending)}</strong> på <span class="bg-white/20 px-2 py-0.5 rounded font-bold">{data.kpis.guiltyPleasureName}</span>.<br>
					Det svarer til <strong class="text-2xl text-amber-300">{Math.round(wishPct)}%</strong> af dit største ønske: <strong>{data.topWish.title}</strong>!
				</p>
				
				<div class="w-full bg-indigo-900/50 rounded-full h-4 mb-2 overflow-hidden shadow-inner">
					<div class="bg-gradient-to-r from-amber-300 to-amber-400 h-4 rounded-full transition-all duration-1000" style="width: {wishPct}%"></div>
				</div>
				<div class="flex justify-between text-xs font-bold text-indigo-200">
					<span>0 DKK</span>
					<span>{formatCur(data.topWish.price)}</span>
				</div>
			</section>
		{/if}

		<!-- Drill Down Table -->
		<section class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
			<div class="flex justify-between items-center mb-6">
				<h3 class="text-sm font-bold text-slate-800 dark:text-white">Seneste Transaktioner i perioden</h3>
				{#if selectedCategory}
					<button onclick={() => selectedCategory = null} class="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-200 transition-colors">
						Fjern filter: {selectedCategory} ✕
					</button>
				{/if}
			</div>
			
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-700">
						<tr>
							<th class="px-4 py-3">Dato</th>
							<th class="px-4 py-3">Tekst</th>
							<th class="px-4 py-3">Kategori</th>
							<th class="px-4 py-3 text-right">Beløb</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredTransactions as tx}
							<tr class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
								<td class="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(tx.date)}</td>
								<td class="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{tx.text}</td>
								<td class="px-4 py-3">
									<span class="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
										{tx.category?.name || 'Ukategoriseret'}
									</span>
								</td>
								<td class="px-4 py-3 text-right font-bold {tx.amount < 0 ? 'text-slate-800 dark:text-white' : 'text-emerald-500 dark:text-emerald-400'}">
									{tx.amount < 0 ? formatCur(tx.amount) : '+' + formatCur(tx.amount)}
								</td>
							</tr>
						{/each}
						{#if filteredTransactions.length === 0}
							<tr>
								<td colspan="4" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Ingen transaktioner at vise.</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</section>

	</div>
</div>
