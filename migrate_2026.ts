import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
	connectionString:
		'postgresql://wishbuy_db:2W3M9J7pFpDcAXR@postgresql:5432/wishbuy_db?schema=public'
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const newCategories = [
	{ name: 'Abbonement & streaming', icon: '📺' },
	{ name: 'Medicin', icon: '💊' },
	{ name: 'Shopping Tøj & Sko', icon: '👕' },
	{ name: 'Shopping Sundhed', icon: '⚕️' },
	{ name: 'Shopping Gadgets & Sjov', icon: '🎮' },
	{ name: 'Shopping Andet', icon: '🛍️' },
	{ name: 'Interne overførsler', icon: '🔁' },
	{ name: 'Walter', icon: '🐶' },
	{ name: 'Bank og gebyrer', icon: '🏦' },
	{ name: 'Transport', icon: '🚌' },
	{ name: 'Oplevelser', icon: '🎟️' },
	{ name: 'Dagligvarer', icon: '🛒' },
	{ name: 'Gaver', icon: '🎁' },
	{ name: 'Restaurant & take away', icon: '🍔' },
	{ name: 'Rengøring', icon: '🧼' },
	{ name: 'Hus', icon: '🏠' },
	{ name: 'Have', icon: '🪴' }
];

async function main() {
	console.log('Starter migrering...');

	// 1. Slet al data før 2026
	console.log('Sletter transaktioner før 2026...');
	const deleteRes = await prisma.transaction.deleteMany({
		where: {
			date: {
				lt: new Date('2026-01-01T00:00:00Z')
			}
		}
	});
	console.log(`Slettede ${deleteRes.count} transaktioner.`);

	// 2. Fjern nuværende kategori fra resterende transaktioner (så de kan slettes)
	console.log('Fjerner kategorier fra 2026 transaktioner...');
	await prisma.transaction.updateMany({
		data: {
			categoryId: null,
			status: 'UNPROCESSED'
		}
	});

	// 3. Slet gamle MappingRules og TransactionCategory
	console.log('Sletter MappingRules og TransactionCategories...');
	await prisma.mappingRule.deleteMany({});
	await prisma.transactionCategory.deleteMany({});

	// 4. Opret nye kategorier
	console.log('Opretter nye kategorier...');
	const createdCategories = [];
	for (const cat of newCategories) {
		const created = await prisma.transactionCategory.create({
			data: {
				name: cat.name,
				icon: cat.icon
			}
		});
		createdCategories.push(created);
	}

	// Helper for at finde ID ud fra navn
	const catId = (name: string) => createdCategories.find((c) => c.name === name)?.id;

	// 5. Intelligent (AI-viden baseret) re-kategorisering af de resterende (2026) transaktioner
	const remainingTxs = await prisma.transaction.findMany();
	console.log(`Gennemgår ${remainingTxs.length} transaktioner for AI re-kategorisering...`);

	let mappedCount = 0;

	for (const tx of remainingTxs) {
		const text = (
			tx.text +
			' ' +
			(tx.supplementalText || '') +
			' ' +
			(tx.receiverName || '')
		).toLowerCase();
		let targetCatName = null;
		let keywordMatched = null;

		// Regex/keywords for "Abbonement & streaming"
		if (
			/(netflix|hbo|viaplay|spotify|tv2 play|disney|apple.com\/bill|podimo|mofibo|storytel|sydenergi|norlys internet|fitness|puregym|fitness world)/i.test(
				text
			)
		) {
			targetCatName = 'Abbonement & streaming';
			keywordMatched = text.match(
				/(netflix|hbo|viaplay|spotify|tv2 play|disney|apple.com\/bill|podimo|mofibo|storytel|sydenergi|norlys internet|fitness|puregym|fitness world)/i
			)?.[0];
		}
		// Medicin
		else if (/(apotek|med24|webapoteket|a-apoteket|dinapoteker)/i.test(text)) {
			targetCatName = 'Medicin';
			keywordMatched = text.match(/(apotek|med24|webapoteket|a-apoteket|dinapoteker)/i)?.[0];
		}
		// Shopping Tøj & Sko
		else if (
			/(zalando|hm|h&m|asos|magasin|zara|boozt|skoringen|deichmann|name it|bestseller|veromoda|only|jack.jones)/i.test(
				text
			)
		) {
			targetCatName = 'Shopping Tøj & Sko';
			keywordMatched = text.match(
				/(zalando|hm|h&m|asos|magasin|zara|boozt|skoringen|deichmann|name it|bestseller|veromoda|only|jack.jones)/i
			)?.[0];
		}
		// Shopping Sundhed
		else if (/(matas|normal|sephora|luxplus|nicehair|makeup)/i.test(text)) {
			targetCatName = 'Shopping Sundhed';
			keywordMatched = text.match(/(matas|normal|sephora|luxplus|nicehair|makeup)/i)?.[0];
		}
		// Shopping Gadgets & Sjov
		else if (
			/(proshop|komplett|elgiganten|power|coolshop|nintendo|playstation|xbox|steamgames)/i.test(
				text
			)
		) {
			targetCatName = 'Shopping Gadgets & Sjov';
			keywordMatched = text.match(
				/(proshop|komplett|elgiganten|power|coolshop|nintendo|playstation|xbox|steamgames)/i
			)?.[0];
		}
		// Shopping Andet
		else if (/(bog&ide|imerco|kop.kande|ikea detalj|harald nyborg details)/i.test(text)) {
			// Not all ikea is hus
			targetCatName = 'Shopping Andet';
			keywordMatched = text.match(
				/(bog&ide|imerco|kop.kande|ikea detalj|harald nyborg details)/i
			)?.[0];
		}
		// Walter (Hund)
		else if (/(maxizoo|petworld|dyrlæge|dyreklinik|zooplus|olivers|hund|walter)/i.test(text)) {
			targetCatName = 'Walter';
			keywordMatched = text.match(
				/(maxizoo|petworld|dyrlæge|dyreklinik|zooplus|olivers|hund|walter)/i
			)?.[0];
		}
		// Bank og gebyrer
		else if (/(gebyr|rente|kredit|lån|bank|dankort-gebyr|kortgebyr)/i.test(text)) {
			targetCatName = 'Bank og gebyrer';
			keywordMatched = text.match(/(gebyr|rente|kredit|lån|bank|dankort-gebyr|kortgebyr)/i)?.[0];
		}
		// Transport
		else if (
			/(q8|circle k|ok a.m.b.a|ingo|shell|f24|uno-x|dsb|rejsekort|arriva|taxa|uber|bolt|easypark|apcoa|parkering|brobizz|storebælt|øresund)/i.test(
				text
			)
		) {
			targetCatName = 'Transport';
			keywordMatched = text.match(
				/(q8|circle k|ok a.m.b.a|ingo|shell|f24|uno-x|dsb|rejsekort|arriva|taxa|uber|bolt|easypark|apcoa|parkering|brobizz|storebælt|øresund)/i
			)?.[0];
		}
		// Oplevelser
		else if (
			/(biograf|kino|nfbio|tivoli|zoo|museum|teater|ticketmaster|billetlugen|legoland)/i.test(text)
		) {
			targetCatName = 'Oplevelser';
			keywordMatched = text.match(
				/(biograf|kino|nfbio|tivoli|zoo|museum|teater|ticketmaster|billetlugen|legoland)/i
			)?.[0];
		}
		// Dagligvarer
		else if (
			/(netto|rema 1000|rema|føtex|bilka|coop|superbrugsen|kvickly|fakta|lidl|aldi|nemlig|spar|min købmand|meny|letkøb|købmand)/i.test(
				text
			)
		) {
			targetCatName = 'Dagligvarer';
			keywordMatched = text.match(
				/(netto|rema 1000|rema|føtex|bilka|coop|superbrugsen|kvickly|fakta|lidl|aldi|nemlig|spar|min købmand|meny|letkøb|købmand)/i
			)?.[0];
		}
		// Restaurant & take away
		else if (
			/(wolt|justeat|just eat|foodora|mcdonalds|burger king|kfc|sunset|pizza|restaurant|cafe|bager|espresso house|joe & the juice|kebab|shawarma)/i.test(
				text
			)
		) {
			targetCatName = 'Restaurant & take away';
			keywordMatched = text.match(
				/(wolt|justeat|just eat|foodora|mcdonalds|burger king|kfc|sunset|pizza|restaurant|cafe|bager|espresso house|joe & the juice|kebab|shawarma)/i
			)?.[0];
		}
		// Rengøring
		else if (/(rengøring|rens|vaskeri)/i.test(text)) {
			targetCatName = 'Rengøring';
			keywordMatched = text.match(/(rengøring|rens|vaskeri)/i)?.[0];
		}
		// Hus
		else if (
			/(ikea|bauhaus|silvan|jem & fix|jem og fix|xl-byg|stark|davidsen|bolig|husleje|vand|varme|elregning|nrgi|dong|andelsbolig)/i.test(
				text
			)
		) {
			targetCatName = 'Hus';
			keywordMatched = text.match(
				/(ikea|bauhaus|silvan|jem & fix|jem og fix|xl-byg|stark|davidsen|bolig|husleje|vand|varme|elregning|nrgi|dong|andelsbolig)/i
			)?.[0];
		}
		// Have
		else if (/(planteskole|billigblomst|plantorama|havecenter)/i.test(text)) {
			targetCatName = 'Have';
			keywordMatched = text.match(/(planteskole|billigblomst|plantorama|havecenter)/i)?.[0];
		}
		// Interne overførsler
		else if (/(overførsel|egen konto|opsparing|budgetkonto)/i.test(text)) {
			targetCatName = 'Interne overførsler';
			keywordMatched = text.match(/(overførsel|egen konto|opsparing|budgetkonto)/i)?.[0];
		}
		// Gaver - Svært at matche automatisk på tekst, evt. MobilePay med "gave" i tekst
		else if (/(\bgave\b|\bgaver\b)/i.test(text)) {
			targetCatName = 'Gaver';
			keywordMatched = 'gave';
		}

		if (targetCatName) {
			const cId = catId(targetCatName);
			if (cId) {
				await prisma.transaction.update({
					where: { id: tx.id },
					data: {
						categoryId: cId,
						status: 'AUTO_MAPPED'
					}
				});

				// Opret mapping rule hvis den ikke findes
				if (keywordMatched) {
					const kw = keywordMatched.toLowerCase();
					const existingRule = await prisma.mappingRule.findUnique({ where: { keyword: kw } });
					if (!existingRule) {
						await prisma.mappingRule.create({
							data: {
								keyword: kw,
								categoryId: cId
							}
						});
					}
				}

				mappedCount++;
			}
		}
	}

	console.log(
		`Migrering fuldført! Auto-mappede ${mappedCount} ud af ${remainingTxs.length} transaktioner.`
	);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
