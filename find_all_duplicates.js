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
			}
		},
		orderBy: { date: 'desc' }
	});

	console.log(`Found ${transactions.length} total transactions since June 1st.`);

	const seen = new Map();
	const duplicates = [];

	for (const tx of transactions) {
		const key = `${tx.date.toISOString().split('T')[0]}|${tx.text}|${tx.amount}`;
		if (seen.has(key)) {
			duplicates.push({
				key,
				first: seen.get(key),
				second: tx
			});
		} else {
			seen.set(key, tx);
		}
	}

	console.log(`\n=== FOUND ${duplicates.length} DUPLICATES ===`);
	duplicates.slice(0, 10).forEach((d, index) => {
		console.log(`\nDuplicate #${index + 1}: ${d.key}`);
		console.log(`  First  | ID: ${d.first.id} | Hash: ${d.first.hash} | Oprettet: ${d.first.createdAt.toISOString()}`);
		console.log(`  Second | ID: ${d.second.id} | Hash: ${d.second.hash} | Oprettet: ${d.second.createdAt.toISOString()}`);
	});
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect().then(() => pool.end()));
