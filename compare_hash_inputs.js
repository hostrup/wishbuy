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
	// Hent et par dubletter
	const targetText = 'Forretning: FOETEX ETERNITTEN';
	const txs = await prisma.transaction.findMany({
		where: {
			text: targetText,
			date: new Date('2026-06-25T00:00:00.000Z')
		}
	});

	console.log(`Fandt ${txs.length} transaktioner for "${targetText}" den 2026-06-25.`);
	
	for (const tx of txs) {
		console.log(`\nID: ${tx.id}`);
		console.log(`Oprettet: ${tx.createdAt.toISOString()}`);
		console.log(`Database Hash: ${tx.hash}`);
		
		// Prøv at genskabe hashen ved hjælp af forskellige formater
		// 1. Standard format: date = "25-06-2026", counter = 0
		const h1 = tryHash('25-06-2026', tx.text, tx.amount, 0);
		console.log(`- Test 25-06-2026 + counter 0: ${h1} (Match: ${h1 === tx.hash})`);
		
		// 2. Standard format med counter = 1
		const h2 = tryHash('25-06-2026', tx.text, tx.amount, 1);
		console.log(`- Test 25-06-2026 + counter 1: ${h2} (Match: ${h2 === tx.hash})`);
		
		// 3. ISO format: date = "2026-06-25", counter = 0
		const h3 = tryHash('2026-06-25', tx.text, tx.amount, 0);
		console.log(`- Test 2026-06-25 + counter 0: ${h3} (Match: ${h3 === tx.hash})`);
		
		// 4. ISO format med counter = 1
		const h4 = tryHash('2026-06-25', tx.text, tx.amount, 1);
		console.log(`- Test 2026-06-25 + counter 1: ${h4} (Match: ${h4 === tx.hash})`);
		
		// 5. Uden counter overhovedet
		const h5 = createHash('md5').update(`25-06-2026${tx.text.trim()}${tx.amount}`).digest('hex');
		console.log(`- Test 25-06-2026 uden counter: ${h5} (Match: ${h5 === tx.hash})`);
		
		const h6 = createHash('md5').update(`2026-06-25${tx.text.trim()}${tx.amount}`).digest('hex');
		console.log(`- Test 2026-06-25 uden counter: ${h6} (Match: ${h6 === tx.hash})`);

		// 6. Test med 2-cifret årstal
		const h7 = tryHash('25-06-26', tx.text, tx.amount, 0);
		console.log(`- Test 25-06-26 + counter 0: ${h7} (Match: ${h7 === tx.hash})`);
		
		// 7. Hvad hvis teksten var anderledes? I CSV-filen er der måske ekstra mellemrum eller specialtegn?
		// Lad os se om der er andre felter der indgår i hashen, f.eks. modtager eller supplerende tekst
		// Nogle versioner brugte måske hele rawStr = date + text + amount + receiverName + supplementalText?
		const rawWithSupp = `${tx.date.toISOString().split('T')[0]}${tx.text}${tx.amount}${tx.receiverName || ''}${tx.supplementalText || ''}`;
		const h8 = createHash('md5').update(rawWithSupp).digest('hex');
		console.log(`- Test med alt (date ISO + text + amount + rec + supp): ${h8} (Match: ${h8 === tx.hash})`);
		
		const rawWithSuppDK = `25-06-2026${tx.text}${tx.amount}${tx.receiverName || ''}${tx.supplementalText || ''}`;
		const h9 = createHash('md5').update(rawWithSuppDK).digest('hex');
		console.log(`- Test med alt (date DK + text + amount + rec + supp): ${h9} (Match: ${h9 === tx.hash})`);
	}
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect().then(() => pool.end()));
