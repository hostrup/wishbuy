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
		chart: { type: 'donut', height: 450, background: 'transparent' },
		series: data.charts.donut.series,
		labels: data.charts.donut.labels,
		colors: data.charts.donut.colors,
		plotOptions: {
			pie: {
				donut: {
					size: '75%',
					labels: { 
						show: true, 
						name: { show: true, fontSize: '22px', fontWeight: 700 }, 
						value: { 
							show: true,
							fontSize: '28px',
							fontWeight: 900,
							formatter: function(val: number) { return Math.round(val) + ' kr'; }
						} 
					}
				}
			}
		},
		dataLabels: { enabled: false },
		tooltip: {
			y: { formatter: function(val: number) { return Math.round(val) + ' kr'; } }
		},
		stroke: { show: true, colors: ['#ffffff'], width: 2 },
		theme: { mode: 'light' }
	};

	const barOptions = {
		chart: { type: 'bar', height: 350, toolbar: { show: false }, background: 'transparent' },
		series: data.charts.bar.series,
		xaxis: { categories: data.charts.bar.labels },
		colors: ['#6366f1'],
		dataLabels: { enabled: false },
		tooltip: {
			y: { formatter: function(val: number) { return Math.round(val) + ' kr'; } }
		},
		grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
		theme: { mode: 'light' }
	};

	const cumulativeOptions = {
		chart: { type: 'area', height: 350, toolbar: { show: false }, background: 'transparent' },
		series: data.charts.cumulative.series,
		xaxis: { categories: data.charts.cumulative.labels, type: 'datetime' },
		colors: ['#10b981'],
		fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 90, 100] } },
		dataLabels: { enabled: false },
		stroke: { curve: 'smooth', width: 3 },
		tooltip: {
			x: { format: 'dd MMM yyyy' },
			y: { formatter: function(val: number) { return Math.round(val) + ' kr'; } }
		},
		grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
		theme: { mode: 'light' }
	};

	const dayOfWeekOptions = {
		chart: { type: 'radar', height: 350, toolbar: { show: false }, background: 'transparent' },
		series: data.charts.dayOfWeek.series,
		labels: data.charts.dayOfWeek.labels,
		colors: ['#f43f5e'],
		stroke: { width: 2 },
		fill: { opacity: 0.2 },
		markers: { size: 4 },
		tooltip: {
			y: { formatter: function(val: number) { return Math.round(val) + ' kr'; } }
		},
		theme: { mode: 'light' }
	};

	// State
	let selectedCategory = $state<string | null>(null);
	let searchQuery = $state('');
	let showOnlyUncategorized = $state(false);
	
	let sortColumn = $state<'date' | 'text' | 'category' | 'amount'>('date');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	function toggleSort(col: typeof sortColumn) {
		if (sortColumn === col) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = col;
			sortDirection = col === 'date' || col === 'amount' ? 'desc' : 'asc';
		}
	}

	let filteredTransactions = $derived.by(() => {
		let result = data.recentTransactions;
		if (selectedCategory) {
			result = result.filter(t => (t.category?.name || 'Ukategoriseret') === selectedCategory);
		}
		if (showOnlyUncategorized) {
			result = result.filter(t => {
				if (!t.categoryId) return true;
				const name = t.category?.name?.toLowerCase() || '';
				return name.includes('ukendt') || name.includes('ukategoriseret');
			});
		}
		if (searchQuery.trim() !== '') {
			const q = searchQuery.toLowerCase();
			result = result.filter(t => t.text.toLowerCase().includes(q) || (t.category?.name || 'Ukategoriseret').toLowerCase().includes(q));
		}
		
		return [...result].sort((a, b) => {
			let valA, valB;
			if (sortColumn === 'date') { valA = new Date(a.date).getTime(); valB = new Date(b.date).getTime(); }
			else if (sortColumn === 'text') { valA = a.text; valB = b.text; }
			else if (sortColumn === 'category') { valA = a.category?.name || 'Ukategoriseret'; valB = b.category?.name || 'Ukategoriseret'; }
			else if (sortColumn === 'amount') { valA = Math.abs(a.amount); valB = Math.abs(b.amount); }
			else return 0;

			if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
			if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		});
	});

	let fromDate = $state(data.currentFilter.from);
	let toDate = $state(data.currentFilter.to);
	let isDarkMode = $state(false);

	let selectedTransactions = $state<string[]>([]);
	let groupName = $state('');

	const formatCur = (val: number) => new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(Math.abs(val));
	const formatDate = (date: string | Date) => new Intl.DateTimeFormat('da-DK', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));

	onMount(() => {
		const updateThemes = () => {
			isDarkMode = document.documentElement.classList.contains('dark');
			const mode = isDarkMode ? 'dark' : 'light';
			const gridColor = isDarkMode ? '#334155' : '#e2e8f0';
			const strokeColor = isDarkMode ? '#1e293b' : '#ffffff';

			donutOptions.theme.mode = mode;
			donutOptions.stroke.colors = [strokeColor];
			barOptions.theme.mode = mode;
			barOptions.grid = { borderColor: gridColor, strokeDashArray: 4 };
			cumulativeOptions.theme.mode = mode;
			cumulativeOptions.grid = { borderColor: gridColor, strokeDashArray: 4 };
			dayOfWeekOptions.theme.mode = mode;
		};

		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.attributeName === 'class') {
					updateThemes();
				}
			});
		});
		observer.observe(document.documentElement, { attributes: true });
		updateThemes();
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

<!-- BACKDROP & CONTAINER -->
<div class="min-h-screen bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 p-4 md:p-8 lg:p-12 font-sans transition-colors duration-300 relative">
	
	<!-- Ambient Background Glows -->
	<div class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
	<div class="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-sky-500/10 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

	<div class="max-w-7xl mx-auto space-y-8 relative z-10">
		
		<!-- HEADER -->
		<header class="flex flex-col md:flex-row md:justify-between md:items-end pb-4 border-b border-slate-200/50 dark:border-white/10">
			<div>
				<h1 class="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500 dark:from-indigo-400 dark:to-sky-300 drop-shadow-sm">Cockpit</h1>
				<p class="text-slate-500 dark:text-slate-400 mt-2 font-medium">Dit fulde overblik over forbrug, vaner og økonomi.</p>
			</div>
			<div class="mt-4 md:mt-0 flex gap-3">
				<a href="/" class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-slate-700 transition-colors">
					← Brønden
				</a>
			</div>
		</header>

		<!-- CONTROLS -->
		<section class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-5 rounded-3xl shadow-sm border border-slate-200/50 dark:border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mr-2 tracking-widest">Hurtigvalg</span>
				<button onclick={() => setShortcut('this_month')} class="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors border border-indigo-100 dark:border-indigo-500/20">Denne Måned</button>
				<button onclick={() => setShortcut('prev_month')} class="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-transparent dark:border-white/5">Forrige Måned</button>
				<button onclick={() => setShortcut('this_year')} class="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-transparent dark:border-white/5">Dette År</button>
				<button onclick={() => setShortcut('all')} class="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-transparent dark:border-white/5">Altid</button>
			</div>
			
			<div class="flex flex-wrap items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200/50 dark:border-white/5">
				<div class="flex items-center gap-2 pl-2">
					<label for="from" class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Fra:</label>
					<input type="date" id="from" bind:value={fromDate} class="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer">
				</div>
				<div class="w-px h-6 bg-slate-200 dark:bg-white/10"></div>
				<div class="flex items-center gap-2">
					<label for="to" class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Til:</label>
					<input type="date" id="to" bind:value={toDate} class="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer">
				</div>
				<button onclick={applyFilter} class="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-md hover:scale-105 transition-transform ml-auto xl:ml-2">
					Opdater
				</button>
			</div>
		</section>

		<!-- KPIS -->
		<section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-200/50 dark:border-white/10 flex flex-col justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
				<div class="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors"></div>
				<p class="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Samlet Forbrug</p>
				<p class="text-3xl md:text-4xl font-black text-slate-800 dark:text-white">{formatCur(data.kpis.periodExpenses)}</p>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">{data.currentFilter.daysInPeriod} dages periode</p>
			</div>
			
			<div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-200/50 dark:border-white/10 flex flex-col justify-center relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
				<div class="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
				<p class="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Dagligt Snit</p>
				<p class="text-3xl md:text-4xl font-black text-slate-800 dark:text-white">{formatCur(data.kpis.avgDailySpend)}</p>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Hvad du brænder af hver dag</p>
			</div>

			<div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-200/50 dark:border-white/10 flex flex-col justify-center relative overflow-hidden group hover:border-amber-500/50 transition-colors">
				<div class="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors"></div>
				<p class="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Top Kategori</p>
				<p class="text-xl md:text-2xl font-black text-slate-800 dark:text-white truncate">{data.kpis.topCategoryName}</p>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Den største slughals</p>
			</div>

			<div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-200/50 dark:border-white/10 flex flex-col justify-center relative overflow-hidden group hover:border-rose-500/50 transition-colors">
				<div class="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-colors"></div>
				<p class="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Dyreste Post</p>
				<p class="text-xl md:text-2xl font-black text-slate-800 dark:text-white truncate" title={data.kpis.largestTransaction.text}>{formatCur(data.kpis.largestTransaction.amount)}</p>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium truncate">"{data.kpis.largestTransaction.text}"</p>
			</div>
		</section>

		<!-- AI Financial Advisor & Reality Check -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- AI Advisor -->
			<section class="lg:col-span-2 bg-gradient-to-br from-slate-900 to-indigo-950 p-6 md:p-8 rounded-3xl shadow-xl text-white relative overflow-hidden border border-indigo-500/30 flex flex-col">
				<div class="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500 opacity-20 rounded-full blur-3xl pointer-events-none"></div>
				
				<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 relative z-10">
					<div>
						<h2 class="text-xl md:text-2xl font-bold flex items-center gap-3">
							<span class="text-3xl">🤖</span> Din Formuerådgiver
						</h2>
					</div>
					
					<div class="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/50 backdrop-blur-sm">
						<button onclick={() => goto(`?from=${fromDate}&to=${toDate}&aiPeriod=CURRENT_MONTH`, { keepFocus: true })} class="px-4 py-2 text-xs font-bold rounded-lg transition-colors {data.aiPeriod === 'CURRENT_MONTH' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}">
							Denne Mdr
						</button>
						<button onclick={() => goto(`?from=${fromDate}&to=${toDate}&aiPeriod=LAST_MONTH`, { keepFocus: true })} class="px-4 py-2 text-xs font-bold rounded-lg transition-colors {data.aiPeriod === 'LAST_MONTH' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}">
							Sidste Mdr
						</button>
						<button onclick={() => goto(`?from=${fromDate}&to=${toDate}&aiPeriod=CURRENT_YEAR`, { keepFocus: true })} class="px-4 py-2 text-xs font-bold rounded-lg transition-colors {data.aiPeriod === 'CURRENT_YEAR' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}">
							Året
						</button>
					</div>
				</div>

				<div class="flex-1 bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 relative z-10">
					{#if form?.error}
						<div class="mb-6 p-4 bg-red-500/20 text-red-200 rounded-xl border border-red-500/30 text-sm">{form.error}</div>
					{/if}

					{#if data.aiInsight}
						<div class="prose prose-invert prose-indigo max-w-none prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-indigo-300 text-sm md:text-base">
							{@html marked(data.aiInsight.content)}
						</div>
						<div class="mt-8 flex justify-between items-center border-t border-white/10 pt-4">
							<span class="text-xs text-slate-400">Opdateret: {new Intl.DateTimeFormat('da-DK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.aiInsight.updatedAt))}</span>
							<form method="POST" action="?/generateInsight" use:enhance={() => {
								isGenerating = true;
								return async ({ update }) => {
									await update();
									isGenerating = false;
								};
							}}>
								<input type="hidden" name="period" value={data.aiPeriod} />
								<button type="submit" disabled={isGenerating} class="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-400/30 text-indigo-200 text-xs font-bold rounded-lg transition-all flex items-center gap-2">
									{#if isGenerating} ⏳ Arbejder... {:else} 🔄 Opdater {/if}
								</button>
							</form>
						</div>
					{:else}
						<div class="text-center py-8">
							<div class="text-4xl mb-4 opacity-50">🧠</div>
							<p class="text-slate-300 mb-6 text-sm">Der er ikke genereret en analyse for denne periode endnu.</p>
							<form method="POST" action="?/generateInsight" use:enhance={() => {
								isGenerating = true;
								return async ({ update }) => {
									await update();
									isGenerating = false;
								};
							}}>
								<input type="hidden" name="period" value={data.aiPeriod} />
								<button type="submit" disabled={isGenerating} class="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95">
									{#if isGenerating} ⏳ Analyserer... {:else} ✨ Generer Analyse {/if}
								</button>
							</form>
						</div>
					{/if}
				</div>
			</section>

			<!-- Reality Check (Side Panel) -->
			<div class="flex flex-col gap-6">
				{#if data.topWish && data.kpis.guiltyPleasureSpending > 0}
					{@const wishPct = Math.min(100, (data.kpis.guiltyPleasureSpending / data.topWish.price) * 100)}
					<section class="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 md:p-8 rounded-3xl shadow-lg text-white relative overflow-hidden flex-1">
						<div class="absolute -right-10 -top-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
						<h2 class="text-lg font-bold mb-4 flex items-center gap-2">🎯 Reality Check</h2>
						<p class="text-indigo-100 text-sm mb-6 leading-relaxed">
							Du har brugt <strong>{formatCur(data.kpis.guiltyPleasureSpending)}</strong> på <span class="bg-white/20 px-1.5 py-0.5 rounded font-bold">{data.kpis.guiltyPleasureName}</span>.<br><br>
							Det er <strong class="text-xl text-amber-300">{Math.round(wishPct)}%</strong> af: <br><strong>{data.topWish.title}</strong>!
						</p>
						
						<div class="w-full bg-indigo-900/50 rounded-full h-3 mb-2 overflow-hidden shadow-inner">
							<div class="bg-gradient-to-r from-amber-300 to-amber-500 h-3 rounded-full transition-all duration-1000" style="width: {wishPct}%"></div>
						</div>
						<div class="flex justify-between text-[10px] font-bold text-indigo-200">
							<span>0 DKK</span>
							<span>{formatCur(data.topWish.price)}</span>
						</div>
					</section>
				{:else}
					<div class="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center text-center flex-1">
						<div class="text-3xl mb-2 opacity-30">🎯</div>
						<p class="text-sm font-medium text-slate-500 dark:text-slate-400">Intet Reality Check tilgængeligt.<br>Tilføj ønsker til din brønd!</p>
					</div>
				{/if}

				<!-- Top 3 Categories Small Panel -->
				{#if data.top3Categories.length > 0}
					<div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-200/50 dark:border-white/10">
						<h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Top 3 Slughalse</h3>
						<div class="space-y-4">
							{#each data.top3Categories as cat}
								<div class="flex items-center justify-between group cursor-pointer" onclick={() => selectedCategory = selectedCategory === cat.name ? null : cat.name}>
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm" style="background-color: {cat.color || '#94a3b8'}">
											{cat.name.charAt(0)}
										</div>
										<div>
											<p class="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-500 transition-colors">{cat.name}</p>
											<p class="text-xs text-slate-500">{cat.percentage}%</p>
										</div>
									</div>
									<div class="text-right">
										<p class="text-sm font-black text-slate-800 dark:text-white">{formatCur(cat.amount)}</p>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- BIG CHARTS GRID -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			
			<!-- Donut Chart -->
			<section class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/50 dark:border-white/10 flex flex-col items-center">
				<h3 class="text-sm font-bold text-slate-800 dark:text-white mb-2 self-start">Kategorifordeling</h3>
				<p class="text-xs text-slate-500 dark:text-slate-400 mb-6 self-start">Klik på en kategori i grafen for at filtrere tabellen i bunden.</p>
				
				{#if data.charts.donut.series.length > 0}
					{#key isDarkMode}
						<div use:chart={{...donutOptions, chart: { ...donutOptions.chart, events: {
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							dataPointSelection: (event: any, chartContext: any, config: any) => {
								const clickedCategoryName = config.w.globals.labels[config.dataPointIndex];
								selectedCategory = selectedCategory === clickedCategoryName ? null : clickedCategoryName;
								// Scroll to table smoothly
								document.getElementById('transactions-table')?.scrollIntoView({ behavior: 'smooth' });
							}
						}}}} class="w-full flex justify-center mt-4"></div>
					{/key}
				{:else}
					<div class="flex-1 flex items-center justify-center text-slate-400">Ingen data for denne periode</div>
				{/if}
			</section>

			<div class="grid grid-cols-1 gap-6">
				<!-- Cumulative Area Chart -->
				<section class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-200/50 dark:border-white/10 flex flex-col">
					<h3 class="text-sm font-bold text-slate-800 dark:text-white mb-4">Akkumuleret Forbrug</h3>
					{#if data.charts.cumulative.series[0].data.length > 0}
						{#key isDarkMode}
							<div use:chart={cumulativeOptions} class="w-full flex-1 -ml-2"></div>
						{/key}
					{:else}
						<div class="flex-1 flex items-center justify-center text-slate-400">Ingen data for denne periode</div>
					{/if}
				</section>
				
				<!-- Bar / Time Series Chart -->
				<section class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-200/50 dark:border-white/10 flex flex-col">
					<h3 class="text-sm font-bold text-slate-800 dark:text-white mb-4">
						Udvikling i Perioden
					</h3>
					{#if data.charts.bar.series[0].data.length > 0}
						{#key isDarkMode}
							<div use:chart={barOptions} class="w-full flex-1 -ml-2"></div>
						{/key}
					{:else}
						<div class="flex-1 flex items-center justify-center text-slate-400">Ingen data for denne periode</div>
					{/if}
				</section>
			</div>

		</div>

		<!-- DAY OF WEEK CHART -->
		<section class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/50 dark:border-white/10 flex flex-col items-center">
			<h3 class="text-sm font-bold text-slate-800 dark:text-white mb-6">Dine "Farlige" Dage (Forbrug pr. ugedag)</h3>
			{#if data.charts.dayOfWeek.series[0].data.some(d => d > 0)}
				{#key isDarkMode}
					<div use:chart={dayOfWeekOptions} class="w-full max-w-2xl flex justify-center"></div>
				{/key}
			{:else}
				<div class="h-48 flex items-center justify-center text-slate-400">Ingen data for denne periode</div>
			{/if}
		</section>

		<!-- DRILL DOWN TABLE -->
		<section id="transactions-table" class="bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200/50 dark:border-white/10">
			<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
				<div>
					<h3 class="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">🔍 Alle Transaktioner</h3>
					<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Viser og søger i hele den valgte periode ({data.recentTransactions.length} poster).</p>
				</div>
				
				<div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
					{#if selectedCategory}
						<button onclick={() => selectedCategory = null} class="text-xs bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-sm flex items-center gap-2">
							Filter: {selectedCategory} <span class="bg-white/20 rounded-full w-4 h-4 flex items-center justify-center">✕</span>
						</button>
					{/if}
					
					<label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
						<input type="checkbox" bind:checked={showOnlyUncategorized} class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
						Kun ukendte posteringer
					</label>

					<div class="relative flex-1 lg:w-72">
						<input type="text" bind:value={searchQuery} placeholder="Søg i alle transaktioner..." class="w-full text-sm font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner">
						<span class="absolute left-3.5 top-2.5 text-slate-400">🔍</span>
					</div>
				</div>
			</div>
			
			<div class="overflow-x-auto pb-24">
				<table class="w-full text-left text-sm whitespace-nowrap">
					<thead class="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50/50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-white/10">
						<tr>
							<th class="px-4 py-4 w-10">
								<input type="checkbox" 
									checked={selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0} 
									onchange={(e) => {
										if (e.currentTarget.checked) selectedTransactions = filteredTransactions.map(t => t.id);
										else selectedTransactions = [];
									}} 
									class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
							</th>
							<th class="px-4 py-4 cursor-pointer hover:text-indigo-500 transition-colors" onclick={() => toggleSort('date')}>
								Dato {sortColumn === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
							</th>
							<th class="px-4 py-4 cursor-pointer hover:text-indigo-500 transition-colors" onclick={() => toggleSort('text')}>
								Tekst {sortColumn === 'text' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
							</th>
							<th class="px-4 py-4 cursor-pointer hover:text-indigo-500 transition-colors" onclick={() => toggleSort('category')}>
								Kategori {sortColumn === 'category' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
							</th>
							<th class="px-4 py-4 text-right cursor-pointer hover:text-indigo-500 transition-colors" onclick={() => toggleSort('amount')}>
								Beløb {sortColumn === 'amount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
							</th>
							<th class="px-4 py-4 text-right">Handlinger</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredTransactions as tx}
							<tr class="border-b border-slate-100/50 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors {selectedTransactions.includes(tx.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}">
								<td class="px-4 py-3">
									<input type="checkbox" bind:group={selectedTransactions} value={tx.id} class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
								</td>
								<td class="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">{formatDate(tx.date)}</td>
								<td class="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 truncate max-w-[250px]" title={tx.text}>{tx.text}</td>
								<td class="px-4 py-3">
									<form method="POST" action="?/updateCategory" use:enhance class="relative inline-flex items-center group/cat">
										<input type="hidden" name="transactionId" value={tx.id} />
										<select name="categoryId" onchange={(e) => e.currentTarget.form?.requestSubmit()} class="appearance-none px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 group-hover/cat:ring-2 ring-indigo-500 border border-transparent dark:border-white/5 cursor-pointer focus:ring-2 outline-none transition-all pr-6">
											{#each data.transactionCategories as cat}
												<option value={cat.id} selected={cat.id === tx.categoryId}>
													{cat.icon || '📦'} {cat.name}
												</option>
											{/each}
											{#if !tx.categoryId}
												<option value="" selected disabled>Ukategoriseret</option>
											{/if}
										</select>
										<span class="pointer-events-none absolute right-2 text-[8px] text-slate-400 group-hover/cat:text-indigo-500 transition-colors">▼</span>
									</form>
								</td>
								<td class="px-4 py-3 text-right font-black {tx.amount < 0 ? 'text-slate-800 dark:text-white' : 'text-emerald-500 dark:text-emerald-400'}">
									{tx.amount < 0 ? formatCur(tx.amount) : '+' + formatCur(tx.amount)}
								</td>
								<td class="px-4 py-3 text-right">
									{#if tx.itemId}
										<div class="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-emerald-200 dark:border-emerald-800/50">
											<span>🎁</span> <span class="truncate max-w-[120px]" title={tx.item?.title}>Knyttet: {tx.item?.title}</span>
										</div>
									{:else}
										<div class="flex items-center justify-end gap-2">
											<div class="relative group/link">
												<button type="button" class="text-xs bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-colors border border-slate-200 dark:border-white/5 shadow-sm">
													Tilknyt Ønske ▾
												</button>
												<div class="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-2xl rounded-xl p-1.5 z-20 hidden group-hover/link:block group-focus-within/link:block">
													{#if data.activeWishes.length === 0}
														<div class="text-xs text-slate-500 dark:text-slate-400 p-3 text-center">Ingen aktive ønsker</div>
													{/if}
													{#each data.activeWishes as wish}
														<form method="POST" action="?/linkWish" use:enhance>
															<input type="hidden" name="transactionId" value={tx.id} />
															<input type="hidden" name="itemId" value={wish.id} />
															<button type="submit" class="w-full text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 hover:text-indigo-700 dark:hover:text-indigo-300 px-3 py-2 rounded-lg truncate transition-colors" title={wish.title}>
																{wish.title} ({formatCur(wish.price)})
															</button>
														</form>
													{/each}
												</div>
											</div>
											<form method="POST" action="?/createRealizedWish" use:enhance onsubmit={(e) => { if (!confirm(`Opret nyt realiseret ønske baseret på "${tx.text}"?`)) e.preventDefault(); }}>
												<input type="hidden" name="transactionId" value={tx.id} />
												<button type="submit" class="text-xs bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-500 text-indigo-600 dark:text-indigo-400 hover:text-white px-3 py-1.5 rounded-lg font-bold transition-colors border border-indigo-100 dark:border-indigo-500/30 shadow-sm">
													Opret Ønske ✨
												</button>
											</form>
										</div>
									{/if}
								</td>
							</tr>
						{/each}
						{#if filteredTransactions.length === 0}
							<tr>
								<td colspan="6" class="px-4 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">Ingen transaktioner at vise. Prøv at ændre dine filtre.</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</section>

		{#if selectedTransactions.length > 0}
			<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl shadow-2xl border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 animate-in slide-in-from-bottom-10 fade-in w-[95vw] md:w-auto max-w-3xl ring-4 ring-indigo-500/20">
				<div class="flex items-center gap-3 w-full md:w-auto">
					<div class="bg-indigo-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-inner">{selectedTransactions.length}</div>
					<div class="flex flex-col">
						<span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valgte rækker</span>
						<span class="text-sm font-black text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatCur(filteredTransactions.filter(t => selectedTransactions.includes(t.id)).reduce((acc, t) => acc + Math.abs(t.amount), 0))}</span>
					</div>
				</div>
				
				<div class="w-full md:w-px h-px md:h-8 bg-slate-200 dark:bg-white/10"></div>
				
				<form method="POST" action="?/bulkGroupToWish" use:enhance={() => {
					return async ({ update, result }) => {
						await update();
						if (result.type === 'success') {
							selectedTransactions = [];
							groupName = '';
						}
					};
				}} class="flex items-center gap-3 w-full md:w-auto flex-1">
					<input type="hidden" name="transactionIds" value={JSON.stringify(selectedTransactions)} />
					<input type="text" name="groupName" bind:value={groupName} required placeholder="Navngiv gruppen (f.eks. Ferie London)" class="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner">
					<button type="submit" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-lg hover:scale-105 active:scale-95 whitespace-nowrap flex items-center gap-2">
						✨ Gruppér og Realisér
					</button>
				</form>
				
				<button type="button" onclick={() => selectedTransactions = []} class="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold p-2 absolute top-2 right-2 md:static md:p-0 transition-colors">✕</button>
			</div>
		{/if}

	</div>
</div>
