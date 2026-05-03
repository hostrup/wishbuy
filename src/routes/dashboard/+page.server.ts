import { prisma } from '$lib/server/prisma';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const now = new Date();
	
	// 1. Læs URL parametre (eller brug fallback til nuværende måned)
	const fromParam = url.searchParams.get('from');
	const toParam = url.searchParams.get('to');

	let fromDate: Date;
	let toDate: Date;

	if (fromParam && toParam) {
		fromDate = new Date(fromParam);
		toDate = new Date(toParam);
		toDate.setHours(23, 59, 59, 999);
	} else {
		// Nuværende måned
		fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
		toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
	}

	// Tæl antal dage i perioden til "Dagligt Snit"
	const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
	const daysInPeriod = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

	// 2. Fetch data (Filtreret)
	const [transactions, allWishes, transactionCategories] = await Promise.all([
		prisma.transaction.findMany({
			where: { 
				date: { gte: fromDate, lte: toDate },
				amount: { lt: 0 } // Kun udgifter
			},
			include: { category: true },
			orderBy: { date: 'desc' }
		}),
		prisma.item.findMany({
			where: { status: 'WISH' },
			include: { category: true, user: true },
			orderBy: [
				{ desireLevel: 'desc' },
				{ price: 'desc' }
			]
		}),
		prisma.transactionCategory.findMany()
	]);

	// Calculate KPIs
	let periodExpenses = 0;
	let unmappedTransactionsCount = 0;
	let largestTransaction = { text: 'Ingen', amount: 0, date: new Date() };

	const categorySpending: Record<string, { name: string; amount: number; color: string }> = {};
	const timeSeries: Record<string, number> = {};

	transactions.forEach(tx => {
		const expense = Math.abs(tx.amount);
		periodExpenses += expense;

		if (!tx.categoryId) unmappedTransactionsCount++;

		if (expense > largestTransaction.amount) {
			largestTransaction = { text: tx.text, amount: expense, date: tx.date };
		}

		// Category distribution
		const catId = tx.categoryId || 'unmapped';
		if (!categorySpending[catId]) {
			categorySpending[catId] = {
				name: tx.category?.name || 'Ukategoriseret',
				amount: 0,
				color: tx.category?.color || '#cbd5e1'
			};
		}
		categorySpending[catId].amount += expense;

		// Time-series (Dynamisk grupering afhængig af periode)
		let timeKey = '';
		if (daysInPeriod <= 31) {
			// Daglig
			timeKey = tx.date.toISOString().split('T')[0];
		} else if (daysInPeriod <= 90) {
			// Ugentlig (Approksimation vha ugenummer eller bare start-of-week)
			const d = new Date(Date.UTC(tx.date.getFullYear(), tx.date.getMonth(), tx.date.getDate()));
			d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
			const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
			const weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
			timeKey = `Uge ${weekNo}, ${d.getUTCFullYear()}`;
		} else {
			// Månedlig
			timeKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
		}
		
		timeSeries[timeKey] = (timeSeries[timeKey] || 0) + expense;
	});

	const avgDailySpend = periodExpenses / daysInPeriod;

	// Sort categories
	const sortedCategories = Object.values(categorySpending).sort((a, b) => b.amount - a.amount);
	
	const topCategory = sortedCategories.filter(c => c.name !== 'Ukategoriseret')[0] || { name: 'Ingen', amount: 0, color: '' };
	const top3Categories = sortedCategories.slice(0, 3).map(c => ({
		...c,
		percentage: periodExpenses > 0 ? ((c.amount / periodExpenses) * 100).toFixed(1) : '0'
	}));

	// Format data for Donut Chart
	const donutData = sortedCategories.filter(c => c.amount > 0);
	const donutSeries = donutData.map(d => d.amount);
	const donutLabels = donutData.map(d => d.name);
	const donutColors = donutData.map(d => d.color || '#94a3b8');

	// Format data for Bar Chart (sort by date string)
	const sortedTimeKeys = Object.keys(timeSeries).sort();
	const barSeries = sortedTimeKeys.map(k => timeSeries[k]);
	const barLabels = sortedTimeKeys;

	// Cross-over Feature
	const topWish = allWishes[0] || null;
	let guiltyPleasureSpending = topCategory.amount;
	let guiltyPleasureName = topCategory.name !== 'Ingen' ? topCategory.name : 'Diverse';

	return {
		kpis: {
			periodExpenses,
			topCategoryName: topCategory.name,
			unmappedTransactionsCount,
			guiltyPleasureSpending,
			guiltyPleasureName,
			avgDailySpend,
			largestTransaction
		},
		charts: {
			donut: { series: donutSeries, labels: donutLabels, colors: donutColors },
			bar: { series: [{ name: 'Forbrug', data: barSeries }], labels: barLabels }
		},
		topWish,
		top3Categories,
		recentTransactions: transactions.slice(0, 50),
		transactionCategories,
		currentFilter: {
			from: fromDate.toISOString().split('T')[0],
			to: toDate.toISOString().split('T')[0],
			daysInPeriod
		}
	};
};
