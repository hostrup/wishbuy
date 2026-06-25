<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { chart } from '$lib/actions/apexcharts';
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	let { data, form } = $props();

	// TS-1.1: isDarkMode defineret øverst i script for at undgå hoisting-fejl
	let isDarkMode = $state(false);
	let isGenerating = $state(false);

	function getThemeColor(variableName: string, fallback: string): string {
		if (typeof window === 'undefined') return fallback;
		return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim() || fallback;
	}

	// ApexCharts configs
	let donutOptions = $derived({
		chart: {
			type: 'donut',
			height: 450,
			background: 'transparent',
			events: {
				dataPointSelection: function (event: any, chartContext: any, config: any) {
					const categoryName = config.w.config.labels[config.dataPointIndex];
					if (selectedCategory === categoryName) {
						selectedCategory = null;
					} else {
						selectedCategory = categoryName;
					}
				}
			}
		},
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
							formatter: function (val: number) {
								return Math.round(val) + ' kr';
							}
						}
					}
				}
			}
		},
		dataLabels: { enabled: false },
		tooltip: {
			y: {
				formatter: function (val: number) {
					return Math.round(val) + ' kr';
				}
			}
		},
		stroke: { show: true, colors: [isDarkMode ? getThemeColor('--color-slate-800', '#181c18') : '#ffffff'], width: 2 },
		theme: { mode: isDarkMode ? 'dark' : 'light' }
	});

	let barOptions = $derived({
		chart: {
			type: 'bar',
			height: 350,
			toolbar: { show: false },
			background: 'transparent',
			events: {
				dataPointSelection: function (event: any, chartContext: any, config: any) {
					const category = config.w.config.xaxis.categories[config.dataPointIndex];
					if (selectedChartDate === category) {
						selectedChartDate = null;
					} else {
						selectedChartDate = category;
					}
				}
			}
		},
		series: data.charts.bar.series,
		xaxis: { categories: data.charts.bar.labels },
		colors: [getThemeColor('--color-indigo-500', '#6c5ce7')],
		dataLabels: { enabled: false },
		tooltip: {
			y: {
				formatter: function (val: number) {
					return Math.round(val) + ' kr';
				}
			}
		},
		grid: { borderColor: isDarkMode ? getThemeColor('--color-slate-700', '#2a2f29') : getThemeColor('--color-slate-200', '#e8eae5'), strokeDashArray: 4 },
		theme: { mode: isDarkMode ? 'dark' : 'light' }
	});

	let cumulativeOptions = $derived({
		chart: {
			type: 'area',
			height: 350,
			toolbar: { show: false },
			background: 'transparent',
			events: {
				dataPointSelection: function (event: any, chartContext: any, config: any) {
					const category = config.w.config.xaxis.categories[config.dataPointIndex];
					if (selectedChartDate === category) {
						selectedChartDate = null;
					} else {
						selectedChartDate = category;
					}
				}
			}
		},
		series: data.charts.cumulative.series,
		xaxis: { categories: data.charts.cumulative.labels, type: 'datetime' },
		colors: [getThemeColor('--color-emerald-500', '#10b981')],
		fill: {
			type: 'gradient',
			gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 90, 100] }
		},
		dataLabels: { enabled: false },
		stroke: { curve: 'smooth', width: 3 },
		tooltip: {
			x: { format: 'dd MMM yyyy' },
			y: {
				formatter: function (val: number) {
					return Math.round(val) + ' kr';
				}
			}
		},
		grid: { borderColor: isDarkMode ? getThemeColor('--color-slate-700', '#2a2f29') : getThemeColor('--color-slate-200', '#e8eae5'), strokeDashArray: 4 },
		theme: { mode: isDarkMode ? 'dark' : 'light' }
	});

	let dayOfWeekOptions = $derived({
		chart: { type: 'radar', height: 350, toolbar: { show: false }, background: 'transparent' },
		series: data.charts.dayOfWeek.series,
		labels: data.charts.dayOfWeek.labels,
		colors: [getThemeColor('--color-rose-500', '#e8879e')],
		stroke: { width: 2 },
		fill: { opacity: 0.2 },
		markers: { size: 4 },
		tooltip: {
			y: {
				formatter: function (val: number) {
					return Math.round(val) + ' kr';
				}
			}
		},
		theme: { mode: isDarkMode ? 'dark' : 'light' }
	});

	// State
	let selectedCategory = $state<string | null>(null);
	let selectedChartDate = $state<string | null>(null);
	let searchQuery = $state('');
	let showOnlyUncategorized = $state(false);

	let sortColumn = $state<'date' | 'text' | 'category' | 'amount'>('date');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	let isCategoryEditorOpen = $state(false);
	let editingCategory = $state<{ id?: string; name: string; icon: string | null } | null>(null);
	let expandedTxTexts = $state<Set<string>>(new Set());

	function toggleTxText(id: string) {
		const newSet = new Set(expandedTxTexts);
		if (newSet.has(id)) newSet.delete(id);
		else newSet.add(id);
		expandedTxTexts = newSet;
	}

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
			result = result.filter((t) => (t.category?.name || 'Ukategoriseret') === selectedCategory);
		}
		if (selectedChartDate) {
			result = result.filter((t) => t.timeKey === selectedChartDate);
		}
		if (showOnlyUncategorized) {
			result = result.filter((t) => {
				if (!t.categoryId) return true;
				const name = t.category?.name?.toLowerCase() || '';
				return name.includes('ukendt') || name.includes('ukategoriseret');
			});
		}
		if (searchQuery.trim() !== '') {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(t) =>
					t.text.toLowerCase().includes(q) ||
					(t.category?.name || 'Ukategoriseret').toLowerCase().includes(q)
			);
		}

		return [...result].sort((a, b) => {
			let valA, valB;
			if (sortColumn === 'date') {
				valA = new Date(a.date).getTime();
				valB = new Date(b.date).getTime();
			} else if (sortColumn === 'text') {
				valA = a.text;
				valB = b.text;
			} else if (sortColumn === 'category') {
				valA = a.category?.name || 'Ukategoriseret';
				valB = b.category?.name || 'Ukategoriseret';
			} else if (sortColumn === 'amount') {
				valA = Math.abs(a.amount);
				valB = Math.abs(b.amount);
			} else return 0;

			if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
			if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		});
	});

	let fromDate = $state(data.currentFilter.from);
	let toDate = $state(data.currentFilter.to);

	let selectedTransactions = $state<string[]>([]);
	let groupName = $state('');

	const formatCur = (val: number) =>
		new Intl.NumberFormat('da-DK', {
			style: 'currency',
			currency: 'DKK',
			maximumFractionDigits: 0
		}).format(Math.abs(val));
	const formatDate = (date: string | Date) =>
		new Intl.DateTimeFormat('da-DK', { day: '2-digit', month: 'short', year: 'numeric' }).format(
			new Date(date)
		);

	$effect(() => {
		const observer = new MutationObserver(() => {
			isDarkMode = document.documentElement.classList.contains('dark');
		});
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		isDarkMode = document.documentElement.classList.contains('dark');
		return () => observer.disconnect();
	});

	// Date Shortcuts
	const monthNames = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'Maj',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Okt',
		'Nov',
		'Dec'
	];
	const currentYear = new Date().getFullYear();
	const availableYears = Array.from({ length: currentYear - 2023 + 1 }, (_, i) => currentYear - i);
	let activeYear = $state(currentYear);
	const currentMonthIndex = new Date().getMonth();

	let activeShortcut = $derived.by(() => {
		const now = new Date();
		const fromStr = fromDate;
		const toStr = toDate;

		const tmFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
		const tmTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
		if (fromStr === tmFrom && toStr === tmTo) return 'this_month';

		const pmFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
		const pmTo = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
		if (fromStr === pmFrom && toStr === pmTo) return 'prev_month';

		const tyFrom = new Date(activeYear, 0, 1).toISOString().split('T')[0];
		const tyTo = new Date(activeYear, 11, 31).toISOString().split('T')[0];
		if (fromStr === tyFrom && toStr === tyTo) return 'this_year';

		const allFrom = new Date(2000, 0, 1).toISOString().split('T')[0];
		if (fromStr === allFrom) return 'all';

		const maxMonth = activeYear === currentYear ? currentMonthIndex : 11;
		for (let i = 0; i <= maxMonth; i++) {
			const mFrom = new Date(activeYear, i, 1).toISOString().split('T')[0];
			const mTo = new Date(activeYear, i + 1, 0).toISOString().split('T')[0];
			if (fromStr === mFrom && toStr === mTo) return i;
		}
		return 'custom';
	});

	function setShortcut(
		type: 'this_month' | 'prev_month' | 'this_year' | 'all' | number,
		year?: number
	) {
		const now = new Date();
		let from, to;

		if (year) activeYear = year;

		if (type === 'this_month') {
			activeYear = now.getFullYear();
			from = new Date(now.getFullYear(), now.getMonth(), 1);
			to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		} else if (type === 'prev_month') {
			activeYear = now.getFullYear();
			from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			to = new Date(now.getFullYear(), now.getMonth(), 0);
		} else if (type === 'this_year') {
			from = new Date(activeYear, 0, 1);
			to = new Date(activeYear, 11, 31);
		} else if (type === 'all') {
			activeYear = now.getFullYear();
			from = new Date(2000, 0, 1);
			to = new Date(now.getFullYear() + 1, 0, 1);
		} else if (typeof type === 'number') {
			from = new Date(activeYear, type, 1);
			to = new Date(activeYear, type + 1, 0);
		}

		if (from && to) {
			const format = (d: Date) =>
				`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
			fromDate = format(from);
			toDate = format(to);
			applyFilter();
		}
	}

	function applyFilter() {
		goto(`?from=${fromDate}&to=${toDate}`, { keepFocus: true });
	}
</script>

<!-- BACKDROP & CONTAINER -->
<div
	class="relative min-h-screen bg-slate-50 p-4 font-sans text-slate-900 transition-colors duration-300 md:p-8 lg:p-12 dark:bg-slate-950 dark:text-slate-100"
>
	<!-- Ambient Background Glows -->
	<div
		class="pointer-events-none absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-600/10"
	></div>
	<div
		class="pointer-events-none absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-500/10"
	></div>

	<div class="relative z-10 mx-auto max-w-7xl space-y-8">
		<!-- HEADER -->
		<header
			class="flex flex-col border-b border-slate-200/50 pb-4 md:flex-row md:items-end md:justify-between dark:border-white/10"
		>
			<div>
				<h1
					class="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-3xl font-black tracking-tight text-transparent drop-shadow-sm md:text-5xl dark:from-indigo-400 dark:to-sky-300"
				>
					Cockpit
				</h1>
				<p class="mt-2 font-medium text-slate-500 dark:text-slate-400">
					Dit fulde overblik over forbrug, vaner og økonomi.
				</p>
			</div>
			<div class="mt-4 flex gap-3 md:mt-0">
				<button
					onclick={() => (isCategoryEditorOpen = true)}
					class="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-500/10 px-5 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-500/20 dark:border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30"
				>
					<span>🏷️</span> Administrer Kategorier
				</button>
			</div>
		</header>

		<!-- CONTROLS -->
		<section
			class="flex flex-col gap-4 rounded-3xl border border-slate-200/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
		>
			<div class="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
				<div class="flex flex-wrap items-center gap-2">
					<span
						class="mr-2 text-xs font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500"
						>Hurtigvalg</span
					>
					<button
						onclick={() => setShortcut('this_month')}
						class="rounded-xl border px-4 py-2 text-xs font-bold transition-colors {activeShortcut ===
						'this_month'
							? 'border-indigo-600 bg-indigo-500 text-white shadow-md'
							: 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-white/5 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700'}"
						>Denne Måned</button
					>
					<button
						onclick={() => setShortcut('prev_month')}
						class="rounded-xl border px-4 py-2 text-xs font-bold transition-colors {activeShortcut ===
						'prev_month'
							? 'border-indigo-600 bg-indigo-500 text-white shadow-md'
							: 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-white/5 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700'}"
						>Forrige Måned</button
					>
					<button
						onclick={() => setShortcut('this_year')}
						class="rounded-xl border px-4 py-2 text-xs font-bold transition-colors {activeShortcut ===
						'this_year'
							? 'border-indigo-600 bg-indigo-500 text-white shadow-md'
							: 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-white/5 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700'}"
						>Dette År</button
					>
					<button
						onclick={() => setShortcut('all')}
						class="rounded-xl border px-4 py-2 text-xs font-bold transition-colors {activeShortcut ===
						'all'
							? 'border-indigo-600 bg-indigo-500 text-white shadow-md'
							: 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-white/5 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700'}"
						>Altid</button
					>
				</div>

				<div
					class="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/50 bg-slate-50/50 p-2 dark:border-white/5 dark:bg-slate-900/50 {activeShortcut ===
					'custom'
						? 'ring-2 ring-indigo-500/50'
						: ''}"
				>
					<div class="flex items-center gap-2 pl-2">
						<label
							for="from"
							class="text-[10px] font-black tracking-wider text-slate-400 uppercase dark:text-slate-500"
							>Fra:</label
						>
						<input
							type="date"
							id="from"
							bind:value={fromDate}
							class="cursor-pointer border-none bg-transparent text-sm font-bold text-slate-700 outline-none dark:text-slate-200"
						/>
					</div>
					<div class="h-6 w-px bg-slate-200 dark:bg-white/10"></div>
					<div class="flex items-center gap-2">
						<label
							for="to"
							class="text-[10px] font-black tracking-wider text-slate-400 uppercase dark:text-slate-500"
							>Til:</label
						>
						<input
							type="date"
							id="to"
							bind:value={toDate}
							class="cursor-pointer border-none bg-transparent text-sm font-bold text-slate-700 outline-none dark:text-slate-200"
						/>
					</div>
					<button
						onclick={applyFilter}
						class="ml-auto rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-md transition-transform hover:scale-105 xl:ml-2 dark:bg-white dark:text-slate-900"
					>
						Opdater
					</button>
				</div>
			</div>

			<!-- Årsknapper -->
			<div
				class="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/5"
			>
				<span
					class="mr-2 text-xs font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500"
					>År</span
				>
				{#each availableYears as y}
					<button
						onclick={() => setShortcut('this_year', y)}
						class="rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors {activeYear ===
						y
							? 'border-indigo-600 bg-indigo-500 text-white shadow-md'
							: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}"
						>{y}</button
					>
				{/each}
			</div>

			<!-- Månedsknapper -->
			<div
				class="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/5"
			>
				<span
					class="mr-2 text-xs font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500"
					>Måneder ({activeYear})</span
				>
				{#each Array(activeYear === currentYear ? currentMonthIndex + 1 : 12)
					.fill(0)
					.map((_, i) => i) as m}
					<button
						onclick={() => setShortcut(m)}
						class="rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors {activeShortcut ===
						m
							? 'border-indigo-600 bg-indigo-500 text-white shadow-md'
							: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}"
						>{monthNames[m]}</button
					>
				{/each}
			</div>
		</section>

		<!-- KPIS -->
		<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<div
				class="group relative flex flex-col justify-center overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl transition-colors hover:border-indigo-500/50 dark:border-white/10 dark:bg-slate-800/80"
			>
				<div
					class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl transition-colors group-hover:bg-indigo-500/20"
				></div>
				<p
					class="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-widest text-indigo-500 uppercase dark:text-indigo-400"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-indigo-500"></span> Samlet Forbrug
				</p>
				<p class="text-3xl font-black text-slate-800 md:text-4xl dark:text-white">
					{formatCur(data.kpis.periodExpenses)}
				</p>
				<p class="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
					{data.currentFilter.daysInPeriod} dages periode
				</p>
			</div>

			<div
				class="group relative flex flex-col justify-center overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl transition-colors hover:border-emerald-500/50 dark:border-white/10 dark:bg-slate-800/80"
			>
				<div
					class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition-colors group-hover:bg-emerald-500/20"
				></div>
				<p
					class="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-widest text-emerald-500 uppercase dark:text-emerald-400"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Dagligt Snit
				</p>
				<p class="text-3xl font-black text-slate-800 md:text-4xl dark:text-white">
					{formatCur(data.kpis.avgDailySpend)}
				</p>
				<p class="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
					Hvad du brænder af hver dag
				</p>
			</div>

			<div
				class="group relative flex flex-col justify-center overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl transition-colors hover:border-amber-500/50 dark:border-white/10 dark:bg-slate-800/80"
			>
				<div
					class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl transition-colors group-hover:bg-amber-500/20"
				></div>
				<p
					class="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-widest text-amber-500 uppercase dark:text-amber-400"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Top Kategori
				</p>
				<p class="truncate text-xl font-black text-slate-800 md:text-2xl dark:text-white">
					{data.kpis.topCategoryName}
				</p>
				<p class="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
					Den største slughals
				</p>
			</div>

			<div
				class="group relative flex flex-col justify-center overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl transition-colors hover:border-rose-500/50 dark:border-white/10 dark:bg-slate-800/80"
			>
				<div
					class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-rose-500/10 blur-2xl transition-colors group-hover:bg-rose-500/20"
				></div>
				<p
					class="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-widest text-rose-500 uppercase dark:text-rose-400"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-rose-500"></span> Dyreste Post
				</p>
				<p
					class="truncate text-xl font-black text-slate-800 md:text-2xl dark:text-white"
					title={data.kpis.largestTransaction.text}
				>
					{formatCur(data.kpis.largestTransaction.amount)}
				</p>
				<p class="mt-2 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
					"{data.kpis.largestTransaction.text}"
				</p>
			</div>
		</section>

		<!-- AI Financial Advisor & Reality Check -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- AI Advisor -->
			<section
				class="relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80 lg:col-span-2 md:p-8"
			>
				<div
					class="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-emerald-500/5 opacity-20 blur-3xl dark:bg-emerald-500/5"
				></div>

				<div
					class="relative z-10 mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
				>
					<div>
						<h2 class="flex items-center gap-3 text-xl font-bold md:text-2xl text-slate-800 dark:text-white">
							<span class="text-3xl">🤖</span> Din Formuerådgiver
						</h2>
					</div>
				</div>

				<div class="relative z-10 flex-1">
					{#if form?.error}
						<div
							class="mb-6 rounded-xl border border-red-200 bg-red-500/10 p-4 text-sm text-red-600 dark:border-red-500/20 dark:text-red-400"
						>
							{form.error}
						</div>
					{/if}

					{#if data.aiInsight}
						<div
							class="prose dark:prose-invert prose-slate prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-strong:text-indigo-600 dark:prose-strong:text-indigo-400 max-w-none text-sm md:text-base"
						>
							{@html DOMPurify.sanitize(marked(data.aiInsight.content) as string)}
						</div>
						<div class="mt-8 flex items-center justify-between border-t border-slate-200/50 dark:border-white/10 pt-4">
							<span class="text-xs text-slate-400 dark:text-slate-500"
								>Opdateret: {new Intl.DateTimeFormat('da-DK', {
									dateStyle: 'medium',
									timeStyle: 'short'
								}).format(new Date(data.aiInsight.updatedAt))}</span
							>
							<form
								method="POST"
								action="?/generateInsight"
								use:enhance={() => {
									isGenerating = true;
									return async ({ update }) => {
										await update();
										isGenerating = false;
									};
								}}
							>
								<input type="hidden" name="from" value={data.currentFilter.from} />
								<input type="hidden" name="to" value={data.currentFilter.to} />
								<button
									type="submit"
									disabled={isGenerating}
									class="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-500/10 px-4 py-2 text-xs font-bold text-indigo-700 transition-all hover:bg-indigo-500/20 dark:border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30"
								>
									{#if isGenerating}
										⏳ Arbejder...
									{:else}
										🔄 Opdater
									{/if}
								</button>
							</form>
						</div>
					{:else}
						<div class="py-8 text-center">
							<div class="mb-4 text-4xl opacity-50">🧠</div>
							<p class="mb-6 text-sm text-slate-600 dark:text-slate-400">
								Der er ikke genereret en analyse for denne præcise periode endnu.
							</p>
							<form
								method="POST"
								action="?/generateInsight"
								use:enhance={() => {
									isGenerating = true;
									return async ({ update }) => {
										await update();
										isGenerating = false;
									};
								}}
							>
								<input type="hidden" name="from" value={data.currentFilter.from} />
								<input type="hidden" name="to" value={data.currentFilter.to} />
								<button
									type="submit"
									disabled={isGenerating}
									class="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-md transition-all hover:bg-indigo-500 active:scale-95"
								>
									{#if isGenerating}
										⏳ Analyserer...
									{:else}
										✨ Generer Analyse
									{/if}
								</button>
							</form>
						</div>
					{/if}
				</div>
			</section>

			<!-- Reality Check (Side Panel) -->
			<div class="flex flex-col gap-6">
				{#if data.topWish && data.kpis.guiltyPleasureSpending > 0}
					{@const wishPct = Math.min(
						100,
						(data.kpis.guiltyPleasureSpending / data.topWish.price) * 100
					)}
					<section
						class="relative flex-1 overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80 md:p-8"
					>
						<h2 class="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">🎯 Reality Check</h2>
						<p class="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
							Du har brugt <strong>{formatCur(data.kpis.guiltyPleasureSpending)}</strong> på
							<span class="rounded bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 font-bold text-slate-800 dark:text-slate-200"
								>{data.kpis.guiltyPleasureName}</span
							>.<br /><br />
							Det er <strong class="text-xl text-indigo-600 dark:text-indigo-400">{Math.round(wishPct)}%</strong> af:
							<br /><strong class="text-slate-800 dark:text-white">{data.topWish.title}</strong>!
						</p>

						<div class="mb-2 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900 shadow-inner">
							<div
								class="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-1000"
								style="width: {wishPct}%"
							></div>
						</div>
						<div class="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
							<span>0 DKK</span>
							<span>{formatCur(data.topWish.price)}</span>
						</div>
					</section>
				{:else}
					<div
						class="flex flex-1 flex-col items-center justify-center rounded-3xl border border-slate-200/50 bg-white/50 p-6 text-center backdrop-blur-sm dark:border-white/5 dark:bg-slate-800/50"
					>
						<div class="mb-2 text-3xl opacity-30">🎯</div>
						<p class="text-sm font-medium text-slate-500 dark:text-slate-400">
							Intet Reality Check tilgængeligt.<br />Tilføj ønsker til din brønd!
						</p>
					</div>
				{/if}

				<!-- Top 3 Categories Small Panel -->
				{#if data.top3Categories.length > 0}
					<div
						class="rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
					>
						<h3
							class="mb-4 text-xs font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500"
						>
							Top 3 Slughalse
						</h3>
						<div class="space-y-4">
							{#each data.top3Categories as cat}
								<div
									class="group flex cursor-pointer items-center justify-between"
									onclick={() =>
										(selectedCategory = selectedCategory === cat.name ? null : cat.name)}
								>
									<div class="flex items-center gap-3">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
											style="background-color: {cat.color || '#94a3b8'}"
										>
											{cat.name.charAt(0)}
										</div>
										<div>
											<p
												class="text-sm font-bold text-slate-700 transition-colors group-hover:text-indigo-500 dark:text-slate-200"
											>
												{cat.name}
											</p>
											<p class="text-xs text-slate-500">{cat.percentage}%</p>
										</div>
									</div>
									<div class="text-right">
										<p class="text-sm font-black text-slate-800 dark:text-white">
											{formatCur(cat.amount)}
										</p>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- BIG CHARTS GRID -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Donut Chart -->
			<section
				class="flex flex-col items-center rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl md:p-8 dark:border-white/10 dark:bg-slate-800/80"
			>
				<h3 class="mb-2 self-start text-sm font-bold text-slate-800 dark:text-white">
					Kategorifordeling
				</h3>
				<p class="mb-6 self-start text-xs text-slate-500 dark:text-slate-400">
					Klik på en kategori i grafen for at filtrere tabellen i bunden.
				</p>

				{#if data.charts.donut.series.length > 0}
					{#key isDarkMode}
						<div
							use:chart={{
								...donutOptions,
								chart: {
									...donutOptions.chart,
									events: {
										// eslint-disable-next-line @typescript-eslint/no-explicit-any
										dataPointSelection: (event: any, chartContext: any, config: any) => {
											const clickedCategoryName = config.w.globals.labels[config.dataPointIndex];
											selectedCategory =
												selectedCategory === clickedCategoryName ? null : clickedCategoryName;
											// Scroll to table smoothly
											document
												.getElementById('transactions-table')
												?.scrollIntoView({ behavior: 'smooth' });
										}
									}
								}
							}}
							class="mt-4 flex w-full justify-center"
						></div>
					{/key}
				{:else}
					<div class="flex flex-1 items-center justify-center text-slate-400">
						Ingen data for denne periode
					</div>
				{/if}
			</section>

			<div class="grid grid-cols-1 gap-6">
				<!-- Cumulative Area Chart -->
				<section
					class="flex flex-col rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
				>
					<h3 class="mb-4 text-sm font-bold text-slate-800 dark:text-white">Akkumuleret Forbrug</h3>
					{#if data.charts.cumulative.series[0].data.length > 0}
						{#key isDarkMode}
							<div use:chart={cumulativeOptions} class="-ml-2 w-full flex-1"></div>
						{/key}
					{:else}
						<div class="flex flex-1 items-center justify-center text-slate-400">
							Ingen data for denne periode
						</div>
					{/if}
				</section>

				<!-- Bar / Time Series Chart -->
				<section
					class="flex flex-col rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
				>
					<h3 class="mb-4 text-sm font-bold text-slate-800 dark:text-white">
						Udvikling i Perioden
					</h3>
					{#if data.charts.bar.series[0].data.length > 0}
						{#key isDarkMode}
							<div use:chart={barOptions} class="-ml-2 w-full flex-1"></div>
						{/key}
					{:else}
						<div class="flex flex-1 items-center justify-center text-slate-400">
							Ingen data for denne periode
						</div>
					{/if}
				</section>
			</div>
		</div>

		<!-- DAY OF WEEK CHART -->
		<section
			class="flex flex-col items-center rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl md:p-8 dark:border-white/10 dark:bg-slate-800/80"
		>
			<h3 class="mb-6 text-sm font-bold text-slate-800 dark:text-white">
				Dine "Farlige" Dage (Forbrug pr. ugedag)
			</h3>
			{#if data.charts.dayOfWeek.series[0].data.some((d) => d > 0)}
				{#key isDarkMode}
					<div use:chart={dayOfWeekOptions} class="flex w-full max-w-2xl justify-center"></div>
				{/key}
			{:else}
				<div class="flex h-48 items-center justify-center text-slate-400">
					Ingen data for denne periode
				</div>
			{/if}
		</section>

		<!-- DRILL DOWN TABLE -->
		<section
			id="transactions-table"
			class="rounded-3xl border border-slate-200/50 bg-white/90 p-6 shadow-xl backdrop-blur-2xl md:p-8 dark:border-white/10 dark:bg-slate-800/90"
		>
			<div class="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div class="flex flex-wrap items-center gap-3">
					<h3 class="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-white">
						🔍 Alle Transaktioner
					</h3>
					{#if selectedCategory || selectedChartDate || showOnlyUncategorized || searchQuery}
						<button
							onclick={() => {
								selectedCategory = null;
								selectedChartDate = null;
								showOnlyUncategorized = false;
								searchQuery = '';
							}}
							class="rounded-lg bg-red-100 px-3 py-1 text-xs font-bold text-red-600 transition-colors hover:bg-red-200 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
						>
							✕ Ryd filtre
						</button>
					{/if}
					{#if selectedChartDate}
						<span
							class="rounded-lg bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
						>
							Dato: {selectedChartDate}
						</span>
					{/if}
					<p class="text-xs text-slate-500 dark:text-slate-400">
						Viser og søger i hele den valgte periode ({data.recentTransactions.length} poster).
					</p>
				</div>

				<div class="flex w-full flex-wrap items-center gap-3 lg:w-auto">
					{#if selectedCategory}
						<button
							onclick={() => (selectedCategory = null)}
							class="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-indigo-600"
						>
							Filter: {selectedCategory}
							<span class="flex h-4 w-4 items-center justify-center rounded-full bg-white/20"
								>✕</span
							>
						</button>
					{/if}

					<label
						class="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/5 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800"
					>
						<input
							type="checkbox"
							bind:checked={showOnlyUncategorized}
							class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
						/>
						Kun ukendte posteringer
					</label>

					<div class="relative flex-1 lg:w-72">
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Søg i alle transaktioner..."
							class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-10 text-sm font-medium text-slate-900 shadow-inner transition-all outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
						/>
						<span class="absolute top-2.5 left-3.5 text-slate-400">🔍</span>
					</div>
				</div>
			</div>

			<div class="overflow-x-auto pb-24">
				<table class="w-full text-left text-sm whitespace-nowrap">
					<thead
						class="border-y border-slate-200 bg-slate-50/50 text-xs tracking-widest text-slate-400 uppercase dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-500"
					>
						<tr>
							<th class="w-10 px-4 py-4">
								<input
									type="checkbox"
									checked={selectedTransactions.length === filteredTransactions.length &&
										filteredTransactions.length > 0}
									onchange={(e) => {
										if (e.currentTarget.checked)
											selectedTransactions = filteredTransactions.map((t) => t.id);
										else selectedTransactions = [];
									}}
									class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
								/>
							</th>
							<th
								class="cursor-pointer px-4 py-4 transition-colors hover:text-indigo-500"
								onclick={() => toggleSort('date')}
							>
								Dato {sortColumn === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
							</th>
							<th
								class="cursor-pointer px-4 py-4 transition-colors hover:text-indigo-500"
								onclick={() => toggleSort('text')}
							>
								Tekst {sortColumn === 'text' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
							</th>
							<th
								class="cursor-pointer px-4 py-4 transition-colors hover:text-indigo-500"
								onclick={() => toggleSort('category')}
							>
								Kategori {sortColumn === 'category' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
							</th>
							<th
								class="cursor-pointer px-4 py-4 text-right transition-colors hover:text-indigo-500"
								onclick={() => toggleSort('amount')}
							>
								Beløb {sortColumn === 'amount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
							</th>
							<th class="px-4 py-4 text-right">Handlinger</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredTransactions as tx}
							<tr
								class="border-b border-slate-100/50 transition-colors hover:bg-slate-50/80 dark:border-white/5 dark:hover:bg-slate-800/50 {selectedTransactions.includes(
									tx.id
								)
									? 'bg-indigo-50/50 dark:bg-indigo-900/20'
									: ''}"
							>
								<td class="px-4 py-3">
									<input
										type="checkbox"
										bind:group={selectedTransactions}
										value={tx.id}
										class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
									/>
								</td>
								<td class="px-4 py-3 font-medium text-slate-500 dark:text-slate-400"
									>{formatDate(tx.date)}</td
								>
								<td class="max-w-[250px] px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
									<div class="flex flex-col items-start gap-1">
										<div class="flex w-full items-center gap-2">
											<span
												class="flex-1 cursor-pointer truncate transition-colors hover:text-indigo-500"
												onclick={() => toggleTxText(tx.id)}
												title="Klik for detaljer"
											>
												{tx.text}
											</span>
											{#if tx.paidBy}
												<span
													class="shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase {tx.paidBy ===
													'Mathilde'
														? 'border-pink-200 bg-pink-100 text-pink-700 dark:border-pink-500/20 dark:bg-pink-500/10 dark:text-pink-400'
														: tx.paidBy === 'Ronni'
															? 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400'
															: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
													title="Betalt af {tx.paidBy}"
												>
													{tx.paidBy === 'Mathilde' ? 'M' : tx.paidBy === 'Ronni' ? 'R' : tx.paidBy}
												</span>
											{/if}
										</div>
										{#if expandedTxTexts.has(tx.id)}
											<div
												class="animate-in slide-in-from-top-1 fade-in mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 p-2 text-xs font-normal whitespace-normal text-slate-500 duration-200 dark:border-white/5 dark:bg-slate-900/50 dark:text-slate-400"
											>
												{#if tx.supplementalText}
													<span class="block"
														><strong>Supplerende:</strong> {tx.supplementalText}</span
													>
												{/if}
												{#if tx.receiverName}
													<span class="block"><strong>Modtager:</strong> {tx.receiverName}</span>
												{/if}
												{#if !tx.supplementalText && !tx.receiverName}
													<span class="italic">Ingen supplerende information.</span>
												{/if}
											</div>
										{/if}
									</div>
								</td>
								<td class="px-4 py-3">
									<form
										method="POST"
										action="?/updateCategory"
										use:enhance
										class="group/cat relative inline-flex items-center"
									>
										<input type="hidden" name="transactionId" value={tx.id} />
										<select
											name="categoryId"
											onchange={(e) => e.currentTarget.form?.requestSubmit()}
											class="cursor-pointer appearance-none rounded-lg border border-transparent bg-slate-100 px-3 py-1.5 pr-6 text-xs font-bold tracking-wider text-slate-600 uppercase ring-indigo-500 transition-all outline-none group-hover/cat:ring-2 focus:ring-2 dark:border-white/5 dark:bg-slate-900 dark:text-slate-300"
										>
											{#each data.transactionCategories as cat}
												<option value={cat.id} selected={cat.id === tx.categoryId}>
													{cat.icon || '📦'}
													{cat.name}
												</option>
											{/each}
											{#if !tx.categoryId}
												<option value="" selected disabled>Ukategoriseret</option>
											{/if}
										</select>
										<span
											class="pointer-events-none absolute right-2 text-[8px] text-slate-400 transition-colors group-hover/cat:text-indigo-500"
											>▼</span
										>
									</form>
								</td>
								<td
									class="px-4 py-3 text-right font-black {tx.amount < 0
										? 'text-slate-800 dark:text-white'
										: 'text-emerald-500 dark:text-emerald-400'}"
								>
									{tx.amount < 0 ? formatCur(tx.amount) : '+' + formatCur(tx.amount)}
								</td>
								<td class="px-4 py-3 text-right">
									{#if tx.itemId}
										<div
											class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-400"
										>
											<span>🎁</span>
											<span class="max-w-[120px] truncate" title={tx.item?.title}
												>Knyttet: {tx.item?.title}</span
											>
										</div>
									{:else}
										<div class="flex items-center justify-end gap-2">
											<div class="group/link relative">
												<button
													type="button"
													class="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-200 dark:border-white/5 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
												>
													Tilknyt Ønske ▾
												</button>
												<div
													class="absolute right-0 z-20 mt-2 hidden w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl group-focus-within/link:block group-hover/link:block dark:border-white/10 dark:bg-slate-800"
												>
													{#if data.realizedWishes.length === 0}
														<div class="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
															Ingen realiserede ønsker
														</div>
													{/if}
													{#each data.realizedWishes as wish}
														<form method="POST" action="?/linkWish" use:enhance>
															<input type="hidden" name="transactionId" value={tx.id} />
															<input type="hidden" name="itemId" value={wish.id} />
															<button
																type="submit"
																class="w-full truncate rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-300"
																title={wish.title}
															>
																{wish.title} ({formatCur(wish.price)})
															</button>
														</form>
													{/each}
												</div>
											</div>
											<form
												method="POST"
												action="?/createRealizedWish"
												use:enhance
												onsubmit={(e) => {
													if (!confirm(`Opret nyt realiseret ønske baseret på "${tx.text}"?`))
														e.preventDefault();
												}}
											>
												<input type="hidden" name="transactionId" value={tx.id} />
												<button
													type="submit"
													class="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-500 hover:text-white dark:border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-400"
												>
													Opret Ønske ✨
												</button>
											</form>
											<form
												method="POST"
												action="?/ignoreTransaction"
												use:enhance
												onsubmit={(e) => {
													if (
														!confirm(
															`Er du sikker på, at du vil ignorere "${tx.text}"? Den vil blive fjernet fra alle udregninger.`
														)
													)
														e.preventDefault();
												}}
											>
												<input type="hidden" name="transactionId" value={tx.id} />
												<button
													type="submit"
													class="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 shadow-sm transition-colors hover:bg-red-500 hover:text-white dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-400"
													title="Ignorer postering"
												>
													🚫 Skjul
												</button>
											</form>
										</div>
									{/if}
								</td>
							</tr>
						{/each}
						{#if filteredTransactions.length === 0}
							<tr>
								<td
									colspan="6"
									class="px-4 py-12 text-center font-medium text-slate-500 dark:text-slate-400"
									>Ingen transaktioner at vise. Prøv at ændre dine filtre.</td
								>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</section>

		{#if selectedTransactions.length > 0}
			<div
				class="animate-in slide-in-from-bottom-10 fade-in fixed bottom-6 left-1/2 z-50 flex w-[95vw] max-w-3xl -translate-x-1/2 flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-2xl ring-4 ring-indigo-500/20 backdrop-blur-2xl md:w-auto md:flex-row dark:border-white/10 dark:bg-slate-800/90"
			>
				<div class="flex w-full items-center gap-3 md:w-auto">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-sm font-black text-white shadow-inner"
					>
						{selectedTransactions.length}
					</div>
					<div class="flex flex-col">
						<span class="text-[10px] font-bold tracking-widest text-slate-400 uppercase"
							>Valgte rækker</span
						>
						<span class="text-sm font-black whitespace-nowrap text-slate-700 dark:text-slate-200"
							>{formatCur(
								filteredTransactions
									.filter((t) => selectedTransactions.includes(t.id))
									.reduce((acc, t) => acc + Math.abs(t.amount), 0)
							)}</span
						>
					</div>
				</div>

				<div class="h-px w-full bg-slate-200 md:h-8 md:w-px dark:bg-white/10"></div>

				<form
					method="POST"
					action="?/bulkGroupToWish"
					use:enhance={() => {
						return async ({ update, result }) => {
							await update();
							if (result.type === 'success') {
								selectedTransactions = [];
								groupName = '';
							}
						};
					}}
					class="flex w-full flex-1 items-center gap-3 md:w-auto"
				>
					<input type="hidden" name="transactionIds" value={JSON.stringify(selectedTransactions)} />
					<input
						type="text"
						name="groupName"
						bind:value={groupName}
						required
						placeholder="Navngiv gruppen (f.eks. Ferie London)"
						class="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800 shadow-inner transition-all outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
					/>
					<button
						type="submit"
						class="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold whitespace-nowrap text-white shadow-lg transition-all hover:scale-105 hover:bg-indigo-500 active:scale-95"
					>
						✨ Gruppér og Realisér
					</button>
				</form>

				<button
					type="button"
					onclick={() => (selectedTransactions = [])}
					class="absolute top-2 right-2 p-2 font-bold text-slate-400 transition-colors hover:text-slate-600 md:static md:p-0 dark:hover:text-white"
					>✕</button
				>
			</div>
		{/if}
	</div>

	{#if data.ignoredTransactions && data.ignoredTransactions.length > 0}
		<div class="relative z-10 mx-auto mt-12 max-w-7xl pb-24">
			<section
				class="rounded-3xl border border-slate-200/50 bg-white/50 p-6 opacity-80 shadow-sm backdrop-blur-md transition-opacity hover:opacity-100 dark:border-white/5 dark:bg-slate-800/50"
			>
				<h2
					class="mb-4 flex items-center gap-2 text-lg font-bold text-slate-700 dark:text-slate-300"
				>
					<span>🚫</span> Ignorerede Posteringer ({data.ignoredTransactions.length})
				</h2>
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs whitespace-nowrap">
						<thead
							class="border-b border-slate-200 text-[10px] tracking-widest text-slate-400 uppercase dark:border-white/10 dark:text-slate-500"
						>
							<tr>
								<th class="px-3 py-2">Dato</th>
								<th class="px-3 py-2">Tekst</th>
								<th class="px-3 py-2 text-right">Beløb</th>
								<th class="px-3 py-2 text-right">Handling</th>
							</tr>
						</thead>
						<tbody>
							{#each data.ignoredTransactions as tx}
								<tr
									class="border-b border-slate-100/50 text-slate-500 line-through decoration-slate-300 dark:border-white/5 dark:text-slate-400 dark:decoration-slate-600"
								>
									<td class="px-3 py-2">{formatDate(tx.date)}</td>
									<td class="max-w-[200px] truncate px-3 py-2" title={tx.text}>{tx.text}</td>
									<td class="px-3 py-2 text-right">{formatCur(tx.amount)}</td>
									<td class="px-3 py-2 text-right no-underline">
										<form method="POST" action="?/restoreTransaction" use:enhance>
											<input type="hidden" name="transactionId" value={tx.id} />
											<button
												type="submit"
												class="rounded bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
											>
												Gendan
											</button>
										</form>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	{/if}
</div>

<!-- CATEGORY EDITOR MODAL -->
{#if isCategoryEditorOpen}
	<div
		class="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm duration-200"
	>
		<div
			class="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-800"
		>
			<div
				class="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-6 dark:border-white/5 dark:bg-slate-900"
			>
				<h2 class="flex items-center gap-2 text-xl font-black text-slate-800 dark:text-white">
					<span>🏷️</span> Administrer Kategorier
				</h2>
				<button
					onclick={() => (isCategoryEditorOpen = false)}
					class="flex h-8 w-8 items-center justify-center rounded-full font-bold text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-white"
					>✕</button
				>
			</div>

			<div class="flex-1 space-y-6 overflow-y-auto p-6">
				<!-- Create/Edit Form -->
				<div
					class="relative rounded-2xl border border-indigo-100 bg-indigo-50 p-5 dark:border-indigo-500/20 dark:bg-indigo-900/10"
				>
					<h3 class="mb-4 text-sm font-bold text-indigo-800 dark:text-indigo-300">
						{editingCategory ? 'Ret Kategori' : 'Ny Kategori'}
					</h3>
					<form
						method="POST"
						action={editingCategory ? '?/updateCategoryDetails' : '?/createCategory'}
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								editingCategory = null;
							};
						}}
						class="flex flex-wrap items-end gap-3"
					>
						{#if editingCategory?.id}
							<input type="hidden" name="id" value={editingCategory.id} />
						{/if}
						<div class="w-20">
							<label class="mb-1 block text-xs font-bold text-slate-500">Emoji</label>
							<input
								type="text"
								name="icon"
								value={editingCategory?.icon || '📦'}
								class="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900"
							/>
						</div>
						<div class="min-w-[200px] flex-1">
							<label class="mb-1 block text-xs font-bold text-slate-500">Kategori Navn</label>
							<input
								type="text"
								name="name"
								value={editingCategory?.name || ''}
								required
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
							/>
						</div>
						<div class="flex gap-2">
							<button
								type="submit"
								class="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-500 active:scale-95"
							>
								{editingCategory ? 'Gem' : 'Opret'}
							</button>
							{#if editingCategory}
								<button
									type="button"
									onclick={() => (editingCategory = null)}
									class="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
								>
									Annuller
								</button>
							{/if}
						</div>
					</form>
				</div>

				<!-- List -->
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					{#each data.transactionCategories as cat}
						<div
							class="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-indigo-300 dark:border-white/5 dark:bg-slate-900/50 dark:hover:border-indigo-500/50"
						>
							<div class="flex items-center gap-3">
								<span class="text-xl">{cat.icon || '📦'}</span>
								<span class="text-sm font-bold text-slate-700 dark:text-slate-200">{cat.name}</span>
							</div>
							<div
								class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<button
									onclick={() => (editingCategory = cat)}
									class="rounded-lg p-2 text-indigo-500 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-500/20"
									title="Ret">✏️</button
								>
								<form
									method="POST"
									action="?/deleteCategory"
									use:enhance
									onsubmit={(e) => {
										if (
											!confirm(`Slet ${cat.name}? Dette fjerner kategorien fra evt. transaktioner.`)
										)
											e.preventDefault();
									}}
								>
									<input type="hidden" name="id" value={cat.id} />
									<button
										type="submit"
										class="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/20"
										title="Slet">🗑️</button
									>
								</form>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
