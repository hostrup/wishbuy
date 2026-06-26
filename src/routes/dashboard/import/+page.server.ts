import { prisma } from '$lib/server/prisma';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import Papa from 'papaparse';
import { createHash } from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '$env/dynamic/private';

// Card identification rules (from Streamlit app.py)
const BUYER_RULES: Record<string, string> = {
	'APPLE 10ld3Ph0n3': 'Mathilde',
	'4571XXXXXXXX8915': 'Mathilde',
	'4571 XXXX XXXX 8915': 'Mathilde',
	'APPLE Ro9Phon3': 'Ronni',
	'4571XXXXXXXX4931': 'Ronni',
	'4571 XXXX XXXX 4931': 'Ronni'
};

function identifyCardOwner(
	text: string,
	receiverName: string | null,
	supplementalText: string | null
): string | null {
	const searchText = `${text || ''} ${receiverName || ''} ${supplementalText || ''}`;
	for (const [key, buyer] of Object.entries(BUYER_RULES)) {
		if (searchText.includes(key)) return buyer;
	}
	return null;
}

function generateHash(date: string, text: string, amount: number, counter: number): string {
	const rawStr = `${date.trim()}${text.trim()}${amount}${counter}`;
	return createHash('md5').update(rawStr).digest('hex');
}

function formatDateDK(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const load: PageServerLoad = async () => {
	const [accounts, categories] = await Promise.all([
		prisma.account.findMany({ orderBy: { name: 'asc' } }),
		prisma.transactionCategory.findMany({ orderBy: { name: 'asc' } })
	]);
	// Map for category lookups
	const categoryMap: Record<string, string> = {};
	categories.forEach((c) => (categoryMap[c.name] = c.id));
	return { accounts, categories, categoryMap };
};

export const actions: Actions = {
	analyze: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const formData = await request.formData();
		const file = formData.get('csv') as File;
		const accountId = formData.get('accountId')?.toString();

		if (!file || !accountId) return fail(400, { error: 'Manglende fil eller konto.' });

		// Read the file as text with cp1252 encoding (Danish bank standard)
		const buffer = await file.arrayBuffer();
		const decoder = new TextDecoder('windows-1252');
		const csvText = decoder.decode(buffer);

		// Parse CSV with semicolon separator
		const parseResult = Papa.parse<Record<string, string>>(csvText, {
			header: true,
			delimiter: ';',
			skipEmptyLines: true
		});

		if (parseResult.errors.length > 0) {
			return fail(400, { error: `CSV parse fejl: ${parseResult.errors[0].message}` });
		}

		const rows = parseResult.data;
		if (rows.length === 0) return fail(400, { error: 'CSV filen er tom.' });

		// Validate required columns
		const firstRow = rows[0];
		if (!('Dato' in firstRow) || !('Tekst' in firstRow) || !('Beløb' in firstRow)) {
			return fail(400, { error: 'CSV mangler påkrævede kolonner: Dato, Tekst, Beløb.' });
		}

		// Fetch existing hashes for duplicate detection
		const existingHashes = new Set(
			(await prisma.transaction.findMany({ select: { hash: true } })).map((t) => t.hash)
		);

		// Fetch mapping rules for auto-categorization
		const rules = await prisma.mappingRule.findMany({
			include: { category: true }
		});

		// Fetch all categories for the category map
		const categories = await prisma.transactionCategory.findMany({ orderBy: { name: 'asc' } });

		// Process rows: filter, convert, hash, map
		const counterMap = new Map<string, number>();

		const preview = rows
			.map((row) => {
				const rawAmount = row['Beløb']?.replace(/\./g, '').replace(',', '.');
				const amount = parseFloat(rawAmount);
				const dateStr = row['Dato'];

				// Skip invalid rows
				if (isNaN(amount) || !dateStr || !row['Tekst']) return null;
				// Only expenses (negative amounts)
				if (amount >= 0) return null;

				// Parse date (dd-mm-yyyy)
				const [d, m, y] = dateStr.split('-').map(Number);
				if (!d || !m || !y) return null;
				const date = new Date(y, m - 1, d);

				// Generate hash
				const hashKey = `${dateStr.trim()}|${row['Tekst'].trim()}|${amount}`;
				const counter = counterMap.get(hashKey) || 0;
				counterMap.set(hashKey, counter + 1);
				const hash = generateHash(dateStr, row['Tekst'], amount, counter);

				const receiverName = row['Modtagernavn'] || null;
				const supplementalText = row['Supp. tekst til modtager'] || null;
				const paidBy = identifyCardOwner(row['Tekst'], receiverName, supplementalText);
				const isExisting = existingHashes.has(hash);

				// Auto-map via mapping rules
				const searchableText = `${row['Tekst'].toLowerCase()} ${(receiverName || '').toLowerCase()} ${(supplementalText || '').toLowerCase()}`;
				let mappedCategory: { id: string; name: string } | null = null;
				for (const rule of rules) {
					if (searchableText.includes(rule.keyword.toLowerCase())) {
						mappedCategory = { id: rule.categoryId, name: rule.category.name };
						break;
					}
				}

				return {
					hash,
					date: formatDateDK(date),
					dateFormatted: new Intl.DateTimeFormat('da-DK', {
						day: '2-digit',
						month: 'short',
						year: 'numeric'
					}).format(date),
					text: row['Tekst'],
					amount,
					amountFormatted: new Intl.NumberFormat('da-DK', {
						style: 'currency',
						currency: 'DKK',
						maximumFractionDigits: 0
					}).format(Math.abs(amount)),
					receiverName,
					supplementalText,
					senderAccount: row['Afsenderkonto'] || null,
					receiverAccount: row['Modtagerkonto'] || null,
					transferType: row['Ovf.type'] || null,
					balance: row['Saldo']?.replace(/\./g, '').replace(',', '.') || null,
					paidBy,
					categoryId: mappedCategory?.id || null,
					categoryName: mappedCategory?.name || 'Ukendt',
					isExisting,
					status: mappedCategory ? 'AUTO_MAPPED' : 'UNPROCESSED'
				};
			})
			.filter((row): row is NonNullable<typeof row> => row !== null);

		const newCount = preview.filter((r) => !r.isExisting).length;
		const existingCount = preview.filter((r) => r.isExisting).length;
		const mappedCount = preview.filter((r) => r.categoryId).length;

		const catList = categories.map((c) => ({ name: c.name, id: c.id }));

		return {
			success: true,
			preview,
			stats: { total: preview.length, new: newCount, existing: existingCount, mapped: mappedCount },
			categoryOptions: catList.map((c) => c.name),
			categoryMap: Object.fromEntries(catList.map((c) => [c.name, c.id]))
		};
	},

	suggestCategories: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const formData = await request.formData();
		const transactionTexts = formData.get('transactionTexts')?.toString();

		if (!transactionTexts) return fail(400, { error: 'Manglende transaktioner.' });

		let txsToAnalyze: Array<{ text: string; amount: number }>;
		try {
			txsToAnalyze = JSON.parse(transactionTexts);
		} catch {
			txsToAnalyze = transactionTexts.split(',').map((t) => ({ text: t.trim(), amount: 0 }));
		}

		if (txsToAnalyze.length === 0) {
			return { success: true, suggestions: [] };
		}

		// Hent alle eksisterende kategorier til Gemini reference
		const allCategories = await prisma.transactionCategory.findMany({
			orderBy: { name: 'asc' }
		});
		const categoryNames = allCategories.map((c) => c.name);

		let apiKey = env.GEMINI_API_KEY;
		if (apiKey) apiKey = apiKey.replace(/^["']|["']$/g, '').trim();

		if (!apiKey) {
			return fail(500, { error: 'GEMINI_API_KEY mangler i miljøvariablerne.' });
		}

		const systemPrompt = `Du er en intelligent og præcis kategoriserings-AI for det danske husholdningssystem Hostrup Hub.
Din opgave er at analysere en liste af banktransaktioner (tekst og beløb) og foreslå den mest passende udgiftskategori.

Du SKAL vælge en kategori fra følgende liste over eksisterende kategorier hvis overhovedet muligt:
${categoryNames.map((name) => `- ${name}`).join('\n')}

Derudover skal du identificere et præcist 'keyword' (nøgleord) fra transaktionsteksten (f.eks. "NETTO" for "NETTO BROGADE", "SPOTIFY" for "SPOTIFY PREMIUM"), som efterfølgende kan bruges til at lave en automatisk mapping rule. Keywordet skal være skrevet i store bogstaver og være det mest unikke og sigende ord i transaktionsteksten der identificerer modtageren.

Svar KUN i det anmodede JSON format.`;

		const userPrompt = `Kategorisér venligst følgende transaktioner:
${JSON.stringify(txsToAnalyze, null, 2)}

Returnér et JSON-array med præcis følgende format for hver transaktion:
[
  { "transactionText": "oprindelig transaktionstekst", "suggestedCategory": "navn på den valgte kategori", "keyword": "KEYWORD" }
]`;

		try {
			const genAI = new GoogleGenerativeAI(apiKey);
			const model = genAI.getGenerativeModel({
				model: 'gemini-2.5-flash',
				generationConfig: {
					responseMimeType: 'application/json',
					responseSchema: {
						type: 'ARRAY' as any,
						items: {
							type: 'OBJECT' as any,
							properties: {
								transactionText: { type: 'STRING' as any },
								suggestedCategory: { type: 'STRING' as any },
								keyword: { type: 'STRING' as any }
							},
							required: ['transactionText', 'suggestedCategory', 'keyword']
						}
					}
				}
			});

			const result = await model.generateContent(
				{
					contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
				},
				{ signal: AbortSignal.timeout(45000) }
			);

			const responseText = result.response.text();
			const suggestions = JSON.parse(responseText);

			// Map kategorinavne til IDs
			const suggestionsWithIds = suggestions.map((s: any) => {
				const category = allCategories.find(
					(c) => c.name.toLowerCase() === s.suggestedCategory.toLowerCase()
				);
				return {
					transactionText: s.transactionText,
					suggestedCategory: category ? category.name : 'Ukendt',
					suggestedCategoryId: category ? category.id : null,
					keyword: s.keyword
				};
			});

			return { success: true, suggestions: suggestionsWithIds };
		} catch (err: any) {
			console.error('AI Suggestion Error:', err);
			if (
				err.name === 'AbortError' ||
				err.message?.includes('timeout') ||
				err.message?.includes('Timeout')
			) {
				return fail(500, { error: 'AI-analyse tog for lang tid' });
			}
			return fail(500, { error: 'Der opstod en fejl under AI-kategoriseringen.' });
		}
	},

	save: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const formData = await request.formData();
		const accountId = formData.get('accountId')?.toString();
		const dataStr = formData.get('data')?.toString();

		if (!accountId || !dataStr) return fail(400, { error: 'Manglende data.' });

		let rows: Array<{
			hash: string;
			date: string;
			text: string;
			amount: number;
			categoryId: string | null;
			status: string;
			senderAccount: string | null;
			receiverAccount: string | null;
			receiverName: string | null;
			transferType: string | null;
			supplementalText: string | null;
			balance: string | null;
			paidBy: string | null;
			aiKeyword?: string;
		}>;

		try {
			rows = JSON.parse(dataStr);
		} catch {
			return fail(400, { error: 'Ugyldigt dataformat.' });
		}

		// Get existing hashes
		const existingHashes = new Set(
			(await prisma.transaction.findMany({ select: { hash: true } })).map((t) => t.hash)
		);

		const newRows = rows.filter((r) => !existingHashes.has(r.hash));
		const existingRows = rows.filter((r) => existingHashes.has(r.hash));

		let inserted = 0;
		let updated = 0;

		// Insert new rows
		if (newRows.length > 0) {
			await prisma.transaction.createMany({
				data: newRows.map((r) => ({
					hash: r.hash,
					date: new Date(r.date),
					text: r.text,
					amount: r.amount,
					status: r.status as 'UNPROCESSED' | 'AUTO_MAPPED' | 'MANUAL_REVIEW' | 'PROCESSED',
					accountId,
					categoryId: r.categoryId,
					senderAccount: r.senderAccount,
					receiverAccount: r.receiverAccount,
					receiverName: r.receiverName,
					transferType: r.transferType,
					supplementalText: r.supplementalText,
					balance: r.balance ? parseFloat(r.balance) : null,
					paidBy: r.paidBy
				})),
				skipDuplicates: true
			});
			inserted = newRows.length;

			// Auto-oprettelse af MappingRules ved godkendelse
			for (const r of newRows) {
				if (r.aiKeyword && r.categoryId) {
					await prisma.mappingRule.upsert({
						where: { keyword: r.aiKeyword.toLowerCase() },
						update: { categoryId: r.categoryId },
						create: { keyword: r.aiKeyword.toLowerCase(), categoryId: r.categoryId }
					});
				}
			}
		}

		// Update existing rows with enriched data
		if (existingRows.length > 0) {
			for (const r of existingRows) {
				if (r.receiverName || r.supplementalText || r.paidBy) {
					await prisma.transaction.updateMany({
						where: { hash: r.hash },
						data: {
							receiverName: r.receiverName,
							supplementalText: r.supplementalText,
							paidBy: r.paidBy,
							senderAccount: r.senderAccount,
							receiverAccount: r.receiverAccount,
							transferType: r.transferType,
							balance: r.balance ? parseFloat(r.balance) : null
						}
					});
					updated++;
				}
			}
		}

		return { success: true, inserted, updated };
	}
};
