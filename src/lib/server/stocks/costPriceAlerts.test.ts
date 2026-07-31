import { describe, it, expect } from 'vitest';
import {
	evaluatePositionCostPrice,
	formatCostPriceTelegramMessage,
	type CostPriceCheckInput,
	type CostPriceEvaluation
} from './costPriceAlerts';

const FX = 6.44;

function createStockInput(
	ticker: string,
	shares: number,
	priceUsd: number,
	currentPriceUsd: number | null
): CostPriceCheckInput {
	const shareAmountDkk = shares * priceUsd * FX;
	return {
		id: `stock-${ticker}`,
		ticker,
		name: `${ticker} Corp`,
		currentPriceUsd,
		lastCostAlertAt: null,
		transactions: [
			{
				type: 'BUY',
				date: new Date('2026-06-04T00:00:00Z'),
				shares,
				priceUsd,
				rateDkkUsd: FX,
				brokerageDkk: 25,
				exchangeFeeDkk: Math.round(shareAmountDkk * 0.0025 * 100) / 100
			}
		]
	};
}

describe('evaluatePositionCostPrice', () => {
	it('returnerer null hvis currentPriceUsd mangler eller er 0', () => {
		const input = createStockInput('TEST', 10, 100, null);
		expect(evaluatePositionCostPrice(input, FX, 200)).toBeNull();
	});

	it('registrerer isNearCostPrice = true når forskel er under 200 kr.', () => {
		// 10 aktier købt til $100. Kostpris = 10*100*6.44 = 6440 + 25 + 16.1 = 6481.1 DKK
		// Hvis nuværende kurs er $100.62: Værdi = 10 * 100.62 * 6.44 = 6479.928 DKK
		// Afstand = |6479.928 - 6481.1| = ~1.17 DKK (som er <= 200 DKK)
		const input = createStockInput('PLTR', 10, 100, 100.62);
		const ev = evaluatePositionCostPrice(input, FX, 200);

		expect(ev).not.toBeNull();
		if (ev) {
			expect(ev.ticker).toBe('PLTR');
			expect(ev.isNearCostPrice).toBe(true);
			expect(ev.absDiffDkk).toBeLessThanOrEqual(200);
		}
	});

	it('registrerer isNearCostPrice = false når forskel overstiger 200 kr.', () => {
		// Kostpris ~6481.1 DKK. Hvis nuværende kurs er $150: Værdi = 10 * 150 * 6.44 = 9660 DKK
		// Afstand = 3178.9 DKK (> 200 DKK)
		const input = createStockInput('NVDA', 10, 100, 150);
		const ev = evaluatePositionCostPrice(input, FX, 200);

		expect(ev).not.toBeNull();
		if (ev) {
			expect(ev.isNearCostPrice).toBe(false);
			expect(ev.absDiffDkk).toBeGreaterThan(200);
		}
	});
});

describe('formatCostPriceTelegramMessage', () => {
	it('formaterer tom liste som tom streng', () => {
		expect(formatCostPriceTelegramMessage([], 200)).toBe('');
	});

	it('formaterer enkelt aktie med Telegram HTML tags og DKK tal', () => {
		const evaluation: CostPriceEvaluation = {
			id: '1',
			ticker: 'PLTR',
			name: 'Palantir Technologies',
			shares: 10,
			avgCostUsd: 100,
			totalCostDkk: 6481,
			currentPriceUsd: 100.5,
			currentValueDkk: 6472,
			diffDkk: -9,
			absDiffDkk: 9,
			diffPct: -0.0013,
			isNearCostPrice: true
		};

		const msg = formatCostPriceTelegramMessage([evaluation], 200);
		expect(msg).toContain('<b>PLTR</b>');
		expect(msg).toContain('Palantir Technologies');
		expect(msg).toContain('Grænseværdi: inden for');
		expect(msg).toContain('Afstand til kostpris');
		expect(msg).toContain('Wishbuy Hub');
	});
});
