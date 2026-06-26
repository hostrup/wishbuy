import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { createHash } from 'crypto';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function tryHash(dateStr, textStr, amountNum, counterNum) {
	const rawStr = `${dateStr.trim()}${textStr.trim()}${amountNum}${counterNum}`;
	return createHash('md5').update(rawStr).digest('hex');
}

async function main() {
	console.log('=== HENTER TRANSAKTIONSOVERBLIK ===');
	const allTxs = await prisma.transaction.findMany({
		where: {
			date: {
				gte: new Date('2026-06-01T00:00:00.000Z')
			}
		}
	});

	// Gruppér efter oprettelsesdato (createdAt på dato-niveau)
	const groups = {};
	allTxs.forEach(t => {
		const createdDate = t.createdAt.toISOString().split('T')[0];
		if (!groups[createdDate]) groups[createdDate] = [];
		groups[createdDate].push(t);
	});

	console.log(`Samlet antal transaktioner i juni 2026: ${allTxs.length}`);
	for (const [date, list] of Object.entries(groups)) {
		console.log(`- Oprettet den ${date}: ${list.length} transaktioner`);
	}

	// Lad os tage fat i de 100 dubletter. Vi finder transaktioner der har samme date, text og amount,
	// men forskellige hashes og forskellige createdAt.
	const dupGroups = {};
	allTxs.forEach(t => {
		const key = `${t.date.toISOString().split('T')[0]}|${t.text}|${t.amount}`;
		if (!dupGroups[key]) dupGroups[key] = [];
		dupGroups[key].push(t);
	});

	const realDups = Object.entries(dupGroups).filter(([k, list]) => list.length > 1);
	console.log(`\nFaktiske duplikerede transaktions-par (dato/tekst/beløb matcher): ${realDups.length}`);

	if (realDups.length > 0) {
		const sample = realDups[0][1];
		console.log(`\nEksempel på dublet:`);
		sample.forEach((t, i) => {
			console.log(`  [${i + 1}] ID: ${t.id}`);
			console.log(`      Oprettet: ${t.createdAt.toISOString()}`);
			console.log(`      Dato: ${t.date.toISOString().split('T')[0]}`);
			console.log(`      Tekst: "${t.text}"`);
			console.log(`      Beløb: ${t.amount}`);
			console.log(`      Hash: ${t.hash}`);
			console.log(`      Modtager: ${t.receiverName}`);
			console.log(`      Supp. tekst: ${t.supplementalText}`);
			console.log(`      Betalt af: ${t.paidBy}`);
			console.log(`      Konto ID: ${t.accountId}`);
			console.log(`      Kategori ID: ${t.categoryId}`);
			console.log(`      Status: ${t.status}`);
		});

		// Lad os prøve at finde ud af, hvordan den første transaktions hash (den ældste) blev genereret.
		// Den ældste transaktion (oprettet den 25. juni) har en hash. Lad os prøve forskellige måder at generere den på.
		const oldTx = sample.find(t => t.createdAt.toISOString().startsWith('2026-06-25'));
		const newTx = sample.find(t => t.createdAt.toISOString().startsWith('2026-06-26'));

		if (oldTx && newTx) {
			console.log(`\nPrøver at knække koden for den gamle hash: ${oldTx.hash}`);
			
			// Formatere datoer på alle tænkelige måder
			// Den rigtige dato er f.eks. 2026-06-25 (eller hvad nu oldTx.date er)
			const dateObj = new Date(oldTx.date);
			const y = dateObj.getFullYear();
			const m = String(dateObj.getMonth() + 1).padStart(2, '0');
			const d = String(dateObj.getDate()).padStart(2, '0');
			
			const dateFormats = [
				`${d}-${m}-${y}`,       // 25-06-2026
				`${y}-${m}-${d}`,       // 2026-06-25
				`${d}.${m}.${y}`,       // 25.06.2026
				`${d}/${m}/${y}`,       // 25/06/2026
				`${d}-${m}-${String(y).slice(-2)}`, // 25-06-26
				`${d}.${m}.${String(y).slice(-2)}`  // 25.06.26
			];

			const textFormats = [
				oldTx.text,
				oldTx.text.trim(),
				oldTx.text.toUpperCase(),
				oldTx.text.toLowerCase()
			];

			const amountFormats = [
				oldTx.amount,
				String(oldTx.amount),
				oldTx.amount.toFixed(2),
				String(oldTx.amount).replace('.', ',')
			];

			const counters = [0, 1, ''];

			let found = false;

			// Vi prøver også at se om andre felter indgår, f.eks. balance, senderAccount, receiverName, supplementalText osv.
			// Legacy hash-generering fra f.eks. et Python-script kunne være:
			// hash = md5(date + text + amount + ...)
			// Lad os prøve at iterere over de basale formater først
			for (const df of dateFormats) {
				for (const tf of textFormats) {
					for (const af of amountFormats) {
						for (const c of counters) {
							// Standard form: date + text + amount + counter
							const raw1 = `${df}${tf}${af}${c}`;
							const h1 = createHash('md5').update(raw1).digest('hex');
							if (h1 === oldTx.hash) {
								console.log(`🎉 MATCH FUNDET!`);
								console.log(`Formel: md5( "${df}" + "${tf}" + "${af}" + "${c}" )`);
								found = true;
								break;
							}

							// Form uden counter: date + text + amount
							const raw2 = `${df}${tf}${af}`;
							const h2 = createHash('md5').update(raw2).digest('hex');
							if (h2 === oldTx.hash) {
								console.log(`🎉 MATCH FUNDET!`);
								console.log(`Formel: md5( "${df}" + "${tf}" + "${af}" )`);
								found = true;
								break;
							}
						}
						if (found) break;
					}
					if (found) break;
				}
				if (found) break;
			}

			if (!found) {
				console.log('Kunne ikke umiddelbart genskabe den gamle hash med simple date/text/amount kombinationer.');
				console.log('Lad os teste om der indgår andre felter, såsom balance, modtager, osv.');
				
				// Hvad hvis det er: date + text + amount + receiverName + supplementalText?
				// Lad os tjekke om der er andre transaktioner i databasen, der kan give os et hint,
				// eller om der er ændringer i CSV-import formatet.
			}
		}
	}
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect().then(() => pool.end()));
