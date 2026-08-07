import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TRADE_DATE = new Date('2026-06-04T00:00:00.000Z');
const FX_RATE = 6.44; // USD -> DKK den 4. juni 2026
const EXCHANGE_FEE_PCT = 0.0025; // Nordnet valutaveksling 0,25%
const BROKERAGE_DKK = 25.0; // Nordnet minimumskurtage

const SEED_COMMENT = 'Initial AI-portefølje (seed 2026-06-04)';

type SeedStock = {
	ticker: string;
	name: string;
	description: string;
	investmentThesis: string;
	breakThesisSignal: string;
	sector: string;
	theme: string;
	shares: number;
	priceUsd: number;
};

const portfolio: SeedStock[] = [
	{
		ticker: 'GOOGL',
		name: 'Alphabet Inc.',
		description: 'Cloud, søgning og Gemini-modeller — fuldt integreret fra chip til model.',
		investmentThesis:
			'Cloud & modeller: Billigste mega-cap AI-aktie (P/E ~27). Fuldt integreret fra chip til Gemini.',
		breakThesisSignal: 'Cloud-vækst falder under 30% y/y. Søge-indtægter falder pga. AI-chatbots.',
		sector: 'Software',
		theme: 'Cloud & Modeller',
		shares: 1,
		priceUsd: 366.025
	}
];

// Benchmarks + reference-aktier (indgår ikke i porteføljen)
const references: Array<{
	ticker: string;
	name: string;
	description: string;
	sector: string;
	theme: string;
	isBenchmark: boolean;
}> = [
	{
		ticker: '^GSPC',
		name: 'S&P 500',
		description: 'Bredt amerikansk aktieindeks — benchmark for porteføljen.',
		sector: 'Index',
		theme: 'Benchmark',
		isBenchmark: true
	},
	{
		ticker: 'QQQ',
		name: 'Nasdaq-100 (Invesco QQQ)',
		description: 'Tech-tungt indeks — benchmark for AI/teknologi-eksponering.',
		sector: 'Index',
		theme: 'Benchmark',
		isBenchmark: true
	}
];

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

async function main() {
	for (const s of portfolio) {
		const stock = await prisma.stock.upsert({
			where: { ticker: s.ticker },
			update: {
				name: s.name,
				description: s.description,
				investmentThesis: s.investmentThesis,
				breakThesisSignal: s.breakThesisSignal,
				sector: s.sector,
				theme: s.theme,
				isActive: true,
				isBenchmark: false
			},
			create: {
				ticker: s.ticker,
				name: s.name,
				description: s.description,
				investmentThesis: s.investmentThesis,
				breakThesisSignal: s.breakThesisSignal,
				sector: s.sector,
				theme: s.theme
			}
		});

		// Idempotent: fjern tidligere seedede transaktioner før genskabelse
		await prisma.stockTransaction.deleteMany({
			where: { stockId: stock.id, comment: SEED_COMMENT }
		});

		const shareAmountDkk = s.shares * s.priceUsd * FX_RATE;
		const exchangeFeeDkk = round2(shareAmountDkk * EXCHANGE_FEE_PCT);

		await prisma.stockTransaction.create({
			data: {
				stockId: stock.id,
				type: 'BUY',
				date: TRADE_DATE,
				shares: s.shares,
				priceUsd: s.priceUsd,
				rateDkkUsd: FX_RATE,
				brokerageDkk: BROKERAGE_DKK,
				exchangeFeeDkk,
				comment: SEED_COMMENT
			}
		});

		const costBasis = round2(shareAmountDkk + exchangeFeeDkk + BROKERAGE_DKK);
		console.log(`✓ ${s.ticker}: ${s.shares} stk @ $${s.priceUsd} → kostpris ${costBasis} kr.`);
	}

	for (const r of references) {
		await prisma.stock.upsert({
			where: { ticker: r.ticker },
			update: {
				name: r.name,
				description: r.description,
				sector: r.sector,
				theme: r.theme,
				isActive: false,
				isBenchmark: r.isBenchmark
			},
			create: {
				ticker: r.ticker,
				name: r.name,
				description: r.description,
				investmentThesis: '',
				breakThesisSignal: '',
				sector: r.sector,
				theme: r.theme,
				isActive: false,
				isBenchmark: r.isBenchmark
			}
		});
		console.log(`✓ Reference: ${r.ticker} (${r.name})`);
	}

	await prisma.exchangeRateDaily.upsert({
		where: { base_target_date: { base: 'USD', target: 'DKK', date: TRADE_DATE } },
		update: { rate: FX_RATE },
		create: { base: 'USD', target: 'DKK', date: TRADE_DATE, rate: FX_RATE }
	});
	console.log(`✓ Valutakurs USD/DKK = ${FX_RATE} (${TRADE_DATE.toISOString().slice(0, 10)})`);
}

main()
	.then(() => console.log('🌱 Aktie-seed gennemført'))
	.catch((e) => {
		console.error('Seed fejlede:', e);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
		await pool.end();
	});
