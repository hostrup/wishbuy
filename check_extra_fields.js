import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
	const transactions = await prisma.transaction.findMany({
		where: {
			date: {
				gte: new Date('2026-06-01T00:00:00.000Z')
			},
			text: {
				contains: 'Foreningen',
				mode: 'insensitive'
			}
		},
		select: {
			id: true,
			date: true,
			text: true,
			amount: true,
			receiverName: true,
			supplementalText: true,
			paidBy: true
		}
	});

	console.log('=== DETALJERET DATA FOR FORENINGEN-TRANSAKTIONER ===');
	transactions.forEach(t => {
		console.log(`- ${t.date.toISOString().split('T')[0]} | ${t.text} | Beløb: ${t.amount} kr. | Modtager: ${t.receiverName} | Supp. tekst: ${t.supplementalText} | Betalt af: ${t.paidBy}`);
	});
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect().then(() => pool.end()));
