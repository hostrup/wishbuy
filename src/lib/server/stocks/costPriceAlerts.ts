import { prisma } from '$lib/server/prisma';
import { positionFromTransactions, formatDkk, type TransactionInput } from '$lib/server/stocks/calc';
import { sendTelegramMessage, type TelegramResult } from '$lib/server/telegram';

export interface CostPriceCheckInput {
	id: string;
	ticker: string;
	name: string;
	currentPrice?: number | null;
	currentPriceUsd?: number | null;
	lastCostAlertAt?: Date | null;
	transactions: Array<{
		type: 'BUY' | 'SELL';
		date: Date;
		shares: number;
		priceUsd: number;
		rateDkkUsd: number;
		brokerageDkk: number;
		exchangeFeeDkk: number;
	}>;
}

export interface CostPriceEvaluation {
	id: string;
	ticker: string;
	name: string;
	shares: number;
	avgCostUsd: number;
	totalCostDkk: number;
	currentPriceUsd: number;
	currentValueDkk: number;
	diffDkk: number; // currentValueDkk - totalCostDkk (positiv = gevinst, negativ = tab)
	absDiffDkk: number; // Math.abs(diffDkk)
	diffPct: number; // diffDkk / totalCostDkk
	isNearCostPrice: boolean; // absDiffDkk <= thresholdDkk
}

export interface CostPriceAlertResult {
	evaluatedCount: number;
	nearCostPriceCount: number;
	alertsSent: string[];
	telegramResult?: TelegramResult;
}

/**
 * 24 timers cooldown mellem notifikationer for samme aktie,
 * så Telegram ikke oversvømmes ved hver kurs-sync.
 */
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Ren funktion til at vurdere om en enkelt aktieposition er nær sin kostpris.
 */
export function evaluatePositionCostPrice(
	input: CostPriceCheckInput,
	fxRate: number,
	thresholdDkk: number = 200
): CostPriceEvaluation | null {
	const priceUsd = input.currentPriceUsd ?? input.currentPrice ?? null;
	if (priceUsd === null || priceUsd <= 0) {
		return null;
	}

	const txs: TransactionInput[] = input.transactions.map((t) => ({
		type: t.type,
		date: t.date,
		shares: t.shares,
		priceUsd: t.priceUsd,
		rateDkkUsd: t.rateDkkUsd,
		brokerageDkk: t.brokerageDkk,
		exchangeFeeDkk: t.exchangeFeeDkk
	}));

	const pos = positionFromTransactions(txs);
	if (pos.shares <= 0 || pos.totalCostDkk <= 0) {
		return null;
	}

	const currentValueDkk = pos.shares * priceUsd * fxRate;
	const diffDkk = currentValueDkk - pos.totalCostDkk;
	const absDiffDkk = Math.abs(diffDkk);
	const diffPct = pos.totalCostDkk > 0 ? diffDkk / pos.totalCostDkk : 0;
	const isNearCostPrice = absDiffDkk <= thresholdDkk;

	return {
		id: input.id,
		ticker: input.ticker,
		name: input.name,
		shares: pos.shares,
		avgCostUsd: pos.avgCostUsd,
		totalCostDkk: pos.totalCostDkk,
		currentPriceUsd: priceUsd,
		currentValueDkk,
		diffDkk,
		absDiffDkk,
		diffPct,
		isNearCostPrice
	};
}

/**
 * Formaterer en flot Telegram HTML-besked for aktier der er nær deres kostpris.
 */
export function formatCostPriceTelegramMessage(
	evaluations: CostPriceEvaluation[],
	thresholdDkk: number = 200
): string {
	if (evaluations.length === 0) return '';

	const header = evaluations.length === 1
		? `🎯 <b>Aktie-notifikation: Nær kostpris!</b>\n`
		: `🎯 <b>Aktie-notifikation: ${evaluations.length} aktier nær kostpris!</b>\n`;

	const itemsText = evaluations.map((e) => {
		const diffSign = e.diffDkk >= 0 ? '+' : '';
		const diffFormatted = `${diffSign}${formatDkk(e.diffDkk)}`;
		const pctFormatted = (e.diffPct * 100).toFixed(2).replace('.', ',');
		const directionText = e.diffDkk >= 0 ? 'over kostpris' : 'under kostpris';

		return (
			`📈 <b>${e.ticker}</b> (${e.name})\n` +
			`• <b>Afstand til kostpris:</b> ${formatDkk(e.absDiffDkk)} (${diffFormatted} / ${diffSign}${pctFormatted}%, ${directionText})\n` +
			`• <b>Aktuel værdi:</b> ${formatDkk(e.currentValueDkk)}\n` +
			`• <b>Samlet kostpris:</b> ${formatDkk(e.totalCostDkk)}\n` +
			`• <b>Aktier:</b> ${e.shares} stk. (Kurs: $${e.currentPriceUsd.toFixed(2)} / Gns. kost: $${e.avgCostUsd.toFixed(2)})`
		);
	}).join('\n\n');

	const footer = `\n\n<i>Grænseværdi: inden for ${formatDkk(thresholdDkk)} af kostpris • Wishbuy Hub</i>`;

	return `${header}\n${itemsText}${footer}`;
}

/**
 * Hovedfunktion: Analyserer aktier i databasen og afsender Telegram-notifikation
 * hvis aktier er inden for `thresholdDkk` (default 200 kr.) af kostprisen.
 */
export async function checkCostPriceAlerts(
	thresholdDkk: number = 200,
	forceAlert: boolean = false
): Promise<CostPriceAlertResult> {
	const stocks = await prisma.stock.findMany({
		where: { isActive: true, isBenchmark: false },
		include: { transactions: true }
	});

	const latestFx = await prisma.exchangeRateDaily.findFirst({
		where: { base: 'USD', target: 'DKK' },
		orderBy: { date: 'desc' }
	});
	const fxRate = latestFx?.rate ?? 6.44;

	const now = Date.now();
	const toNotify: CostPriceEvaluation[] = [];
	const stocksToUpdateLastAlert: string[] = [];
	const stocksToResetAlert: string[] = [];

	let evaluatedCount = 0;
	let nearCostPriceCount = 0;

	for (const stock of stocks) {
		const evalResult = evaluatePositionCostPrice(stock, fxRate, thresholdDkk);
		if (!evalResult) continue;

		evaluatedCount++;

		if (evalResult.isNearCostPrice) {
			nearCostPriceCount++;

			const lastAlertTime = stock.lastCostAlertAt ? stock.lastCostAlertAt.getTime() : 0;
			const isCooldownPassed = forceAlert || !stock.lastCostAlertAt || (now - lastAlertTime > ALERT_COOLDOWN_MS);

			if (isCooldownPassed) {
				toNotify.push(evalResult);
				stocksToUpdateLastAlert.push(stock.id);
			}
		} else {
			// Aktier uden for 200 kr-grænsen nulstilles i DB hvis de tidligere har udløst seneste notifikation
			if (stock.lastCostAlertAt !== null) {
				stocksToResetAlert.push(stock.id);
			}
		}
	}

	// Nulstil lastCostAlertAt for aktier der er bevæget sig væk fra kostprisen
	if (stocksToResetAlert.length > 0) {
		await prisma.stock.updateMany({
			where: { id: { in: stocksToResetAlert } },
			data: { lastCostAlertAt: null }
		});
	}

	if (toNotify.length === 0) {
		return {
			evaluatedCount,
			nearCostPriceCount,
			alertsSent: []
		};
	}

	// Send Telegram-besked
	const message = formatCostPriceTelegramMessage(toNotify, thresholdDkk);
	const telegramResult = await sendTelegramMessage(message);

	// Hvis afsendelse lykkedes (eller ved forceAlert), opdater lastCostAlertAt
	if (telegramResult.success) {
		await prisma.stock.updateMany({
			where: { id: { in: stocksToUpdateLastAlert } },
			data: { lastCostAlertAt: new Date() }
		});
	}

	return {
		evaluatedCount,
		nearCostPriceCount,
		alertsSent: toNotify.map((e) => e.ticker),
		telegramResult
	};
}
