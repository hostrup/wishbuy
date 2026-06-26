import { createHash } from 'crypto';

// Gårsdagens hashes fra databasen:
// 1. MORTEN KRO (-2433, Dato i DB: 2026-06-25, SuppTekst indeholder "23.06" og kortnr, osv.)
const targetMortenHash = '32c09a39b90cd0ca5a54292f1563cfdd';
// 2. FOETEX ETERNITTEN (-190, Dato i DB: 2026-06-25)
const targetFoetexHash = '9f24ad9238c38fbf7bbf028c7cef7dc9';

const algos = ['md5', 'sha1', 'sha256'];

// Forskellige dato-varianter for MORTEN KRO (Dato i DB er 2026-06-25, men supp tekst nævner 23.06)
const mortenDates = [
	'25-06-2026', '2026-06-25', '25-06-26', '25.06.2026', '25/06/2026', '25062026',
	'23-06-2026', '2026-06-23', '23-06-26', '23.06.2026', '23/06/2026', '23062026'
];

const foetexDates = [
	'25-06-2026', '2026-06-25', '25-06-26', '25.06.2026', '25/06/2026', '25062026'
];

const mortenTexts = [
	'Forretning: MORTEN KRO',
	'Forretning: MORTEN KRO '.trim(),
	'MORTEN KRO',
	'Forretning: MORTEN KRO Øvrig info: AALBORG           : 98540415 Wallet    : APPLE 10ld3Ph0n3 Token :VISA 4558540691595584 VISA-NOTA DKK  2433,00 23.06 4571XXXXXXXX8915 Kortnr: 4571 XXXX XXXX 8915'
];

const foetexTexts = [
	'Forretning: FOETEX ETERNITTEN',
	'Forretning: FOETEX ETERNITTEN '.trim(),
	'FOETEX ETERNITTEN'
];

const mortenAmounts = [
	'-2433', '2433', '-2433.00', '2433.00', '-2433,00', '2433,00', '-2.433', '2.433', '-2.433,00', '2.433,00'
];

const foetexAmounts = [
	'-190', '190', '-190.00', '190.00', '-190,00', '190,00'
];

const counters = [0, 1, '', '0', '1'];

function testAll() {
	console.log('Starter hash-cracking forsøg...');

	// Vi tester for MORTEN KRO
	for (const algo of algos) {
		for (const d of mortenDates) {
			for (const t of mortenTexts) {
				for (const a of mortenAmounts) {
					for (const c of counters) {
						// Vi prøver forskellige sammensætnings-mønstre:
						const patterns = [
							`${d}${t}${a}${c}`,
							`${d}${t}${a}`,
							`${t}${d}${a}${c}`,
							`${t}${d}${a}`,
							`${d}|${t}|${a}|${c}`,
							`${d}|${t}|${a}`,
							`${t}|${d}|${a}`,
							// Streamlit app.py mønster (hvis det brugte noget andet)
							// Hvad hvis det brugte balance/saldo?
							// Hvad hvis det brugte alle kolonner?
						];

						for (const pat of patterns) {
							const h = createHash(algo).update(pat).digest('hex');
							if (h === targetMortenHash) {
								console.log(`\n🎉 MATCH FUNDET FOR MORTEN KRO!`);
								console.log(`Algo: ${algo}`);
								console.log(`Mønster: "${pat}"`);
								console.log(`Hash: ${h}`);
								return;
							}
						}
					}
				}
			}
		}
	}

	// Vi tester for FOETEX
	for (const algo of algos) {
		for (const d of foetexDates) {
			for (const t of foetexTexts) {
				for (const a of foetexAmounts) {
					for (const c of counters) {
						const patterns = [
							`${d}${t}${a}${c}`,
							`${d}${t}${a}`,
							`${t}${d}${a}${c}`,
							`${t}${d}${a}`,
							`${d}|${t}|${a}|${c}`,
							`${d}|${t}|${a}`,
							`${t}|${d}|${a}`,
						];

						for (const pat of patterns) {
							const h = createHash(algo).update(pat).digest('hex');
							if (h === targetFoetexHash) {
								console.log(`\n🎉 MATCH FUNDET FOR FOETEX!`);
								console.log(`Algo: ${algo}`);
								console.log(`Mønster: "${pat}"`);
								console.log(`Hash: ${h}`);
								return;
							}
						}
					}
				}
			}
		}
	}

	console.log('\nDesværre, ingen simple mønstre matchede de gamle hashes.');
}

testAll();
