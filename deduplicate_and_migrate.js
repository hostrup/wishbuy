import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { createHash } from 'crypto';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function generateNewHash(dateStr, text, amount, counter) {
	const rawStr = `${dateStr.trim()}${text.trim()}${amount}${counter}`;
	return createHash('md5').update(rawStr).digest('hex');
}

function formatDateDKStr(dateObj) {
	const d = String(dateObj.getDate()).padStart(2, '0');
	const m = String(dateObj.getMonth() + 1).padStart(2, '0');
	const y = dateObj.getFullYear();
	return `${d}-${m}-${y}`;
}

async function main() {
	console.log('=== STARTER DEDUPLIKERING OG HASH-MIGRERING ===');

	// 1. Hent alle transaktioner i juni 2026
	const allTxs = await prisma.transaction.findMany({
		where: {
			date: {
				gte: new Date('2026-06-01T00:00:00.000Z')
			}
		},
		orderBy: { createdAt: 'asc' }
	});

	const oldTxs = allTxs.filter(t => t.createdAt.toISOString().startsWith('2026-06-25'));
	const newTxs = allTxs.filter(t => t.createdAt.toISOString().startsWith('2026-06-26'));

	console.log(`Gårsdagens transaktioner (25. juni): ${oldTxs.length}`);
	console.log(`Dagens transaktioner (26. juni): ${newTxs.length}`);

	let deletedCount = 0;
	let migratedCount = 0;
	let keptCount = 0;

	// Vi sporer counters for at generere korrekte nye hashes
	// nøgle: dateStr|text|amount -> counter
	const hashCounterMap = new Map();

	// Vi gennemgår dagens transaktioner først for at registrere deres counters
	// (De har allerede de korrekte nye hashes)
	for (const tx of newTxs) {
		const dateStr = formatDateDKStr(tx.date);
		const key = `${dateStr}|${tx.text}|${tx.amount}`;
		const currentCount = hashCounterMap.get(key) || 0;
		hashCounterMap.set(key, currentCount + 1);
	}

	// Gennemgå gårsdagens transaktioner
	for (const oldTx of oldTxs) {
		const dateStr = formatDateDKStr(oldTx.date);
		const key = `${dateStr}|${oldTx.text}|${oldTx.amount}`;

		// Tjek om der findes en tilsvarende transaktion i dagens import
		// (Vi sammenligner på dato, tekst og beløb)
		const matchingNewTx = newTxs.find(t => 
			formatDateDKStr(t.date) === dateStr && 
			t.text === oldTx.text && 
			t.amount === oldTx.amount
		);

		if (matchingNewTx) {
			// Dublet fundet!
			// Vi skal slette gårsdagens transaktion (oldTx), da den ligger på Madkonto
			// og har den forældede hash-formel, og vi skal beholde dagens transaktion (matchingNewTx),
			// da den ligger på Budgetkonto (brugerens ønske i dag) og har den nye hash-formel.
			
			// Før vi sletter, tjekker vi om oldTx havde en kategori, som matchingNewTx ikke har.
			// (Begge burde have fået kategorier under re-kategoriseringen tidligere i dag, men lad os være sikre)
			if (oldTx.categoryId && !matchingNewTx.categoryId) {
				await prisma.transaction.update({
					where: { id: matchingNewTx.id },
					data: { categoryId: oldTx.categoryId, status: oldTx.status }
				});
			}

			await prisma.transaction.delete({
				where: { id: oldTx.id }
			});
			deletedCount++;
		} else {
			// Ingen dublet fundet! Denne transaktion er unik for gårsdagens import.
			// Vi skal beholde den, men vi skal opdatere dens hash til den nye formel,
			// så den ikke bliver duplikeret i fremtidige imports.
			const counter = hashCounterMap.get(key) || 0;
			hashCounterMap.set(key, counter + 1);

			const newHash = generateNewHash(dateStr, oldTx.text, oldTx.amount, counter);

			console.log(`Unik transaktion fundet fra i går: "${oldTx.text}" (${oldTx.amount} kr.)`);
			console.log(`- Gammel hash: ${oldTx.hash}`);
			console.log(`- Ny hash:     ${newHash}`);

			try {
				await prisma.transaction.update({
					where: { id: oldTx.id },
					data: { hash: newHash }
				});
				migratedCount++;
			} catch (err) {
				// Hvis opdateringen fejler pga. unik hash-constraint, betyder det,
				// at den alligevel var en duplikat af en eksisterende transaktion.
				console.log(`⚠️ Kunne ikke opdatere hash (allerede eksisterende). Sletter transaktionen som dublet.`);
				await prisma.transaction.delete({
					where: { id: oldTx.id }
				});
				deletedCount++;
			}
		}
	}

	console.log('\n=== STATUS EFTER DEDUPLIKERING ===');
	console.log(`- Slettede duplikater: ${deletedCount}`);
	console.log(`- Migrerede unikke gårsdags-transaktioner til ny hash: ${migratedCount}`);
	
	const finalCount = await prisma.transaction.count({
		where: {
			date: {
				gte: new Date('2026-06-01T00:00:00.000Z')
			}
		}
	});
	console.log(`- Resterende transaktioner i juni 2026 i alt: ${finalCount}`);
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect().then(() => pool.end()));
