// Klient-sikker fælles-zone for aktiemodulet: typer + UI-metadata for AI-analysen.
// Indeholder INGEN hemmeligheder og importeres både af +page.server.ts og +page.svelte.

export type PortfolioVerdict = 'HOLD' | 'REDUCE' | 'ADD' | 'SELL' | 'MIXED';
export type StockVerdict = 'ADD' | 'HOLD' | 'REDUCE' | 'SELL';
export type AnalysisScope = 'PORTFOLIO' | 'STOCK';
export type AnalysisThesisStatus = 'OK' | 'PRESSURE' | 'BROKEN';

export interface AnalysisPosition {
	ticker: string;
	verdict: StockVerdict;
	thesisStatus: AnalysisThesisStatus;
	rationale: string;
	keyRisk: string;
}

export interface StockAnalysisData {
	overallVerdict: PortfolioVerdict;
	summaryMarkdown: string;
	positions: AnalysisPosition[];
	portfolioRisks: string[];
	suggestions: string[];
}

export interface AnalysisSummary {
	id: string;
	scope: AnalysisScope;
	stockId: string | null;
	ticker: string | null;
	model: string;
	verdict: PortfolioVerdict | null;
	content: string;
	data: StockAnalysisData | null;
	snapshotValueDkk: number | null;
	createdAt: string;
}

interface VerdictMeta {
	label: string;
	icon: string;
	badgeCls: string;
	dotCls: string;
}

export const verdictMeta: Record<PortfolioVerdict, VerdictMeta> = {
	ADD: {
		label: 'Køb',
		icon: '🟢',
		badgeCls: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
		dotCls: 'bg-emerald-500'
	},
	HOLD: {
		label: 'Behold',
		icon: '⚪',
		badgeCls: 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300',
		dotCls: 'bg-slate-400'
	},
	REDUCE: {
		label: 'Reducer',
		icon: '🟠',
		badgeCls: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
		dotCls: 'bg-amber-500'
	},
	SELL: {
		label: 'Sælg',
		icon: '🔴',
		badgeCls: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
		dotCls: 'bg-rose-500'
	},
	MIXED: {
		label: 'Blandet',
		icon: '🟣',
		badgeCls: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
		dotCls: 'bg-violet-500'
	}
};

export const thesisStatusMeta: Record<AnalysisThesisStatus, VerdictMeta> = {
	OK: {
		label: 'Tese intakt',
		icon: '✅',
		badgeCls: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
		dotCls: 'bg-emerald-500'
	},
	PRESSURE: {
		label: 'Tese under pres',
		icon: '⚠️',
		badgeCls: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
		dotCls: 'bg-amber-500'
	},
	BROKEN: {
		label: 'Tese brudt',
		icon: '⛔',
		badgeCls: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
		dotCls: 'bg-rose-500'
	}
};

// Pædagogiske begrebsforklaringer (9.0) til tooltips i AI-sektionen
export const conceptExplanations: Record<string, string> = {
	kostpris:
		'Kostpris = (aktiepris i DKK + 0,25 % valutavekslingsgebyr + 25 kr. kurtage) pr. aktie. Dette er dit break-even-niveau.',
	avkast:
		'Urealiseret afkast = (aktuel kurs × antal aktier × valutakurs) − kostpris. Viser dit papir-gevinst/tab i DKK.',
	valutastødpude:
		'Valutastødpude: USD/DKK-kursen svinger mellem ca. 6,20 og 7,20. En svag dollar kan spise 10–15 % af dit afkast — eller give dig en ekstra gevinst.',
	pe: 'P/E = kurs ÷ indtjening pr. aktie (EPS). Trailing bruger sidste 12 måneder, forward bruger analytikernes forventning til de kommende 12 måneder.',
	multipel:
		'Multipelkompression = kursen falder relativt til indtjeningen (P/E falder), selvom selskabet præsterer stabilt.'
};

export function scopeLabel(scope: AnalysisScope, ticker: string | null): string {
	return scope === 'PORTFOLIO' ? 'Portefølje' : (ticker ?? 'Aktie');
}

const PORTFOLIO_VERDICTS: PortfolioVerdict[] = ['HOLD', 'REDUCE', 'ADD', 'SELL', 'MIXED'];
const STOCK_VERDICTS: StockVerdict[] = ['ADD', 'HOLD', 'REDUCE', 'SELL'];
const THESIS_STATUSES: AnalysisThesisStatus[] = ['OK', 'PRESSURE', 'BROKEN'];

export function parseAnalysisData(data: unknown): StockAnalysisData | null {
	if (typeof data !== 'object' || data === null) return null;
	const d = data as Record<string, unknown>;
	if (
		typeof d.overallVerdict !== 'string' ||
		!PORTFOLIO_VERDICTS.includes(d.overallVerdict as PortfolioVerdict) ||
		typeof d.summaryMarkdown !== 'string' ||
		!Array.isArray(d.positions)
	) {
		return null;
	}
	const positions = (d.positions as Record<string, unknown>[]).filter((p) => {
		if (typeof p !== 'object' || p === null) return false;
		return (
			typeof p.ticker === 'string' &&
			typeof p.verdict === 'string' &&
			STOCK_VERDICTS.includes(p.verdict as StockVerdict) &&
			typeof p.thesisStatus === 'string' &&
			THESIS_STATUSES.includes(p.thesisStatus as AnalysisThesisStatus) &&
			typeof p.rationale === 'string' &&
			typeof p.keyRisk === 'string'
		);
	});
	return {
		overallVerdict: d.overallVerdict as PortfolioVerdict,
		summaryMarkdown: d.summaryMarkdown,
		positions: positions as unknown as AnalysisPosition[],
		portfolioRisks: Array.isArray(d.portfolioRisks)
			? (d.portfolioRisks as unknown[]).filter((r): r is string => typeof r === 'string')
			: [],
		suggestions: Array.isArray(d.suggestions)
			? (d.suggestions as unknown[]).filter((s): s is string => typeof s === 'string')
			: []
	};
}
