import { prisma } from '$lib/server/prisma';
import { fail } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { PageServerLoad, Actions } from './$types';
import { env } from '$env/dynamic/private';

const formatDateLocal = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const load: PageServerLoad = async ({ url, locals }) => {
	const now = new Date();

	// 1. Læs URL parametre (eller brug fallback til nuværende måned)
	const fromParam = url.searchParams.get('from');
	const toParam = url.searchParams.get('to');

	let fromDate: Date;
	let toDate: Date;

	if (fromParam && toParam) {
		const [fy, fm, fd] = fromParam.split('-').map(Number);
		fromDate = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
		const [ty, tm, td] = toParam.split('-').map(Number);
		toDate = new Date(ty, tm - 1, td, 23, 59, 59, 999);
	} else {
		// Nuværende måned
		fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
		toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
	}

	const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
	const daysInPeriod = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
	const periodKey = `${formatDateLocal(fromDate)}_${formatDateLocal(toDate)}`;

	// Fetch Data
	const [
		transactions,
		expensesAgg,
		allWishes,
		transactionCategories,
		aiInsight,
		realizedWishes,
		ignoredTransactions
	] = await Promise.all([
		prisma.transaction.findMany({
			where: {
				date: { gte: fromDate, lte: toDate },
				amount: { lt: 0 },
				isIgnored: false
			},
			include: { category: true, item: true },
			orderBy: { date: 'desc' }
		}),
		prisma.transaction.aggregate({
			where: {
				date: { gte: fromDate, lte: toDate },
				amount: { lt: 0 },
				isIgnored: false
			},
			_sum: { amount: true }
		}),
		prisma.item.findMany({
			where: { status: 'WISH' },
			include: { category: true, user: true },
			orderBy: [{ desireLevel: 'desc' }, { price: 'desc' }]
		}),
		prisma.transactionCategory.findMany({ orderBy: { name: 'asc' } }),
		locals.user
			? prisma.aiInsight.findUnique({
					where: {
						userId_period: {
							userId: locals.user.id,
							period: periodKey
						}
					}
				})
			: Promise.resolve(null),
		prisma.item.findMany({
			where: { status: 'PURCHASED' },
			orderBy: { purchasedAt: 'desc' }
		}),
		prisma.transaction.findMany({
			where: {
				date: { gte: fromDate, lte: toDate },
				amount: { lt: 0 },
				isIgnored: true
			},
			include: { category: true, item: true },
			orderBy: { date: 'desc' }
		})
	]);

	// Calculate KPIs
	const periodExpenses = Math.abs(expensesAgg._sum.amount || 0);
	let unmappedTransactionsCount = 0;
	let largestTransaction = { text: 'Ingen', amount: 0, date: new Date() };

	const categorySpending: Record<string, { name: string; amount: number; color: string }> = {};
	const timeSeries: Record<string, number> = {};

	const fallbackColors = [
		'#6366f1',
		'#ec4899',
		'#14b8a6',
		'#f59e0b',
		'#8b5cf6',
		'#ef4444',
		'#10b981',
		'#3b82f6',
		'#f43f5e',
		'#84cc16',
		'#06b6d4',
		'#d946ef'
	];
	let colorIndex = 0;

	// For cumulative we need transactions grouped by date (ascending)
	const dailyTotals: Record<string, number> = {};
	// For day of week (Mon-Sun: 0-6 in our array, getDay() returns 0 for Sunday)
	const dayOfWeekTotals = [0, 0, 0, 0, 0, 0, 0];

	// Pre-fill timeSeries and dailyTotals with 0s for the entire period to ensure continuous charts
	const fillDate = new Date(fromDate);
	while (fillDate <= toDate) {
		const dateStr = formatDateLocal(fillDate);
		dailyTotals[dateStr] = 0;

		let timeKey;
		if (daysInPeriod <= 31) {
			timeKey = dateStr;
		} else if (daysInPeriod <= 90) {
			const d = new Date(Date.UTC(fillDate.getFullYear(), fillDate.getMonth(), fillDate.getDate()));
			d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
			const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
			const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
			timeKey = `Uge ${weekNo}, ${d.getUTCFullYear()}`;
		} else {
			timeKey = `${fillDate.getFullYear()}-${String(fillDate.getMonth() + 1).padStart(2, '0')}`;
		}

		if (!(timeKey in timeSeries)) {
			timeSeries[timeKey] = 0;
		}
		fillDate.setDate(fillDate.getDate() + 1);
	}

	const processedTransactions = transactions.map((tx) => {
		let timeKey;
		if (daysInPeriod <= 31) {
			timeKey = formatDateLocal(tx.date);
		} else if (daysInPeriod <= 90) {
			const d = new Date(Date.UTC(tx.date.getFullYear(), tx.date.getMonth(), tx.date.getDate()));
			d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
			const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
			const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
			timeKey = `Uge ${weekNo}, ${d.getUTCFullYear()}`;
		} else {
			timeKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
		}
		return { ...tx, timeKey };
	});

	processedTransactions.forEach((tx) => {
		const expense = Math.abs(tx.amount);

		if (!tx.categoryId) unmappedTransactionsCount++;

		if (expense > largestTransaction.amount) {
			largestTransaction = { text: tx.text, amount: expense, date: tx.date };
		}

		const catId = tx.categoryId || 'unmapped';
		if (!categorySpending[catId]) {
			let cColor = tx.category?.color;
			if (!cColor || cColor === '#cbd5e1' || cColor === '#94a3b8') {
				cColor = fallbackColors[colorIndex % fallbackColors.length];
				colorIndex++;
			}
			categorySpending[catId] = {
				name: tx.category?.name || 'Ukategoriseret',
				amount: 0,
				color: cColor
			};
		}
		categorySpending[catId].amount += expense;

		// Time series
		timeSeries[tx.timeKey] += expense;

		// Daily totals for cumulative
		const dateStr = formatDateLocal(tx.date);
		dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + expense;

		// Day of Week
		const day = tx.date.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
		const adjustedDay = day === 0 ? 6 : day - 1; // 0 = Mon ... 6 = Sun
		dayOfWeekTotals[adjustedDay] += expense;
	});

	const avgDailySpend = periodExpenses / daysInPeriod;

	const sortedCategories = Object.values(categorySpending).sort((a, b) => b.amount - a.amount);

	const topCategory = sortedCategories.filter((c) => c.name !== 'Ukategoriseret')[0] || {
		name: 'Ingen',
		amount: 0,
		color: ''
	};
	const top3Categories = sortedCategories.slice(0, 3).map((c) => ({
		...c,
		percentage: periodExpenses > 0 ? ((c.amount / periodExpenses) * 100).toFixed(1) : '0'
	}));

	const donutData = sortedCategories.filter((c) => c.amount > 0);
	const donutSeries = donutData.map((d) => Math.round(d.amount));
	const donutLabels = donutData.map((d) => d.name);
	const donutColors = donutData.map((d) => d.color || '#94a3b8');

	const sortedTimeKeys = Object.keys(timeSeries).sort();
	const barSeries = sortedTimeKeys.map((k) => Math.round(timeSeries[k]));
	const barLabels = sortedTimeKeys;

	// Calculate Cumulative
	const sortedDailyKeys = Object.keys(dailyTotals).sort();
	const cumulativeSeries: number[] = [];
	const cumulativeLabels: string[] = [];
	let runningTotal = 0;

	if (sortedDailyKeys.length > 0) {
		// Fill in missing days
		const startDate = new Date(sortedDailyKeys[0]);
		const endDate = new Date(sortedDailyKeys[sortedDailyKeys.length - 1]);

		for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
			const dStr = formatDateLocal(d);
			runningTotal += dailyTotals[dStr] || 0;
			cumulativeLabels.push(dStr);
			cumulativeSeries.push(Math.round(runningTotal));
		}
	}

	const topWish = allWishes[0] || null;
	const guiltyPleasureSpending = topCategory.amount;
	const guiltyPleasureName = topCategory.name !== 'Ingen' ? topCategory.name : 'Diverse';

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
			bar: { series: [{ name: 'Forbrug', data: barSeries }], labels: barLabels },
			cumulative: {
				series: [{ name: 'Akkumuleret', data: cumulativeSeries }],
				labels: cumulativeLabels
			},
			dayOfWeek: {
				series: [{ name: 'Gns. pr ugedag', data: dayOfWeekTotals.map(Math.round) }],
				labels: ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']
			}
		},
		topWish,
		top3Categories,
		recentTransactions: processedTransactions,
		ignoredTransactions,
		realizedWishes,
		transactionCategories,
		aiInsight,
		periodKey,
		currentFilter: {
			from: formatDateLocal(fromDate),
			to: formatDateLocal(toDate),
			daysInPeriod
		}
	};
};

export const actions: Actions = {
	generateInsight: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const fromStr = data.get('from')?.toString();
		const toStr = data.get('to')?.toString();

		const now = new Date();
		let fromDate: Date;
		let toDate: Date;

		if (fromStr && toStr) {
			const [fy, fm, fd] = fromStr.split('-').map(Number);
			fromDate = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
			const [ty, tm, td] = toStr.split('-').map(Number);
			toDate = new Date(ty, tm - 1, td, 23, 59, 59, 999);
		} else {
			fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
			toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
		}

		const periodKey = `${formatDateLocal(fromDate)}_${formatDateLocal(toDate)}`;

		const isOngoing = now.getTime() >= fromDate.getTime() && now.getTime() <= toDate.getTime();
		const daysInPeriod = Math.max(
			1,
			Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
		);
		let daysPassed = daysInPeriod;
		let daysLeft = 0;

		if (isOngoing) {
			daysPassed = Math.max(
				1,
				Math.ceil((now.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
			);
			daysLeft = Math.max(0, daysInPeriod - daysPassed);
		}

		// 1. Aggregate Financial Data
		const [
			expensesAgg,
			expenses,
			wishes,
			historicalTotalAgg,
			historicalCategoriesAgg,
			oldestTx,
			allCategories
		] = await Promise.all([
			prisma.transaction.aggregate({
				where: { date: { gte: fromDate, lte: toDate }, amount: { lt: 0 }, isIgnored: false },
				_sum: { amount: true }
			}),
			prisma.transaction.findMany({
				where: { date: { gte: fromDate, lte: toDate }, amount: { lt: 0 }, isIgnored: false },
				include: { category: true }
			}),
			prisma.item.findMany({
				where: { status: 'WISH', userId: locals.user.id },
				orderBy: [{ desireLevel: 'desc' }, { price: 'desc' }],
				take: 5
			}),
			prisma.transaction.aggregate({
				where: { date: { lt: fromDate }, amount: { lt: 0 }, isIgnored: false },
				_sum: { amount: true }
			}),
			prisma.transaction.groupBy({
				by: ['categoryId'],
				where: { date: { lt: fromDate }, amount: { lt: 0 }, isIgnored: false },
				_sum: { amount: true }
			}),
			prisma.transaction.findFirst({
				where: { amount: { lt: 0 }, isIgnored: false },
				orderBy: { date: 'asc' }
			}),
			prisma.transactionCategory.findMany({ orderBy: { name: 'asc' } })
		]);

		const totalExpenses = Math.abs(expensesAgg._sum.amount || 0);
		let projectedExpenses = totalExpenses;
		if (isOngoing) {
			projectedExpenses = (totalExpenses / daysPassed) * daysInPeriod;
		}

		let monthsHistorical = 1;
		if (oldestTx && oldestTx.date < fromDate) {
			const mDiff =
				(fromDate.getFullYear() - oldestTx.date.getFullYear()) * 12 +
				(fromDate.getMonth() - oldestTx.date.getMonth());
			monthsHistorical = Math.max(1, mDiff);
		}
		const historicalAvgTotal = Math.abs(historicalTotalAgg._sum.amount || 0) / monthsHistorical;

		const catHistoricalMap: Record<string, number> = {};
		historicalCategoriesAgg.forEach((h) => {
			if (h.categoryId) {
				const catName = allCategories.find((c) => c.id === h.categoryId)?.name || 'Ukategoriseret';
				catHistoricalMap[catName] = (catHistoricalMap[catName] || 0) + Math.abs(h._sum.amount || 0);
			}
		});

		const catMap: Record<string, number> = {};
		const payerMap: Record<string, number> = {};

		expenses.forEach((tx) => {
			const exp = Math.abs(tx.amount);
			const catName = tx.category?.name || 'Ukategoriseret';
			const payer = tx.paidBy || 'Ukendt';

			catMap[catName] = (catMap[catName] || 0) + exp;
			payerMap[payer] = (payerMap[payer] || 0) + exp;
		});

		const formatCur = (val: number) =>
			new Intl.NumberFormat('da-DK', {
				style: 'currency',
				currency: 'DKK',
				maximumFractionDigits: 0
			}).format(val);

		const topCategories = Object.entries(catMap)
			.filter(
				([name]) =>
					!name.toLowerCase().includes('ukategoriseret') && !name.toLowerCase().includes('ukendt')
			)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3);

		const payerText = Object.entries(payerMap)
			.sort((a, b) => b[1] - a[1])
			.map(([payer, amount]) => `- ${payer}: ${formatCur(amount)}`)
			.join('\n');

		// 2. Format Data for Prompt
		const wishesText = wishes
			.map((w) => `- {Name: ${w.title}, Price: ${w.price} DKK, Desire Level: ${w.desireLevel}/5}`)
			.join('\n');

		const categoriesText = topCategories
			.map((c) => {
				const histTotal = catHistoricalMap[c[0]] || 0;
				const histAvg = histTotal / monthsHistorical;
				return `- {${c[0]}: ${formatCur(c[1])}} (Historisk gns. pr. måned: ${formatCur(histAvg)})`;
			})
			.join('\n');

		let promptData = `Data for perioden: ${fromDate.toLocaleDateString('da-DK')} til ${toDate.toLocaleDateString('da-DK')}\n`;
		if (isOngoing) {
			promptData += `- Status: Dette er en IGANGVÆRENDE periode (${daysPassed} dage gået ud af ${daysInPeriod}. Der er ${daysLeft} dage tilbage).\n`;
			promptData += `- Samlet forbrug indtil videre: ${formatCur(totalExpenses)}\n`;
			promptData += `- Forventet totalforbrug (Run-Rate) ved periodens afslutning, hvis tendensen fortsætter: ${formatCur(projectedExpenses)}\n`;
		} else {
			promptData += `- Samlet forbrug for perioden: ${formatCur(totalExpenses)}\n`;
		}

		promptData += `- VIGTIG HISTORISK KONTEKST: Dit normale gennemsnitlige totalforbrug pr. måned (baseret på ${monthsHistorical} måneders historik) er ${formatCur(historicalAvgTotal)}. Hold altid periodens forbrug op imod dette gennemsnit for at vurdere niveauet rigtigt!\n\n`;

		promptData += `Top udgiftskategorier (Ekskl. ukendte poster):\n${categoriesText}\n\n`;
		promptData += `Fordeling af betalere (Hvem har trukket kortet):\n${payerText}\n\n`;
		promptData += `Brugerens Ønsker:\n${wishesText || '- Ingen ønsker registreret endnu.'}\n\n`;
		promptData += `VIGTIGE REGLER FOR DIN ANALYSE:
1. Dette er et udtræk der UDELUKKENDE indeholder udgifter. Du må IKKE kommentere på, at indtægten mangler, eller at økonomien er i fare på grund af dette. Fokusér udelukkende på at analysere forbruget.
2. Vær direkte og brug konkrete tal i din argumentation.`;

		const systemPrompt = `Du er en skarp, analytisk og direkte økonomisk rådgiver. Din tone er professionel, kontant og forståelig for en almindelig voksen på 40 år. Du må ALDRIG bruge buzzwords som "run-rate", "KPI" eller lommefilosofiske floskler. Brug naturligt dansk sprog (f.eks. "forventet forbrug for resten af måneden"). Hold dine sætninger korte og præcise. Undgå at være overdrevet terapeutisk.

Output Structure requested:
Svar KUN med dette Markdown-format:
### 📊 Økonomisk Overblik
[1-2 korte, skarpe sætninger der opsummerer periodens rå forbrugstal. ${isOngoing ? 'Fokusér på det forventede samlede forbrug for hele måneden holdt op imod det historiske gennemsnit, og kommentér på tendensen for de resterende ' + daysLeft + ' dage.' : ''} Inddrag også fordelingen af hvem der betaler (f.eks. "Mathilde har betalt 80% af udgifterne, primært på mad").]

### 🕵️ Lommetyvene
[Fokusér på en af top-kategorierne, der er mest 'fleksibel' (f.eks. Fastfood, Fritid, Tøj). Sammenlign ALTID periodens (eller det forventede) forbrug med det **historiske gennemsnit** for at vurdere, om der bruges for meget. Nævn konkrete beløb og nævn gerne hvem af personerne, der trækker forbruget, hvis relevant].

### 🎯 Forbrug vs. Ønsker
[Lav et direkte, matematisk eksempel. F.eks.: 'Forbruget på X (beløb) svarer til Y% af [Ønske]. Hvis I skar X ned med 30%, ville I kunne købe [Ønske] om Z måneder'].

### 💡 Skarpe Råd
* **[Action 1]:** [Kort, direkte råd${isOngoing ? ' til hvad de konkret bør ændre i de resterende dage' : ''}. Tiltal personerne (Mathilde/Ronni) direkte hvis relevant.]
* **[Action 2]:** [Kort, direkte råd]

Data at basere rådgivningen på:
${promptData}`;

		// 3. Call Gemini
		let apiKey = env.GEMINI_API_KEY;
		if (apiKey) apiKey = apiKey.replace(/^["']|["']$/g, '').trim();

		if (!apiKey) {
			return fail(500, { error: 'GEMINI_API_KEY mangler i miljøvariablerne.' });
		}

		try {
			const genAI = new GoogleGenerativeAI(apiKey);
			const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

			const result = await model.generateContent(systemPrompt);
			const responseContent = result.response.text();

			await prisma.aiInsight.upsert({
				where: {
					userId_period: {
						userId: locals.user.id,
						period: periodKey
					}
				},
				update: {
					content: responseContent
				},
				create: {
					userId: locals.user.id,
					period: periodKey,
					content: responseContent
				}
			});

			return { success: true };
		} catch (error) {
			console.error('AI Generation Error:', error);
			return fail(500, { error: 'Der opstod en fejl under generering af rådgivning.' });
		}
	},

	updateCategory: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const data = await request.formData();
		const transactionId = data.get('transactionId')?.toString();
		const categoryId = data.get('categoryId')?.toString();

		if (!transactionId || !categoryId) return fail(400, { error: 'Missing data' });

		try {
			await prisma.transaction.update({
				where: { id: transactionId },
				data: {
					categoryId,
					status: 'PROCESSED'
				}
			});
			return { success: true };
		} catch {
			return fail(500, { error: 'Kunne ikke opdatere kategori' });
		}
	},

	linkWish: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const data = await request.formData();
		const transactionId = data.get('transactionId')?.toString();
		const itemId = data.get('itemId')?.toString();

		if (!transactionId || !itemId) return fail(400, { error: 'Missing data' });

		try {
			await prisma.transaction.update({
				where: { id: transactionId },
				data: {
					itemId,
					status: 'PROCESSED'
				}
			});
			return { success: true };
		} catch {
			return fail(500, { error: 'Kunne ikke tilknytte ønske' });
		}
	},

	createRealizedWish: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const data = await request.formData();
		const transactionId = data.get('transactionId')?.toString();

		if (!transactionId) return fail(400, { error: 'Missing data' });

		try {
			const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
			if (!tx) return fail(404, { error: 'Transaktion ikke fundet' });

			let itemCategoryId = 8;
			const category = await prisma.category.findFirst({ where: { name: 'Diverse' } });
			if (category) itemCategoryId = category.id;
			else {
				const anyCategory = await prisma.category.findFirst();
				if (anyCategory) itemCategoryId = anyCategory.id;
			}

			const newItem = await prisma.item.create({
				data: {
					userId: locals.user.id,
					title: tx.text,
					price: Math.abs(tx.amount),
					categoryId: itemCategoryId,
					expenseType: 'PERSONAL',
					status: 'PURCHASED',
					purchasedAt: new Date()
				}
			});

			await prisma.transaction.update({
				where: { id: transactionId },
				data: {
					itemId: newItem.id,
					status: 'PROCESSED'
				}
			});

			return { success: true };
		} catch {
			return fail(500, { error: 'Kunne ikke oprette ønske' });
		}
	},

	bulkGroupToWish: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const data = await request.formData();
		const transactionIdsStr = data.get('transactionIds')?.toString();
		const groupName = data.get('groupName')?.toString();

		if (!transactionIdsStr || !groupName) return fail(400, { error: 'Manglende data' });

		const transactionIds = JSON.parse(transactionIdsStr) as string[];
		if (!Array.isArray(transactionIds) || transactionIds.length === 0)
			return fail(400, { error: 'Ingen transaktioner valgt' });

		try {
			const txs = await prisma.transaction.findMany({
				where: { id: { in: transactionIds } }
			});

			const sum = txs.reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

			let itemCategoryId = 8;
			const category = await prisma.category.findFirst({ where: { name: 'Diverse' } });
			if (category) itemCategoryId = category.id;
			else {
				const anyCategory = await prisma.category.findFirst();
				if (anyCategory) itemCategoryId = anyCategory.id;
			}

			const newItem = await prisma.item.create({
				data: {
					userId: locals.user.id,
					title: groupName,
					price: sum,
					categoryId: itemCategoryId,
					expenseType: 'PERSONAL',
					status: 'PURCHASED',
					purchasedAt: new Date()
				}
			});

			await prisma.transaction.updateMany({
				where: { id: { in: transactionIds } },
				data: {
					itemId: newItem.id,
					status: 'PROCESSED'
				}
			});

			return { success: true };
		} catch {
			return fail(500, { error: 'Kunne ikke oprette gruppe-ønske' });
		}
	},

	ignoreTransaction: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const data = await request.formData();
		const transactionId = data.get('transactionId')?.toString();

		if (!transactionId) return fail(400, { error: 'Missing data' });

		try {
			await prisma.transaction.update({
				where: { id: transactionId },
				data: { isIgnored: true }
			});
			return { success: true };
		} catch {
			return fail(500, { error: 'Kunne ikke ignorere postering' });
		}
	},

	restoreTransaction: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const data = await request.formData();
		const transactionId = data.get('transactionId')?.toString();

		if (!transactionId) return fail(400, { error: 'Missing data' });

		try {
			await prisma.transaction.update({
				where: { id: transactionId },
				data: { isIgnored: false }
			});
			return { success: true };
		} catch {
			return fail(500, { error: 'Kunne ikke gendanne postering' });
		}
	},

	createCategory: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const data = await request.formData();
		const name = data.get('name')?.toString();
		const icon = data.get('icon')?.toString() || '';

		if (!name) return fail(400, { error: 'Navn er påkrævet' });

		try {
			await prisma.transactionCategory.create({
				data: { name, icon }
			});
			return { success: true };
		} catch {
			return fail(500, { error: 'Kunne ikke oprette kategori' });
		}
	},

	updateCategoryDetails: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString();
		const icon = data.get('icon')?.toString() || '';

		if (!id || !name) return fail(400, { error: 'Manglende data' });

		try {
			await prisma.transactionCategory.update({
				where: { id },
				data: { name, icon }
			});
			return { success: true };
		} catch {
			return fail(500, { error: 'Kunne ikke opdatere kategori' });
		}
	},

	deleteCategory: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) return fail(400, { error: 'Manglende data' });

		try {
			// Først sæt relaterede transaktioner til UNPROCESSED (Prisma kan ikke cascade set null her uden konfiguration)
			await prisma.transaction.updateMany({
				where: { categoryId: id },
				data: { categoryId: null, status: 'UNPROCESSED' }
			});

			await prisma.mappingRule.deleteMany({
				where: { categoryId: id }
			});

			await prisma.transactionCategory.delete({
				where: { id }
			});
			return { success: true };
		} catch {
			return fail(500, { error: 'Kunne ikke slette kategori' });
		}
	}
};
