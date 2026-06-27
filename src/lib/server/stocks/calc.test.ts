import { describe, it, expect } from 'vitest';
import {
	costBasis,
	positionFromTransactions,
	unrealized,
	currencyDecomposition,
	portfolioTotals,
	concentrationHHI,
	scenarioBands,
	futurePrice,
	benchmarkReturn,
	type TransactionInput
} from './calc';

const FX = 6.44;

function buy(shares: number, priceUsd: number, date = '2026-06-04'): TransactionInput {
	const shareAmountDkk = shares * priceUsd * FX;
	return {
		type: 'BUY',
		date: new Date(`${date}T00:00:00Z`),
		shares,
		priceUsd,
		rateDkkUsd: FX,
		brokerageDkk: 25,
		exchangeFeeDkk: Math.round(shareAmountDkk * 0.0025 * 100) / 100
	};
}

describe('costBasis', () => {
	it('beregner AVGO-eksemplet til ~2.647 kr.', () => {
		// 1 aktie @ $406,14, fx 6,44 → 2.615,54 + 6,54 veksling + 25 kurtage
		const cb = costBasis(buy(1, 406.14));
		expect(cb).toBeCloseTo(2647.08, 1);
	});

	it('straffer små portioner relativt mere pga. fast kurtage', () => {
		const small = costBasis(buy(1, 100)) / (1 * 100 * FX);
		const large = costBasis(buy(100, 100)) / (100 * 100 * FX);
		expect(small).toBeGreaterThan(large);
	});
});

describe('positionFromTransactions', () => {
	it('summerer to køb til korrekt antal og gns. USD-kurs', () => {
		const pos = positionFromTransactions([buy(2, 100), buy(2, 200)]);
		expect(pos.shares).toBe(4);
		expect(pos.avgCostUsd).toBeCloseTo(150, 6); // (2·100 + 2·200)/4
		expect(pos.realizedGainDkk).toBe(0);
	});

	it('realiserer gevinst ved delsalg mod average cost', () => {
		const txs: TransactionInput[] = [
			buy(2, 100),
			{
				type: 'SELL',
				date: new Date('2026-07-01T00:00:00Z'),
				shares: 1,
				priceUsd: 150,
				rateDkkUsd: FX,
				brokerageDkk: 25,
				exchangeFeeDkk: 0
			}
		];
		const pos = positionFromTransactions(txs);
		expect(pos.shares).toBe(1);
		// Kostpris for 2 @ 100: 2·100·6,44 = 1288 + veksling 3,22 + 25 = 1316,22 → halvdelen = 658,11
		// Provenu for 1 @ 150: 150·6,44 = 966 − 0 − 25 = 941
		expect(pos.realizedGainDkk).toBeCloseTo(941 - 658.11, 1);
		// Tilbageværende kostpris ~ halvdelen
		expect(pos.totalCostDkk).toBeCloseTo(658.11, 1);
	});

	it('nulstiller position når alt sælges', () => {
		const txs: TransactionInput[] = [
			buy(1, 100),
			{
				type: 'SELL',
				date: new Date('2026-07-01T00:00:00Z'),
				shares: 1,
				priceUsd: 120,
				rateDkkUsd: FX,
				brokerageDkk: 25,
				exchangeFeeDkk: 0
			}
		];
		const pos = positionFromTransactions(txs);
		expect(pos.shares).toBe(0);
		expect(pos.totalCostDkk).toBe(0);
		expect(pos.avgCostUsd).toBe(0);
	});
});

describe('unrealized', () => {
	it('beregner urealiseret afkast i DKK og %', () => {
		const pos = positionFromTransactions([buy(2, 100)]);
		const u = unrealized(pos, 120, FX);
		expect(u.valueDkk).toBeCloseTo(2 * 120 * FX, 6);
		expect(u.gainDkk).toBeCloseTo(u.valueDkk - pos.totalCostDkk, 6);
		expect(u.gainPct).toBeCloseTo(u.gainDkk / pos.totalCostDkk, 6);
	});
});

describe('currencyDecomposition', () => {
	it('afbøder kursfald når dollaren styrkes (stødpude)', () => {
		// PLTR-eksempel: aktie −6%, valuta +1% → samlet ~ −5,06%
		const d = currencyDecomposition(100, 94, 6.44, 6.44 * 1.01);
		expect(d.priceReturn).toBeCloseTo(-0.06, 6);
		expect(d.currencyReturn).toBeCloseTo(0.01, 6);
		expect(d.totalReturn).toBeCloseTo((1 - 0.06) * (1 + 0.01) - 1, 6);
		expect(d.totalReturn).toBeGreaterThan(-0.06); // mindre tab end ren aktie-effekt
	});
});

describe('portfolioTotals & concentrationHHI', () => {
	it('summerer værdi, kostpris og allokering', () => {
		const t = portfolioTotals([
			{ ticker: 'A', valueDkk: 600, costDkk: 500 },
			{ ticker: 'B', valueDkk: 400, costDkk: 500 }
		]);
		expect(t.valueDkk).toBe(1000);
		expect(t.costDkk).toBe(1000);
		expect(t.gainDkk).toBe(0);
		expect(t.allocation.find((a) => a.ticker === 'A')?.weight).toBeCloseTo(0.6, 6);
	});

	it('HHI er højere ved koncentration', () => {
		const spread = concentrationHHI([0.25, 0.25, 0.25, 0.25]);
		const concentrated = concentrationHHI([0.7, 0.1, 0.1, 0.1]);
		expect(concentrated).toBeGreaterThan(spread);
		expect(spread).toBeCloseTo(0.25, 6);
	});
});

describe('scenarioBands', () => {
	it('skalerer relativt til kostprisen', () => {
		const bands = scenarioBands(10000);
		expect(bands.find((b) => b.label === 'Kostpris')?.valueDkk).toBe(10000);
		expect(bands.find((b) => b.label === 'Base Case')?.valueDkk).toBe(12500);
		expect(bands.find((b) => b.label === 'Krise')?.valueDkk).toBe(7200);
	});
});

describe('futurePrice (multipel-kompression)', () => {
	it('kan give ~0% kursafkast trods kraftig EPS-vækst', () => {
		// PLTR: EPS $0,91, vækst 35%/år i 5 år, men P/E 160 → 35
		const today = 0.91 * 160; // ~146
		const future = futurePrice(0.91, 0.35, 5, 35);
		expect(future).toBeCloseTo(0.91 * Math.pow(1.35, 5) * 35, 4);
		// Tæt på dagens kurs trods firdobling af EPS
		expect(Math.abs(future - today) / today).toBeLessThan(0.05);
	});
});

describe('benchmarkReturn', () => {
	it('beregner simpelt periodeafkast', () => {
		expect(benchmarkReturn(100, 110)).toBeCloseTo(0.1, 6);
		expect(benchmarkReturn(0, 110)).toBe(0);
	});
});
