import { prisma } from '$lib/server/prisma';
import {
	positionFromTransactions,
	unrealized,
	portfolioTotals,
	concentrationHHI,
	scenarioBands,
	type TransactionInput
} from '$lib/server/stocks/calc';
import type { PageServerLoad } from './$types';

// Kurser ældre end dette markeres som "stale" i UI'et.
const STALE_AFTER_MS = 26 * 60 * 60 * 1000; // ~26 timer (dækker en weekend-pause + lidt slæk)

type ThesisStatus = 'OK' | 'PRESSURE' | 'UNKNOWN';

function startOfDayUtc(d: Date): Date {
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export const load: PageServerLoad = async () => {
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

	const positions = stocks
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
		lastSyncedAt: lastSyncedAt ?? null
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
