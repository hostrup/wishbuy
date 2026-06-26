import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
	const allTxs = await prisma.transaction.findMany({
		where: {
			date: {
				gte: new Date('2026-06-01T00:00:00.000Z')
			}
		}
	});

	// Find dubletter
	const dupGroups = {};
	allTxs.forEach(t => {
		const key = `${t.date.toISOString().split('T')[0]}|${t.amount}`;
		if (!dupGroups[key]) dupGroups[key] = [];
		dupGroups[key].push(t);
	});

	const realDups = Object.entries(dupGroups).filter(([k, list]) => {
		// Vi leder efter par, hvor den ene er oprettet den 25. juni og den anden den 26. juni
		const hasOld = list.some(t => t.createdAt.toISOString().startsWith('2026-06-25'));
		const hasNew = list.some(t => t.createdAt.toISOString().startsWith('2026-06-26'));
		return hasOld && hasNew;
	});

	console.log(`Fandt ${realDups.length} par af dubletter mellem den 25. og 26. juni.`);

	if (realDups.length > 0) {
		for (let idx = 0; idx < Math.min(3, realDups.length); idx++) {
			const [key, list] = realDups[idx];
			const oldTx = list.find(t => t.createdAt.toISOString().startsWith('2026-06-25'));
			const newTx = list.find(t => t.createdAt.toISOString().startsWith('2026-06-26'));

			console.log(`\n=== SAMMENLIGNING PAR #${idx + 1} ===`);
			console.log(`Felt | Gårsdagens (25. juni) | Dagens (26. juni)`);
			console.log(`-----|-----------------------|------------------`);
			
			const fields = [
				'id', 'hash', 'date', 'text', 'amount', 'status', 'accountId', 'categoryId',
				'senderAccount', 'receiverAccount', 'receiverName', 'transferType', 'supplementalText', 'balance', 'paidBy'
			];

			fields.forEach(f => {
				let valOld = oldTx[f];
				let valNew = newTx[f];
				
				if (valOld instanceof Date) valOld = valOld.toISOString();
				if (valNew instanceof Date) valNew = valNew.toISOString();
				
				const isDiff = String(valOld) !== String(valNew);
				const marker = isDiff ? '❌ FORSKELLIG!' : '✅ ens';
				
				console.log(`${f.padEnd(16)} | "${valOld}" | "${valNew}" | ${marker}`);
			});
		}
	}
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect().then(() => pool.end()));
