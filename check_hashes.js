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
			text: {
				contains: 'MORTEN KRO',
				mode: 'insensitive'
			}
		}
	});

	console.log('=== MORTEN KRO HASH SAMMENLIGNING ===');
	transactions.forEach(t => {
		console.log(`ID: ${t.id}`);
		console.log(`Dato: ${t.date.toISOString()}`);
		console.log(`Tekst: ${t.text}`);
		console.log(`Beløb: ${t.amount} kr.`);
		console.log(`Hash: ${t.hash}`);
		console.log(`Status: ${t.status}`);
		console.log(`Oprettet: ${t.createdAt.toISOString()}`);
		console.log(`Modtager: ${t.receiverName}`);
		console.log(`Supp. tekst: ${t.supplementalText}\n`);
	});
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect().then(() => pool.end()));
