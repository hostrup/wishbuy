import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';
import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import {
	positionFromTransactions,
	unrealized,
	portfolioTotals,
	concentrationHHI,
	scenarioBands,
	type TransactionInput,
	type PortfolioTotals,
	type ScenarioBand
} from '$lib/server/stocks/calc';
import { updateStockQuotes } from '$lib/server/stocks/fetchPrices';
import { checkCostPriceAlerts } from '$lib/server/stocks/costPriceAlerts';
import {
	parseAnalysisData,
	type AnalysisScope,
	type AnalysisSummary,
	type PortfolioVerdict
} from '$lib/stocks/glossary';
import type { Prisma } from '@prisma/client';
import type { Actions, PageServerLoad } from './$types';

// Kurser ældre end dette markeres som "stale" i UI'et.
const STALE_AFTER_MS = 26 * 60 * 60 * 1000; // ~26 timer (dækker en weekend-pause + lidt slæk)

type ThesisStatus = 'OK' | 'PRESSURE' | 'UNKNOWN';

interface PositionSummary {
	id: string;
	ticker: string;
	name: string;
	sector: string | null;
	theme: string | null;
	shares: number;
	avgCostUsd: number;
	totalCostDkk: number;
	currentPriceUsd: number | null;
	dayChangePct: number | null;
	valueDkk: number;
	valueUsd: number;
	gainDkk: number;
	gainPct: number;
	absGainDkk: number;
	isNearCostPrice: boolean;
	peTrailing: number | null;
	peForward: number | null;
	targetPriceUsd: number | null;
	targetUpsidePct: number | null;
	investmentThesis: string | null;
	breakThesisSignal: string | null;
	thesisStatus: ThesisStatus;
	isStale: boolean;
}

const GEMINI_STOCK_MODEL = 'gemini-2.5-flash';
const AI_TIMEOUT_MS = 45000;

function startOfDayUtc(d: Date): Date {
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isUsMarketOpen(): boolean {
	try {
		const now = new Date();
		const nyString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
		const nyDate = new Date(nyString);
		const day = nyDate.getDay(); // 0 = søndag, 6 = lørdag
		if (day === 0 || day === 6) return false;
		const hour = nyDate.getHours();
		const min = nyDate.getMinutes();
		const timeInMinutes = hour * 60 + min;
		// NYSE: 9:30 AM (570 min) - 4:00 PM (960 min)
		return timeInMinutes >= 570 && timeInMinutes <= 960;
	} catch {
		// Fallback til simpelt estimat hvis tidszonen ikke understøttes
		const now = new Date();
		const day = now.getUTCDay();
		if (day === 0 || day === 6) return false;
		const utcHour = now.getUTCHours();
		const utcMin = now.getUTCMinutes();
		const minutesSinceMidnight = utcHour * 60 + utcMin;
		return minutesSinceMidnight >= 780 && minutesSinceMidnight <= 1230;
	}
}

function computePositions(
	stocks: Prisma.StockGetPayload<{ include: { transactions: true } }>[],
	fxRate: number,
	now: number
): PositionSummary[] {
	return stocks
		.map((stock) => {
			const txs: TransactionInput[] = stock.transactions.map((t) => ({
				type: t.type,
				date: t.date,
				shares: t.shares,
				priceUsd: t.priceUsd,
				rateDkkUsd: t.rateDkkUsd,
				brokerageDkk: t.brokerageDkk,
				exchangeFeeDkk: t.exchangeFeeDkk
			}));

			const pos = positionFromTransactions(txs);
			const hasPrice = typeof stock.currentPrice === 'number';
			const price = stock.currentPrice ?? 0;
			const u = unrealized(pos, price, fxRate);

			const dayChangePct =
				hasPrice && stock.previousClose && stock.previousClose > 0
					? price / stock.previousClose - 1
					: null;

			const targetUpsidePct =
				hasPrice && stock.targetPriceUsd && price > 0 ? stock.targetPriceUsd / price - 1 : null;

			// Foreløbig tese-status (let heuristik). Egentlig regel-evaluering kommer i Sprint 9.7.
			let thesisStatus: ThesisStatus = 'OK';
			if (!hasPrice) thesisStatus = 'UNKNOWN';
			else if (u.gainPct <= -0.15) thesisStatus = 'PRESSURE';

			const isStale =
				!stock.lastPriceSyncedAt || now - stock.lastPriceSyncedAt.getTime() > STALE_AFTER_MS;

			const absGainDkk = Math.abs(u.gainDkk);
			const isNearCostPrice = absGainDkk <= 200;

			return {
				id: stock.id,
				ticker: stock.ticker,
				name: stock.name,
				sector: stock.sector,
				theme: stock.theme,
				shares: pos.shares,
				avgCostUsd: pos.avgCostUsd,
				totalCostDkk: pos.totalCostDkk,
				currentPriceUsd: hasPrice ? price : null,
				dayChangePct,
				valueDkk: u.valueDkk,
				valueUsd: u.valueUsd,
				gainDkk: u.gainDkk,
				gainPct: u.gainPct,
				absGainDkk,
				isNearCostPrice,
				peTrailing: stock.peTrailing,
				peForward: stock.peForward,
				targetPriceUsd: stock.targetPriceUsd,
				targetUpsidePct,
				investmentThesis: stock.investmentThesis,
				breakThesisSignal: stock.breakThesisSignal,
				thesisStatus,
				isStale
			};
		})
		.filter((p) => p.shares > 0);
}

export const load: PageServerLoad = async ({ locals }) => {
	const stocks = await prisma.stock.findMany({
		where: { isActive: true, isBenchmark: false },
		include: { transactions: true },
		orderBy: { ticker: 'asc' }
	});

	const latestFx = await prisma.exchangeRateDaily.findFirst({
		where: { base: 'USD', target: 'DKK' },
		orderBy: { date: 'desc' }
	});
	const fxRate = latestFx?.rate ?? 6.44; // fallback til seed-kursen indtil første fx-sync

	const now = Date.now();

	const positions = computePositions(stocks, fxRate, now);

	const totals = portfolioTotals(
		positions.map((p) => ({ ticker: p.ticker, valueDkk: p.valueDkk, costDkk: p.totalCostDkk }))
	);

	// Porteføljens dagsændring i DKK og %
	let dayChangeDkk = 0;
	for (const p of positions) {
		if (p.dayChangePct !== null && p.currentPriceUsd !== null) {
			const prevValueDkk = p.valueDkk / (1 + p.dayChangePct);
			dayChangeDkk += p.valueDkk - prevValueDkk;
		}
	}
	const baseForPct = totals.valueDkk - dayChangeDkk;
	const dayChangePct = baseForPct > 0 ? dayChangeDkk / baseForPct : 0;

	const bands = scenarioBands(totals.costDkk);

	const weights = totals.allocation.map((a) => a.weight);
	const hhi = concentrationHHI(weights);
	const largest = totals.allocation.reduce((max, a) => (a.weight > max.weight ? a : max), {
		ticker: '',
		weight: 0,
		valueDkk: 0
	});

	const history = await buildHistory(
		stocks.map((s) => ({
			id: s.id,
			transactions: s.transactions.map((t) => ({
				type: t.type,
				date: t.date,
				shares: t.shares,
				priceUsd: t.priceUsd,
				rateDkkUsd: t.rateDkkUsd,
				brokerageDkk: t.brokerageDkk,
				exchangeFeeDkk: t.exchangeFeeDkk
			}))
		})),
		fxRate
	);

	const lastSyncedAt = stocks
		.map((s) => s.lastPriceSyncedAt)
		.filter((d): d is Date => d !== null)
		.sort((a, b) => b.getTime() - a.getTime())[0];

	// Flad handelshistorik (nyeste først) til CRUD-sektionen
	const transactions = stocks
		.flatMap((s) =>
			s.transactions.map((t) => ({
				id: t.id,
				ticker: s.ticker,
				type: t.type,
				date: t.date,
				shares: t.shares,
				priceUsd: t.priceUsd,
				rateDkkUsd: t.rateDkkUsd,
				brokerageDkk: t.brokerageDkk,
				exchangeFeeDkk: t.exchangeFeeDkk,
				comment: t.comment
			}))
		)
		.sort((a, b) => b.date.getTime() - a.date.getTime());

	// Aktievalg til "tilføj handel"-dropdown (kun aktive, ikke-benchmark)
	const stockOptions = stocks.map((s) => ({ id: s.id, ticker: s.ticker, name: s.name }));

	// Seneste AI-analyser (seneste først) til historik-sektionen
	const analyses = locals.user
		? await prisma.stockAnalysis.findMany({
				where: { userId: locals.user.id },
				include: { stock: { select: { ticker: true } } },
				orderBy: { createdAt: 'desc' },
				take: 15
			})
		: [];

	return {
		fxRate,
		fxDate: latestFx?.date ?? null,
		hasData: positions.length > 0,
		positions,
		totals,
		dayChange: { dkk: dayChangeDkk, pct: dayChangePct },
		scenarioBands: bands,
		concentration: { hhi, largestTicker: largest.ticker, largestWeight: largest.weight },
		allocation: totals.allocation,
		history,
		lastSyncedAt: lastSyncedAt ?? null,
		transactions,
		stockOptions,
		marketOpen: isUsMarketOpen(),
		analyses: analyses.map(serializeAnalysis)
	};
};

/**
 * Bygger den historiske udvikling: porteføljeværdi vs. kostpris pr. handelsdag.
 * For hver dag med en slutkurs beregnes positionen som-af-dagen ud fra
 * transaktionshistorikken, så mid-period køb/salg håndteres korrekt.
 */
async function buildHistory(
	stocks: Array<{ id: string; transactions: TransactionInput[] }>,
	fxFallback: number
): Promise<{ dates: string[]; valueSeries: number[]; costSeries: number[] }> {
	const stockIds = stocks.map((s) => s.id);
	if (stockIds.length === 0) return { dates: [], valueSeries: [], costSeries: [] };

	const [dailyPrices, fxRates] = await Promise.all([
		prisma.stockPriceDaily.findMany({
			where: { stockId: { in: stockIds } },
			orderBy: { date: 'asc' }
		}),
		prisma.exchangeRateDaily.findMany({
			where: { base: 'USD', target: 'DKK' },
			orderBy: { date: 'asc' }
		})
	]);

	if (dailyPrices.length === 0) return { dates: [], valueSeries: [], costSeries: [] };

	// Seneste kendte fx pr. dag (carry-forward)
	function fxOn(date: Date): number {
		let rate = fxFallback;
		for (const r of fxRates) {
			if (r.date.getTime() <= date.getTime()) rate = r.rate;
			else break;
		}
		return rate;
	}

	// closePrice pr. (stockId, dato)
	const priceByStockDate = new Map<string, number>();
	const dateSet = new Set<number>();
	for (const dp of dailyPrices) {
		const key = startOfDayUtc(dp.date).getTime();
		priceByStockDate.set(`${dp.stockId}:${key}`, dp.closePrice);
		dateSet.add(key);
	}

	const sortedDates = [...dateSet].sort((a, b) => a - b);
	const dates: string[] = [];
	const valueSeries: number[] = [];
	const costSeries: number[] = [];

	const txByStock = new Map<string, TransactionInput[]>();
	for (const s of stocks) {
		txByStock.set(s.id, s.transactions);
	}

	for (const dayMs of sortedDates) {
		const day = new Date(dayMs);
		const fx = fxOn(day);
		let valueDkk = 0;
		let costDkk = 0;

		for (const s of stocks) {
			const txsUpToDay = (txByStock.get(s.id) ?? []).filter((t) => t.date.getTime() <= dayMs);
			if (txsUpToDay.length === 0) continue;
			const pos = positionFromTransactions(txsUpToDay);
			costDkk += pos.totalCostDkk;
			const close = priceByStockDate.get(`${s.id}:${dayMs}`);
			if (typeof close === 'number' && pos.shares > 0) {
				valueDkk += pos.shares * close * fx;
			}
		}

		dates.push(day.toISOString().slice(0, 10));
		valueSeries.push(Math.round(valueDkk));
		costSeries.push(Math.round(costDkk));
	}

	return { dates, valueSeries, costSeries };
}

function num(v: FormDataEntryValue | null): number {
	if (v === null) return NaN;
	// Accepter både komma og punktum som decimalseparator
	return Number(v.toString().trim().replace(',', '.'));
}

export const actions: Actions = {
	syncPrices: async ({ locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });
		try {
			await updateStockQuotes();
			const alertResult = await checkCostPriceAlerts(200);
			return { success: true, alertResult };
		} catch (err) {
			return fail(500, {
				error: err instanceof Error ? err.message : 'Kunne ikke opdatere kurser'
			});
		}
	},

	checkCostAlerts: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });
		const formData = await request.formData();
		const force = formData.get('force') === 'true';

		try {
			const alertResult = await checkCostPriceAlerts(200, force);
			return { success: true, alertResult };
		} catch (err) {
			return fail(500, {
				error: err instanceof Error ? err.message : 'Kunne ikke tjekke kostpris-notifikationer'
			});
		}
	},

	addTransaction: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });
		const data = await request.formData();
		const stockId = data.get('stockId')?.toString();
		const type = data.get('type')?.toString();
		const dateStr = data.get('date')?.toString();
		const shares = num(data.get('shares'));
		const priceUsd = num(data.get('priceUsd'));
		const rateDkkUsd = num(data.get('rateDkkUsd'));
		const brokerageDkk = num(data.get('brokerageDkk'));
		const exchangeFeeRaw = data.get('exchangeFeeDkk');
		const comment = data.get('comment')?.toString() || null;

		if (!stockId || (type !== 'BUY' && type !== 'SELL')) {
			return fail(400, { error: 'Vælg aktie og handelstype.' });
		}
		if (!dateStr) return fail(400, { error: 'Angiv en dato.' });
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return fail(400, { error: 'Ugyldig dato.' });
		if (date.getTime() > Date.now())
			return fail(400, { error: 'Datoen kan ikke ligge i fremtiden.' });
		if (!(shares > 0)) return fail(400, { error: 'Antal skal være større end 0.' });
		if (!(priceUsd > 0)) return fail(400, { error: 'Kurs skal være større end 0.' });
		if (!(rateDkkUsd > 0)) return fail(400, { error: 'Valutakurs skal være større end 0.' });

		const stock = await prisma.stock.findUnique({
			where: { id: stockId },
			include: { transactions: true }
		});
		if (!stock) return fail(404, { error: 'Aktien findes ikke.' });

		const shareAmountDkk = shares * priceUsd * rateDkkUsd;
		// Hvis valutaveksling ikke er udfyldt, beregn den som 0,25% af handelssummen
		let exchangeFeeDkk = num(exchangeFeeRaw);
		if (
			exchangeFeeRaw === null ||
			exchangeFeeRaw.toString().trim() === '' ||
			isNaN(exchangeFeeDkk)
		) {
			exchangeFeeDkk = Math.round(shareAmountDkk * 0.0025 * 100) / 100;
		}
		const brokerage = isNaN(brokerageDkk) ? 25 : brokerageDkk;

		if (type === 'SELL') {
			const txs: TransactionInput[] = stock.transactions.map((t) => ({
				type: t.type,
				date: t.date,
				shares: t.shares,
				priceUsd: t.priceUsd,
				rateDkkUsd: t.rateDkkUsd,
				brokerageDkk: t.brokerageDkk,
				exchangeFeeDkk: t.exchangeFeeDkk
			}));
			const owned = positionFromTransactions(txs).shares;
			if (shares > owned + 1e-9) {
				return fail(400, {
					error: `Du kan ikke sælge ${shares} aktier — du ejer kun ${owned} ${stock.ticker}.`
				});
			}
		}

		await prisma.stockTransaction.create({
			data: {
				stockId,
				type,
				date,
				shares,
				priceUsd,
				rateDkkUsd,
				brokerageDkk: brokerage,
				exchangeFeeDkk,
				comment
			}
		});

		return { success: true };
	},

	addStock: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });
		const data = await request.formData();
		const ticker = data.get('ticker')?.toString().trim().toUpperCase();
		const name = data.get('name')?.toString().trim();
		const investmentThesis = data.get('investmentThesis')?.toString() || '';
		const breakThesisSignal = data.get('breakThesisSignal')?.toString() || '';
		const sector = data.get('sector')?.toString() || null;
		const theme = data.get('theme')?.toString() || null;

		if (!ticker) return fail(400, { error: 'Angiv en ticker.' });
		if (!name) return fail(400, { error: 'Angiv et selskabsnavn.' });

		const existing = await prisma.stock.findUnique({ where: { ticker } });
		if (existing) return fail(409, { error: `Aktien ${ticker} findes allerede.` });

		await prisma.stock.create({
			data: {
				ticker,
				name,
				description: name,
				investmentThesis,
				breakThesisSignal,
				sector,
				theme
			}
		});

		// Kurser udfyldes ved næste sync-kørsel (eller via /api/stocks/sync?mode=quotes).
		return { success: true, createdTicker: ticker };
	},

	deleteTransaction: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'Mangler transaktions-id.' });
		await prisma.stockTransaction.delete({ where: { id } });
		return { success: true };
	},

	requestPortfolioAnalysis: async ({ locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });
		const result = await runStockAnalysis(locals.user.id, 'PORTFOLIO', null);
		if (!result.success) return fail(result.status, { error: result.error });
		return { success: true, analysis: result.analysis };
	},

	requestStockAnalysis: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });
		const data = await request.formData();
		const stockId = data.get('stockId')?.toString();
		if (!stockId) return fail(400, { error: 'Manglende aktie-id.' });
		const stock = await prisma.stock.findUnique({
			where: { id: stockId },
			select: { id: true, ticker: true }
		});
		if (!stock) return fail(404, { error: 'Aktien findes ikke.' });
		const result = await runStockAnalysis(locals.user.id, 'STOCK', stockId);
		if (!result.success) return fail(result.status, { error: result.error });
		return { success: true, analysis: result.analysis };
	}
};

// ---------- AI-porteføljeanalyse (9.8) ----------

interface AnalysisContext {
	fxRate: number;
	fxDate: string | null;
	positions: PositionSummary[];
	totals: PortfolioTotals;
	dayChange: { dkk: number; pct: number };
	bands: ScenarioBand[];
	hhi: number;
	largestTicker: string;
	largestWeight: number;
	marketOpen: boolean;
	benchmarks: Array<{ ticker: string; dayChangePct: number | null }>;
}

async function buildAnalysisContext(userId: string): Promise<AnalysisContext> {
	const stocks = await prisma.stock.findMany({
		where: { isActive: true },
		include: { transactions: true },
		orderBy: { ticker: 'asc' }
	});

	const latestFx = await prisma.exchangeRateDaily.findFirst({
		where: { base: 'USD', target: 'DKK' },
		orderBy: { date: 'desc' }
	});
	const fxRate = latestFx?.rate ?? 6.44;

	const actives = stocks.filter((s) => !s.isBenchmark);
	const positions = computePositions(actives, fxRate, Date.now());
	const totals = portfolioTotals(
		positions.map((p) => ({ ticker: p.ticker, valueDkk: p.valueDkk, costDkk: p.totalCostDkk }))
	);

	let dayChangeDkk = 0;
	for (const p of positions) {
		if (p.dayChangePct !== null && p.currentPriceUsd !== null) {
			const prevValueDkk = p.valueDkk / (1 + p.dayChangePct);
			dayChangeDkk += p.valueDkk - prevValueDkk;
		}
	}
	const baseForPct = totals.valueDkk - dayChangeDkk;
	const dayChange = { dkk: dayChangeDkk, pct: baseForPct > 0 ? dayChangeDkk / baseForPct : 0 };

	const bands = scenarioBands(totals.costDkk);
	const hhi = concentrationHHI(totals.allocation.map((a) => a.weight));
	const largest = totals.allocation.reduce((max, a) => (a.weight > max.weight ? a : max), {
		ticker: '',
		weight: 0,
		valueDkk: 0
	});

	const benchmarks = stocks
		.filter((s) => s.isBenchmark)
		.map((s) => ({
			ticker: s.ticker,
			dayChangePct:
				typeof s.currentPrice === 'number' && s.previousClose && s.previousClose > 0
					? s.currentPrice / s.previousClose - 1
					: null
		}));

	return {
		fxRate,
		fxDate: latestFx?.date?.toISOString().slice(0, 10) ?? null,
		positions,
		totals,
		dayChange,
		bands,
		hhi,
		largestTicker: largest.ticker,
		largestWeight: largest.weight,
		marketOpen: isUsMarketOpen(),
		benchmarks
	};
}

function buildAnalysisPrompt(
	ctx: AnalysisContext,
	scope: AnalysisScope,
	stockId: string | null
): string {
	const fmt = (n: number) => Math.round(n).toLocaleString('da-DK');
	const lines: string[] = [
		'Du er porteføljerådgiver for familien Hostrup (private investorer i Danmark).',
		'Svar ALTID på dansk, vær konkret og direkte, og brug KUN de tal du får herunder.',
		''
	];

	if (scope === 'PORTFOLIO') {
		lines.push(`Porteføljeværdi: ${fmt(ctx.totals.valueDkk)} DKK`);
		lines.push(
			`Urealiseret afkast: ${fmt(ctx.totals.gainDkk)} DKK (${(ctx.totals.gainPct * 100).toFixed(1)} %)`
		);
		lines.push(
			`Dagsændring: ${fmt(ctx.dayChange.dkk)} DKK (${(ctx.dayChange.pct * 100).toFixed(2)} %)`
		);
		lines.push(`Kostpris (basis for scenarier): ${fmt(ctx.totals.costDkk)} DKK`);
		lines.push(`Valutakurs: 1 USD = ${ctx.fxRate.toFixed(2)} DKK (pr. ${ctx.fxDate ?? 'ukendt'})`);
		lines.push(
			`Koncentration (HHI): ${ctx.hhi.toFixed(2)} (0 = helt spredt, 1 = én aktie). Største position: ${ctx.largestTicker} (${(ctx.largestWeight * 100).toFixed(0)} %)`
		);
		lines.push(`US-markedet er ${ctx.marketOpen ? 'åbent' : 'lukket'} lige nu.`);
		const bench = ctx.benchmarks
			.map(
				(b) =>
					`${b.ticker} ${b.dayChangePct !== null ? `${(b.dayChangePct * 100).toFixed(2)} %` : 'ingen kurs'}`
			)
			.join(', ');
		if (bench) lines.push(`Benchmark i dag: ${bench}.`);
		lines.push(
			`Scenarier (dec. 2026, DKK): ${ctx.bands.map((b) => `${b.label} ${fmt(b.valueDkk)}`).join(', ')}.`
		);
		lines.push('');
		lines.push('POSITIONER:');
		for (const p of ctx.positions) {
			lines.push(
				`- ${p.ticker} (${p.sector ?? 'ukendt sektor'}${p.theme ? ` / ${p.theme}` : ''}): ${p.shares} stk., gns. kostpris ${p.avgCostUsd.toFixed(2)} USD, kurs ${p.currentPriceUsd?.toFixed(2) ?? 'n/a'} USD (${p.dayChangePct !== null ? `${(p.dayChangePct * 100).toFixed(2)} % i dag` : 'ingen kurs'}), værdi ${fmt(p.valueDkk)} DKK, afkast ${(p.gainPct * 100).toFixed(1)} %, P/E trailing ${p.peTrailing?.toFixed(1) ?? 'n/a'}, P/E forward ${p.peForward?.toFixed(1) ?? 'n/a'}, target-afstand ${p.targetUpsidePct !== null ? `${(p.targetUpsidePct * 100).toFixed(1)} %` : 'n/a'}, tesestatus: ${p.thesisStatus}`
			);
			if (p.investmentThesis) lines.push(`  Tese: ${p.investmentThesis}`);
			if (p.breakThesisSignal) lines.push(`  Brud-signal: ${p.breakThesisSignal}`);
		}
	} else {
		const p = ctx.positions.find((x) => x.id === stockId);
		if (p) {
			lines.push(
				`ANALYSE AF ENKELT-AKTIE: ${p.ticker} (${p.sector ?? 'ukendt sektor'}${p.theme ? ` / ${p.theme}` : ''})`
			);
			lines.push(
				`Position: ${p.shares} stk., gns. kostpris ${p.avgCostUsd.toFixed(2)} USD, kurs ${p.currentPriceUsd?.toFixed(2) ?? 'n/a'} USD (${p.dayChangePct !== null ? `${(p.dayChangePct * 100).toFixed(2)} % i dag` : 'ingen kurs'}), værdi ${fmt(p.valueDkk)} DKK, afkast ${(p.gainPct * 100).toFixed(1)} %`
			);
			lines.push(
				`P/E trailing ${p.peTrailing?.toFixed(1) ?? 'n/a'}, P/E forward ${p.peForward?.toFixed(1) ?? 'n/a'}, target-afstand ${p.targetUpsidePct !== null ? `${(p.targetUpsidePct * 100).toFixed(1)} %` : 'n/a'}, tesestatus: ${p.thesisStatus}`
			);
			if (p.investmentThesis) lines.push(`Tese: ${p.investmentThesis}`);
			if (p.breakThesisSignal) lines.push(`Brud-signal: ${p.breakThesisSignal}`);
			lines.push('');
			lines.push(
				`Kontekst: porteføljeværdi ${fmt(ctx.totals.valueDkk)} DKK, USD/DKK ${ctx.fxRate.toFixed(2)}, HHI ${ctx.hhi.toFixed(2)}, marked ${ctx.marketOpen ? 'åbent' : 'lukket'}.`
			);
		}
	}

	lines.push('');
	lines.push(
		'Bedøm hver position med: ADD (køb mere), HOLD (behold), REDUCE (skær ned), SELL (sælg). ThesisStatus: OK (tese intakt), PRESSURE (under pres), BROKEN (brudt).'
	);
	lines.push(
		'Returnér JSON i det specificerede skema. summaryMarkdown skal være korte danske afsnit med fed markup (**...**) til nøgletal, max 2-3 afsnit.'
	);
	return lines.join('\n');
}

const positionSchema: Schema = {
	type: SchemaType.OBJECT,
	description: 'Dom for én position',
	properties: {
		ticker: { type: SchemaType.STRING, description: 'Ticker (f.eks. NVDA)' },
		verdict: { type: SchemaType.STRING, format: 'enum', enum: ['ADD', 'HOLD', 'REDUCE', 'SELL'] },
		thesisStatus: { type: SchemaType.STRING, format: 'enum', enum: ['OK', 'PRESSURE', 'BROKEN'] },
		rationale: { type: SchemaType.STRING, description: 'Kort begrundelse på dansk' },
		keyRisk: { type: SchemaType.STRING, description: 'Vigtigste risiko på dansk' }
	},
	required: ['ticker', 'verdict', 'thesisStatus', 'rationale', 'keyRisk']
};

const analysisSchema: Schema = {
	type: SchemaType.OBJECT,
	description: 'AI-porteføljeanalyse',
	properties: {
		overallVerdict: {
			type: SchemaType.STRING,
			format: 'enum',
			enum: ['HOLD', 'REDUCE', 'ADD', 'SELL', 'MIXED'],
			description: 'Overordnet dom for hele porteføljen'
		},
		summaryMarkdown: { type: SchemaType.STRING, description: 'Resumé på dansk i markdown' },
		positions: { type: SchemaType.ARRAY, items: positionSchema },
		portfolioRisks: {
			type: SchemaType.ARRAY,
			items: { type: SchemaType.STRING },
			description: 'Porteføljerisici på dansk'
		},
		suggestions: {
			type: SchemaType.ARRAY,
			items: { type: SchemaType.STRING },
			description: 'Konkrete forslag på dansk'
		}
	},
	required: ['overallVerdict', 'summaryMarkdown', 'positions', 'portfolioRisks', 'suggestions']
};

function serializeAnalysis(a: {
	id: string;
	scope: string;
	stockId: string | null;
	model: string;
	verdict: string | null;
	content: string;
	data: unknown;
	snapshotValueDkk: number | null;
	createdAt: Date;
	stock?: { ticker: string } | null;
}): AnalysisSummary {
	return {
		id: a.id,
		scope: a.scope as AnalysisScope,
		stockId: a.stockId,
		ticker: a.stock?.ticker ?? null,
		model: a.model,
		verdict: a.verdict as PortfolioVerdict | null,
		content: a.content,
		data: parseAnalysisData(a.data),
		snapshotValueDkk: a.snapshotValueDkk,
		createdAt: a.createdAt.toISOString()
	};
}

async function runStockAnalysis(
	userId: string,
	scope: AnalysisScope,
	stockId: string | null
): Promise<
	{ success: true; analysis: AnalysisSummary } | { success: false; status: number; error: string }
> {
	const apiKey = (env.GEMINI_API_KEY ?? '').replace(/^["']|["']$/g, '');
	if (!apiKey)
		return { success: false, status: 500, error: 'GEMINI_API_KEY mangler i miljøvariablerne.' };

	const ctx = await buildAnalysisContext(userId);
	const prompt = buildAnalysisPrompt(ctx, scope, stockId);

	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({
		model: GEMINI_STOCK_MODEL,
		generationConfig: { responseMimeType: 'application/json', responseSchema: analysisSchema }
	});

	try {
		const result = await model.generateContent(prompt, {
			signal: AbortSignal.timeout(AI_TIMEOUT_MS)
		});
		const text = result.response.text();
		let parsed = parseAnalysisData(text);
		if (!parsed) {
			// responseSchema er sat, men gem så på en ren JSON-parse for en sikkerheds skyld
			try {
				parsed = parseAnalysisData(JSON.parse(text));
			} catch {
				parsed = null;
			}
		}
		if (!parsed) {
			return {
				success: false,
				status: 500,
				error: 'AI-analysen kunne ikke fortolkes. Prøv igen om lidt.'
			};
		}

		const saved = await prisma.stockAnalysis.create({
			data: {
				userId,
				scope,
				stockId,
				model: GEMINI_STOCK_MODEL,
				verdict: parsed.overallVerdict,
				content: parsed.summaryMarkdown,
				data: parsed as unknown as Prisma.InputJsonValue,
				snapshotValueDkk: Math.round(ctx.totals.valueDkk)
			}
		});

		return { success: true, analysis: serializeAnalysis(saved) };
	} catch (err) {
		if (err instanceof Error && err.name === 'TimeoutError') {
			return {
				success: false,
				status: 504,
				error: 'AI-analyse tog for lang tid. Prøv igen om lidt.'
			};
		}
		console.error('AI-porteføljeanalyse fejlede:', err);
		return {
			success: false,
			status: 500,
			error: 'Der opstod en fejl under generering af analysen.'
		};
	}
}
