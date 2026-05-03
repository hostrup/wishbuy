import { prisma } from '$lib/server/prisma';
import { fail } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const now = new Date();
	
	// 1. Læs URL parametre (eller brug fallback til nuværende måned)
	const fromParam = url.searchParams.get('from');
	const toParam = url.searchParams.get('to');
	// Period tab for AI: 'CURRENT_MONTH' | 'LAST_MONTH' | 'CURRENT_YEAR'
	const aiPeriod = url.searchParams.get('aiPeriod') || 'CURRENT_MONTH';

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

	// Fetch Data
	const [transactions, expensesAgg, allWishes, transactionCategories, aiInsight] = await Promise.all([
		prisma.transaction.findMany({
			where: { 
				date: { gte: fromDate, lte: toDate },
				amount: { lt: 0 }
			},
			include: { category: true, item: true },
			orderBy: { date: 'desc' }
		}),
		prisma.transaction.aggregate({
			where: { 
				date: { gte: fromDate, lte: toDate },
				amount: { lt: 0 }
			},
			_sum: { amount: true }
		}),
		prisma.item.findMany({
			where: { status: 'WISH' },
			include: { category: true, user: true },
			orderBy: [
				{ desireLevel: 'desc' },
				{ price: 'desc' }
			]
		}),
		prisma.transactionCategory.findMany(),
		locals.user ? prisma.aiInsight.findUnique({
			where: {
				userId_period: {
					userId: locals.user.id,
					period: aiPeriod
				}
			}
		}) : Promise.resolve(null)
	]);

	// Calculate KPIs
	let periodExpenses = Math.abs(expensesAgg._sum.amount || 0);
	let unmappedTransactionsCount = 0;
	let largestTransaction = { text: 'Ingen', amount: 0, date: new Date() };

	const categorySpending: Record<string, { name: string; amount: number; color: string }> = {};
	const timeSeries: Record<string, number> = {};

	transactions.forEach(tx => {
		const expense = Math.abs(tx.amount);

		if (!tx.categoryId) unmappedTransactionsCount++;

		if (expense > largestTransaction.amount) {
			largestTransaction = { text: tx.text, amount: expense, date: tx.date };
		}

		const catId = tx.categoryId || 'unmapped';
		if (!categorySpending[catId]) {
			categorySpending[catId] = {
				name: tx.category?.name || 'Ukategoriseret',
				amount: 0,
				color: tx.category?.color || '#cbd5e1'
			};
		}
		categorySpending[catId].amount += expense;

		let timeKey = '';
		if (daysInPeriod <= 31) {
			timeKey = tx.date.toISOString().split('T')[0];
		} else if (daysInPeriod <= 90) {
			const d = new Date(Date.UTC(tx.date.getFullYear(), tx.date.getMonth(), tx.date.getDate()));
			d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
			const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
			const weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
			timeKey = `Uge ${weekNo}, ${d.getUTCFullYear()}`;
		} else {
			timeKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
		}
		timeSeries[timeKey] = (timeSeries[timeKey] || 0) + expense;
	});

	const avgDailySpend = periodExpenses / daysInPeriod;

	const sortedCategories = Object.values(categorySpending).sort((a, b) => b.amount - a.amount);
	
	const topCategory = sortedCategories.filter(c => c.name !== 'Ukategoriseret')[0] || { name: 'Ingen', amount: 0, color: '' };
	const top3Categories = sortedCategories.slice(0, 3).map(c => ({
		...c,
		percentage: periodExpenses > 0 ? ((c.amount / periodExpenses) * 100).toFixed(1) : '0'
	}));

	const donutData = sortedCategories.filter(c => c.amount > 0);
	const donutSeries = donutData.map(d => Math.round(d.amount));
	const donutLabels = donutData.map(d => d.name);
	const donutColors = donutData.map(d => d.color || '#94a3b8');

	const sortedTimeKeys = Object.keys(timeSeries).sort();
	const barSeries = sortedTimeKeys.map(k => Math.round(timeSeries[k]));
	const barLabels = sortedTimeKeys;

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
		activeWishes: allWishes,
		transactionCategories,
		aiInsight,
		aiPeriod,
		currentFilter: {
			from: fromDate.toISOString().split('T')[0],
			to: toDate.toISOString().split('T')[0],
			daysInPeriod
		}
	};
};

export const actions: Actions = {
	generateInsight: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const period = data.get('period')?.toString() || 'CURRENT_MONTH'; // 'CURRENT_MONTH' | 'LAST_MONTH' | 'CURRENT_YEAR'

		const now = new Date();
		let fromDate: Date;
		let toDate: Date;

		if (period === 'LAST_MONTH') {
			fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
			toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
		} else if (period === 'CURRENT_YEAR') {
			fromDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
			toDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
		} else {
			fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
			toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
		}

		// 1. Aggregate Financial Data
		const [incomes, expensesAgg, expenses, wishes] = await Promise.all([
			prisma.transaction.aggregate({
				where: { date: { gte: fromDate, lte: toDate }, amount: { gt: 0 } },
				_sum: { amount: true }
			}),
			prisma.transaction.aggregate({
				where: { date: { gte: fromDate, lte: toDate }, amount: { lt: 0 } },
				_sum: { amount: true }
			}),
			prisma.transaction.findMany({
				where: { date: { gte: fromDate, lte: toDate }, amount: { lt: 0 } },
				include: { category: true }
			}),
			prisma.item.findMany({
				where: { status: 'WISH', userId: locals.user.id },
				orderBy: [{ desireLevel: 'desc' }, { price: 'desc' }],
				take: 5
			})
		]);

		const totalIncome = incomes._sum.amount || 0;
		let totalExpenses = Math.abs(expensesAgg._sum.amount || 0);
		const catMap: Record<string, number> = {};

		expenses.forEach(tx => {
			const exp = Math.abs(tx.amount);
			const catName = tx.category?.name || 'Ukategoriseret';
			catMap[catName] = (catMap[catName] || 0) + exp;
		});

		const topCategories = Object.entries(catMap)
			.filter(([name]) => !name.toLowerCase().includes('ukategoriseret') && !name.toLowerCase().includes('ukendt'))
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3);

		const formatCur = (val: number) => new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(val);

		// 2. Format Data for Prompt
		const wishesText = wishes.map(w => `- {Name: ${w.title}, Price: ${w.price} DKK, Desire Level: ${w.desireLevel}/5}`).join('\n');
		const categoriesText = topCategories.map(c => `- {${c[0]}: ${formatCur(c[1])}}`).join('\n');

		const promptData = `Data for perioden:
- Samlet forbrug: ${formatCur(totalExpenses)}
- Top udgiftskategorier (Ekskl. ukendte poster): 
${categoriesText}

Brugerens Ønsker:
${wishesText || '- Ingen ønsker registreret endnu.'}

VIGTIGE REGLER FOR DIN ANALYSE:
1. Dette er et udtræk der UDELUKKENDE indeholder udgifter. Du må IKKE kommentere på, at indtægten mangler, eller at økonomien er i fare på grund af dette. Fokusér udelukkende på at analysere forbruget.
2. Vær direkte og brug konkrete tal i din argumentation.`;

		const systemPrompt = `Du er en skarp, analytisk og direkte økonomisk rådgiver. Din tone er professionel, kontant og data-drevet, men stadig opmuntrende. Du må ALDRIG bruge lommefilosofiske floskler, og du skal undgå at være overdrevet terapeutisk. Hold dine sætninger korte og præcise.

Output Structure requested:
Svar KUN med dette Markdown-format:
### 📊 Økonomisk Overblik
[1-2 korte, skarpe sætninger der opsummerer periodens rå forbrugstal uden at dramatisere].

### 🕵️ Lommetyvene
[Fokusér på den af top-kategorierne, der er mest 'fleksibel' (f.eks. Fastfood, Fritid, Tøj, Abonnementer, Dagligvarer). Nævn det præcise beløb og stil et kort, kritisk spørgsmål til, om niveauet er nødvendigt].

### 🎯 Forbrug vs. Ønsker
[Lav et direkte, matematisk eksempel. F.eks.: 'Dit forbrug på X (beløb) svarer til Y% af [Ønske]. Hvis du skar X ned med 30%, ville du kunne købe [Ønske] om Z måneder'].

### 💡 Skarpe Råd
* **[Action 1]:** [Kort beskrivelse]
* **[Action 2]:** [Kort beskrivelse]

Data at basere rådgivningen på:
${promptData}`;

		// 3. Call Gemini
		const apiKey = process.env.GEMINI_API_KEY;
		if (!apiKey) {
			return fail(500, { error: 'GEMINI_API_KEY mangler i miljøvariablerne.' });
		}

		try {
			const genAI = new GoogleGenerativeAI(apiKey);
			const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

			const result = await model.generateContent(systemPrompt);
			const responseContent = result.response.text();

			// 4. Upsert AiInsight
			await prisma.aiInsight.upsert({
				where: {
					userId_period: {
						userId: locals.user.id,
						period
					}
				},
				update: {
					content: responseContent
				},
				create: {
					userId: locals.user.id,
					period,
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
				data: { categoryId }
			});
			return { success: true };
		} catch (e) { return fail(500, { error: 'Kunne ikke opdatere kategori' }); }
	},

	linkWish: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const data = await request.formData();
		const transactionId = data.get('transactionId')?.toString();
		const itemId = data.get('itemId')?.toString();

		if (!transactionId || !itemId) return fail(400, { error: 'Missing data' });

		try {
			await prisma.$transaction([
				prisma.transaction.update({
					where: { id: transactionId },
					data: { itemId }
				}),
				prisma.item.update({
					where: { id: itemId },
					data: { status: 'PURCHASED', purchasedAt: new Date() }
				})
			]);
			return { success: true };
		} catch (e) { return fail(500, { error: 'Kunne ikke tilknytte ønske' }); }
	},

	createRealizedWish: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const data = await request.formData();
		const transactionId = data.get('transactionId')?.toString();

		if (!transactionId) return fail(400, { error: 'Missing data' });

		try {
			const tx = await prisma.transaction.findUnique({ where: { id: transactionId }});
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
				data: { itemId: newItem.id }
			});

			return { success: true };
		} catch (e) { return fail(500, { error: 'Kunne ikke oprette ønske' }); }
	},

	bulkGroupToWish: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const data = await request.formData();
		const transactionIdsStr = data.get('transactionIds')?.toString();
		const groupName = data.get('groupName')?.toString();

		if (!transactionIdsStr || !groupName) return fail(400, { error: 'Manglende data' });

		const transactionIds = JSON.parse(transactionIdsStr) as string[];
		if (!Array.isArray(transactionIds) || transactionIds.length === 0) return fail(400, { error: 'Ingen transaktioner valgt' });

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
				data: { itemId: newItem.id }
			});

			return { success: true };
		} catch (e) { return fail(500, { error: 'Kunne ikke oprette gruppe-ønske' }); }
	}
};
