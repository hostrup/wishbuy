// Datakilder for aktiemonitorering (Sprint 9.2).
// Eksterne kald sker KUN herfra (via sync-endpoint/cron) — aldrig i load-funktioner.
// Resultater caches i databasen.

import YahooFinance from 'yahoo-finance2';
import { prisma } from '$lib/server/prisma';

// yahoo-finance2 v3 eksporterer en klasse der skal instantieres (modsat v2).
const yahooFinance = new YahooFinance();

export interface SyncResult {
	updated: string[];
	failed: Array<{ ticker: string; error: string }>;
}

// Smalle interfaces for de felter vi læser — afkobler fra yahoo-finance2's
// komplekse union-typer (der ellers resolver til `never` under projektets tsconfig).
interface YahooQuote {
	regularMarketPrice?: number;
	regularMarketPreviousClose?: number;
	trailingPE?: number;
	forwardPE?: number;
	epsTrailingTwelveMonths?: number;
	marketCap?: number;
	marketState?: string;
}

interface YahooFinancialData {
	financialData?: { targetMeanPrice?: number };
}

interface YahooChart {
	quotes: Array<{ date: Date | string; close?: number | null }>;
}

function startOfDayUtc(d: Date): Date {
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Opdaterer currentPrice, previousClose og nøgletal for alle aktier (inkl. benchmarks).
 * Én fejlende ticker afbryder ikke de øvrige.
 */
export async function updateStockQuotes(): Promise<SyncResult> {
	const stocks = await prisma.stock.findMany({
		where: { OR: [{ isActive: true }, { isBenchmark: true }] }
	});
	const result: SyncResult = { updated: [], failed: [] };

	for (const stock of stocks) {
		try {
			const quote = (await yahooFinance.quote(stock.ticker)) as unknown as YahooQuote;
			if (!quote || typeof quote.regularMarketPrice !== 'number') {
				throw new Error('Ingen kurs i svar');
			}

			let targetPriceUsd: number | null = null;
			if (!stock.isBenchmark) {
				try {
					const summary = (await yahooFinance.quoteSummary(stock.ticker, {
						modules: ['financialData']
					})) as unknown as YahooFinancialData;
					targetPriceUsd = summary.financialData?.targetMeanPrice ?? null;
				} catch {
					// Kursmål er valgfrit — ignorér hvis det ikke kan hentes
				}
			}

			await prisma.stock.update({
				where: { id: stock.id },
				data: {
					currentPrice: quote.regularMarketPrice,
					previousClose: quote.regularMarketPreviousClose ?? null,
					peTrailing: quote.trailingPE ?? null,
					peForward: quote.forwardPE ?? null,
					epsTTM: quote.epsTrailingTwelveMonths ?? null,
					marketCap: quote.marketCap ?? null,
					...(targetPriceUsd !== null ? { targetPriceUsd } : {}),
					lastPriceSyncedAt: new Date()
				}
			});
			result.updated.push(stock.ticker);
		} catch (error) {
			result.failed.push({
				ticker: stock.ticker,
				error: error instanceof Error ? error.message : 'Ukendt fejl'
			});
		}
	}

	return result;
}

/**
 * Gemmer dagens slutkurs pr. aktie i StockPriceDaily (til historisk graf).
 * Bruger seneste daglige lukkekurs fra chart-API'et.
 */
export async function updateDailyCloses(): Promise<SyncResult> {
	const stocks = await prisma.stock.findMany({
		where: { OR: [{ isActive: true }, { isBenchmark: true }] }
	});
	const result: SyncResult = { updated: [], failed: [] };

	const period1 = new Date();
	period1.setUTCDate(period1.getUTCDate() - 5); // lille vindue: seneste handelsdag

	for (const stock of stocks) {
		try {
			const chart = (await yahooFinance.chart(stock.ticker, {
				period1,
				interval: '1d'
			})) as unknown as YahooChart;
			const rows = chart.quotes.filter((q) => typeof q.close === 'number');
			if (rows.length === 0) {
				throw new Error('Ingen slutkurs i svar');
			}
			let saved = 0;
			for (const row of rows) {
				if (typeof row.close !== 'number') continue;
				const date = startOfDayUtc(new Date(row.date));
				await prisma.stockPriceDaily.upsert({
					where: { stockId_date: { stockId: stock.id, date } },
					update: { closePrice: row.close },
					create: { stockId: stock.id, date, closePrice: row.close }
				});
				saved++;
			}
			result.updated.push(`${stock.ticker} (${saved} dage)`);
		} catch (error) {
			result.failed.push({
				ticker: stock.ticker,
				error: error instanceof Error ? error.message : 'Ukendt fejl'
			});
		}
	}

	return result;
}

/**
 * Backfill af historiske daglige slutkurser fra porteføljens tidligste transaktion
 * til i dag. Kører kun én gang (idempotent via upsert). Henter chart-data med
 * interval '1d' fra Yahoo Finance for hele perioden.
 */
export async function backfillDailyCloses(): Promise<SyncResult> {
	const stocks = await prisma.stock.findMany({
		where: { OR: [{ isActive: true }, { isBenchmark: true }] },
		include: { transactions: { orderBy: { date: 'asc' }, take: 1 } }
	});
	const result: SyncResult = { updated: [], failed: [] };

	// Tidligste transaktion bestemmer startdatoen for hele porteføljen
	const allFirstDates = stocks.flatMap((s) => s.transactions).map((t) => t.date.getTime());
	if (allFirstDates.length === 0) return result;
	const period1 = new Date(Math.min(...allFirstDates));

	for (const stock of stocks) {
		try {
			const chart = (await yahooFinance.chart(stock.ticker, {
				period1,
				interval: '1d'
			})) as unknown as YahooChart;
			const rows = chart.quotes.filter((q) => typeof q.close === 'number');
			let upserted = 0;
			for (const row of rows) {
				if (typeof row.close !== 'number') continue;
				const date = startOfDayUtc(new Date(row.date));
				await prisma.stockPriceDaily.upsert({
					where: { stockId_date: { stockId: stock.id, date } },
					update: { closePrice: row.close },
					create: { stockId: stock.id, date, closePrice: row.close }
				});
				upserted++;
			}
			result.updated.push(`${stock.ticker} (${upserted} dage)`);
		} catch (error) {
			result.failed.push({
				ticker: stock.ticker,
				error: error instanceof Error ? error.message : 'Ukendt fejl'
			});
		}
	}

	return result;
}

/**
 * Backfill af USD/DKK valutakurser fra porteføljens tidligste transaktion til i dag.
 */
export async function backfillExchangeRates(): Promise<{
	rates: number;
	from: string;
	to: string;
}> {
	const firstTx = await prisma.stockTransaction.findFirst({ orderBy: { date: 'asc' } });
	if (!firstTx) return { rates: 0, from: '', to: '' };

	const from = firstTx.date.toISOString().slice(0, 10);
	const to = new Date().toISOString().slice(0, 10);

	const res = await fetch(`https://api.frankfurter.app/${from}..${to}?from=USD&to=DKK`);
	if (!res.ok) throw new Error(`Frankfurter svarede ${res.status}`);
	const data = (await res.json()) as { rates: Record<string, { DKK: number }> };

	let count = 0;
	for (const [dateStr, rateObj] of Object.entries(data.rates)) {
		const date = startOfDayUtc(new Date(dateStr));
		await prisma.exchangeRateDaily.upsert({
			where: { base_target_date: { base: 'USD', target: 'DKK', date } },
			update: { rate: rateObj.DKK },
			create: { base: 'USD', target: 'DKK', date, rate: rateObj.DKK }
		});
		count++;
	}

	return { rates: count, from, to };
}

/**
 * Henter dagens USD/DKK-kurs via Frankfurter (ECB-data, gratis) og cacher den.
 */
export async function updateExchangeRate(): Promise<{ rate: number; date: Date }> {
	const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=DKK');
	if (!res.ok) throw new Error(`Frankfurter svarede ${res.status}`);
	const data = (await res.json()) as { date: string; rates: { DKK?: number } };
	const rate = data.rates?.DKK;
	if (typeof rate !== 'number') throw new Error('Ingen DKK-kurs i svar');

	const date = startOfDayUtc(new Date(data.date));
	await prisma.exchangeRateDaily.upsert({
		where: { base_target_date: { base: 'USD', target: 'DKK', date } },
		update: { rate },
		create: { base: 'USD', target: 'DKK', date, rate }
	});

	return { rate, date };
}
