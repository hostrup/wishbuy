// Beregningskerne for aktiemonitorering (Sprint 9.3).
// Rene funktioner uden Prisma-afhængighed: deles af load-funktioner, AI-analyse
// og MCP-tools, så DKK-tal aldrig divergerer mellem UI og agent.

export type StockTransType = 'BUY' | 'SELL';

export interface TransactionInput {
	type: StockTransType;
	date: Date;
	shares: number;
	priceUsd: number;
	rateDkkUsd: number;
	brokerageDkk: number;
	exchangeFeeDkk: number;
}

export interface Position {
	/** Aktuelt antal ejede aktier (køb minus salg). */
	shares: number;
	/** Gennemsnitlig anskaffelseskurs i USD for de tilbageværende aktier. */
	avgCostUsd: number;
	/** Samlet kostpris i DKK (inkl. gebyrer) for de tilbageværende aktier. */
	totalCostDkk: number;
	/** Realiseret gevinst/tab i DKK fra gennemførte salg. */
	realizedGainDkk: number;
}

export interface Unrealized {
	valueDkk: number;
	valueUsd: number;
	gainDkk: number;
	gainPct: number;
}

export interface CurrencyDecomposition {
	/** Samlet afkast i DKK udtrykt som decimal (0,1 = 10%). */
	totalReturn: number;
	/** Bidrag fra aktiekursen alene (USD). */
	priceReturn: number;
	/** Bidrag fra valutakursændring (USD/DKK). */
	currencyReturn: number;
}

/**
 * Reel kostpris i DKK for én handel: aktiebeløb + valutaveksling + kurtage.
 * Bruges til både køb (positivt cashflow ud) og som grundlag for average cost.
 */
export function costBasis(
	tx: Pick<
		TransactionInput,
		'shares' | 'priceUsd' | 'rateDkkUsd' | 'brokerageDkk' | 'exchangeFeeDkk'
	>
): number {
	const shareAmountDkk = tx.shares * tx.priceUsd * tx.rateDkkUsd;
	return shareAmountDkk + tx.exchangeFeeDkk + tx.brokerageDkk;
}

/**
 * Udleder den aktuelle position fra en kronologisk række transaktioner.
 * Bruger average cost basis: ved salg reduceres kostprisen forholdsmæssigt,
 * og realiseret gevinst bogføres mod den gennemsnitlige kostpris.
 */
export function positionFromTransactions(txs: TransactionInput[]): Position {
	const ordered = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());

	let shares = 0;
	let totalCostDkk = 0; // kostpris (DKK, inkl. gebyrer) for de aktuelt ejede aktier
	let totalPriceUsd = 0; // rent USD-aktiebeløb (uden gebyrer) for de ejede aktier
	let realizedGainDkk = 0;

	for (const tx of ordered) {
		if (tx.type === 'BUY') {
			shares += tx.shares;
			totalCostDkk += costBasis(tx);
			totalPriceUsd += tx.shares * tx.priceUsd;
		} else {
			// SELL — sælg op til det ejede antal (oversalg ignoreres her; valideres i action)
			const sellShares = Math.min(tx.shares, shares);
			if (shares <= 0 || sellShares <= 0) continue;

			const fraction = sellShares / shares;
			const costOfSoldDkk = totalCostDkk * fraction;
			const priceOfSoldUsd = totalPriceUsd * fraction;

			// Nettoprovenu i DKK efter gebyrer
			const grossProceedsDkk = sellShares * tx.priceUsd * tx.rateDkkUsd;
			const proceedsDkk = grossProceedsDkk - tx.exchangeFeeDkk - tx.brokerageDkk;

			realizedGainDkk += proceedsDkk - costOfSoldDkk;
			totalCostDkk -= costOfSoldDkk;
			totalPriceUsd -= priceOfSoldUsd;
			shares -= sellShares;
		}
	}

	// Numerisk støj nær nul fjernes
	if (Math.abs(shares) < 1e-9) {
		shares = 0;
		totalCostDkk = 0;
		totalPriceUsd = 0;
	}

	const avgCostUsd = shares > 0 ? totalPriceUsd / shares : 0;

	return {
		shares,
		avgCostUsd,
		totalCostDkk,
		realizedGainDkk
	};
}

/**
 * Urealiseret afkast for en position givet aktuel kurs (USD) og valutakurs.
 */
export function unrealized(position: Position, currentPriceUsd: number, fxNow: number): Unrealized {
	const valueUsd = position.shares * currentPriceUsd;
	const valueDkk = valueUsd * fxNow;
	const gainDkk = valueDkk - position.totalCostDkk;
	const gainPct = position.totalCostDkk > 0 ? gainDkk / position.totalCostDkk : 0;
	return { valueDkk, valueUsd, gainDkk, gainPct };
}

/**
 * Opdeler det samlede DKK-afkast i aktiekurs-effekt og valuta-effekt
 * (valuta-stødpuden): (1 + r_usd) · (1 + r_fx) − 1.
 */
export function currencyDecomposition(
	priceStartUsd: number,
	priceNowUsd: number,
	fxStart: number,
	fxNow: number
): CurrencyDecomposition {
	const priceReturn = priceStartUsd > 0 ? priceNowUsd / priceStartUsd - 1 : 0;
	const currencyReturn = fxStart > 0 ? fxNow / fxStart - 1 : 0;
	const totalReturn = (1 + priceReturn) * (1 + currencyReturn) - 1;
	return { totalReturn, priceReturn, currencyReturn };
}

export interface PositionValuation {
	ticker: string;
	valueDkk: number;
	costDkk: number;
}

export interface PortfolioTotals {
	valueDkk: number;
	costDkk: number;
	gainDkk: number;
	gainPct: number;
	/** Allokering pr. ticker i procent (decimal), summerer til ~1. */
	allocation: Array<{ ticker: string; weight: number; valueDkk: number }>;
}

export function portfolioTotals(positions: PositionValuation[]): PortfolioTotals {
	const valueDkk = positions.reduce((s, p) => s + p.valueDkk, 0);
	const costDkk = positions.reduce((s, p) => s + p.costDkk, 0);
	const gainDkk = valueDkk - costDkk;
	const gainPct = costDkk > 0 ? gainDkk / costDkk : 0;
	const allocation = positions.map((p) => ({
		ticker: p.ticker,
		weight: valueDkk > 0 ? p.valueDkk / valueDkk : 0,
		valueDkk: p.valueDkk
	}));
	return { valueDkk, costDkk, gainDkk, gainPct, allocation };
}

/**
 * Herfindahl-Hirschman-indeks for koncentration (0–1).
 * Tager vægte (decimaler). > 0,4 ≈ høj koncentration.
 */
export function concentrationHHI(weights: number[]): number {
	return weights.reduce((s, w) => s + w * w, 0);
}

export interface ScenarioBand {
	label: string;
	changePct: number; // relativt til kostpris (decimal)
	valueDkk: number;
}

/**
 * Fem scenarier for dec. 2026 relativt til kostprisen, så de skalerer med
 * de faktiske køb i stedet for hardkodede beløb.
 */
export function scenarioBands(costDkk: number): ScenarioBand[] {
	const bands: Array<{ label: string; changePct: number }> = [
		{ label: 'Krise', changePct: -0.28 },
		{ label: 'Kostpris', changePct: 0 },
		{ label: 'Solidt', changePct: 0.13 },
		{ label: 'Base Case', changePct: 0.25 },
		{ label: 'Eufori', changePct: 0.55 }
	];
	return bands.map((b) => ({
		label: b.label,
		changePct: b.changePct,
		valueDkk: costDkk * (1 + b.changePct)
	}));
}

/**
 * Simulator-kerne: fremtidig kurs efter n år givet EPS, årlig vækst og
 * terminal P/E. Fremtidig kurs = EPS·(1+cagr)^n · terminalPE.
 */
export function futurePrice(
	epsTTM: number,
	cagr: number,
	years: number,
	terminalPE: number
): number {
	const futureEps = epsTTM * Math.pow(1 + cagr, years);
	return futureEps * terminalPE;
}

/**
 * Tidsvægtet (simpelt) afkast for benchmark over en periode (decimal).
 */
export function benchmarkReturn(startClose: number, endClose: number): number {
	return startClose > 0 ? endClose / startClose - 1 : 0;
}

/** Dansk talformatering — genbruges af UI og evt. AI-prompt. */
export function formatDkk(value: number): string {
	return new Intl.NumberFormat('da-DK', {
		style: 'currency',
		currency: 'DKK',
		maximumFractionDigits: 0
	}).format(value);
}

export function formatPct(decimal: number): string {
	return new Intl.NumberFormat('da-DK', {
		style: 'percent',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(decimal);
}
