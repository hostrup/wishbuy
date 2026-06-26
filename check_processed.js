import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
	const countOldProcessed = await prisma.transaction.count({
		where: {
			createdAt: {
				lt: new Date('2026-06-26T00:00:00Z')
			},
			status: 'PROCESSED'
		}
	});

	const countNewProcessed = await prisma.transaction.count({
		where: {
			createdAt: {
				gte: new Date('2026-06-26T00:00:00Z')
			},
			status: 'PROCESSED'
		}
	});

	console.log(`Antal behandlede (PROCESSED) transaktioner oprettet før 26. juni (i går): ${countOldProcessed}`);
	console.log(`Antal behandlede (PROCESSED) transaktioner oprettet den 26. juni (i dag): ${countNewProcessed}`);

	// Lad os også hente status for alle transaktioner oprettet i går (den 25. juni)
	const oldStats = await prisma.transaction.groupBy({
		by: ['status'],
		where: {
			createdAt: {
				lt: new Date('2026-06-26T00:00:00Z'),
				gte: new Date('2026-06-25T00:00:00Z')
			}
		},
		_count: true
	});

	// Og i dag (den 26. juni)
	const newStats = await prisma.transaction.groupBy({
		by: ['status'],
		where: {
			createdAt: {
				gte: new Date('2026-06-26T00:00:00Z')
			}
		},
		_count: true
	});

	console.log('\nStatusfordeling for gårsdagens import (25. juni):');
	console.log(oldStats);

	console.log('\nStatusfordeling for dagens import (26. juni):');
	console.log(newStats);
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect().then(() => pool.end()));
