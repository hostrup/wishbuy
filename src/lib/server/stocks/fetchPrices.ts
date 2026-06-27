// Datakilder for aktiemonitorering (Sprint 9.2).
// Eksterne kald sker KUN herfra (via sync-endpoint/cron) — aldrig i load-funktioner.
// Resultater caches i databasen.

import yahooFinance from 'yahoo-finance2';
import { prisma } from '$lib/server/prisma';

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
			const last = rows.at(-1);
			if (!last || typeof last.close !== 'number') {
				throw new Error('Ingen slutkurs i svar');
			}
			const date = startOfDayUtc(new Date(last.date));

			await prisma.stockPriceDaily.upsert({
				where: { stockId_date: { stockId: stock.id, date } },
				update: { closePrice: last.close },
				create: { stockId: stock.id, date, closePrice: last.close }
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
