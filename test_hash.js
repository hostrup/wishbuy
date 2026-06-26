import { createHash } from 'crypto';

function generateHash(date, text, amount, counter) {
	const rawStr = `${date.trim()}${text.trim()}${amount}${counter}`;
	return createHash('md5').update(rawStr).digest('hex');
}

// Test med 2-cifret årstal (25-06-26)
const hash2DigitYear = generateHash('25-06-26', 'Forretning: MORTEN KRO', -2433, 0);

console.log(`Hash med 2-cifret årstal (25-06-26): ${hash2DigitYear}`);
