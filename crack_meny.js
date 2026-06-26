import { createHash } from 'crypto';

const targetOldHash = 'a4684ee73ecaebf2d931c8c12585727f'; // Gårsdagens hash for MENY AALBORG SV

const date = '09-06-2026';
const text = 'Forretning: MENY AALBORG SV';
const amount = '-1150.25';
const accountId = 'a1f50f6e-bc11-439c-83d5-62c716288499'; // Madkonto
const counter = '0';

// Lad os teste alle tænkelige kombinationer af disse variable
const variables = {
	date,
	text,
	amount,
	accountId,
	counter,
	// Også tomme eller alternative formater
	dateISO: '2026-06-09',
	date2Digit: '09-06-26',
	amountAbs: '1150.25',
	amountInt: '-1150',
	amountDK: '-1150,25',
	amountAbsDK: '1150,25'
};

function tryAll() {
	const keys = Object.keys(variables);
	console.log(`Tester kombinationer af: ${keys.join(', ')}`);

	// Vi tester permutationer af op til 5 elementer
	const testPermutations = (currentStr, remainingKeys) => {
		if (currentStr) {
			const h = createHash('md5').update(currentStr).digest('hex');
			if (h === targetOldHash) {
				console.log(`\n🎉 MATCH FUNDET!`);
				console.log(`Input streng: "${currentStr}"`);
				console.log(`Hash: ${h}`);
				return true;
			}
		}

		for (let i = 0; i < remainingKeys.length; i++) {
			const nextKey = remainingKeys[i];
			const nextVal = variables[nextKey];
			
			// Prøv med og uden separatorer
			const separators = ['', '|', '-', '_', '/', ' '];
			for (const sep of separators) {
				const newStr = currentStr ? `${currentStr}${sep}${nextVal}` : nextVal;
				const newRemaining = remainingKeys.filter((_, idx) => idx !== i);
				if (testPermutations(newStr, newRemaining)) return true;
			}
		}
		return false;
	};

	if (!testPermutations('', keys)) {
		console.log('Ingen permutationer matchede.');
	}
}

tryAll();
