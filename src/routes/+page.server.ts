import { prisma } from '$lib/server/prisma';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// 1. Sikkerhed: Hent kun data, hvis brugeren er logget ind
	if (!locals.user) {
		return { items: [], categories: [], kpis: null };
	}

	// 2. Auto-opret standardkategorier
	let categories = await prisma.category.findMany();
	if (categories.length === 0) {
		await prisma.category.createMany({
			data: [
				{ name: 'Personlig pleje', icon: '🧴' },
				{ name: 'HIFI & Lyd', icon: '🎧' },
				{ name: 'Teknik & IT', icon: '💻' },
				{ name: 'Biler & Tilbehør', icon: '🚗' },
				{ name: 'Have', icon: '🏡' },
				{ name: 'Tøj og Sko', icon: '👔' },
				{ name: 'Gadgets', icon: '🕹️' },
				{ name: 'Diverse', icon: '📦' }
			]
		});
		categories = await prisma.category.findMany();
	}

	// 3. Hent alle ønsker inkl. kategori, ejer og ratings
	const items = await prisma.item.findMany({
		include: { 
			category: true,
			user: true,
			ratings: true
		},
		orderBy: { createdAt: 'desc' }
	});

	// --- KPI Beregninger ---
	const totalWishes = items.length;
	const spentItems = items.filter(i => i.status === 'PURCHASED');
	const totalSpent = spentItems.reduce((acc, i) => acc + i.price, 0);
	
	const sharedWishes = items.filter(i => i.expenseType === 'SHARED' && i.status === 'WISH');
	const personalWishes = items.filter(i => i.expenseType === 'PERSONAL' && i.status === 'WISH');
	
	const totalSharedAmount = sharedWishes.reduce((acc, i) => acc + i.price, 0);
	const totalPersonalAmount = personalWishes.reduce((acc, i) => acc + i.price, 0);

	// Find hvem der har flest ønsker (WISH status)
	const counts: Record<string, {name: string, count: number}> = {};
	items.filter(i => i.status === 'WISH').forEach(i => {
		if (!counts[i.userId]) counts[i.userId] = { name: i.user.username, count: 0 };
		counts[i.userId].count++;
	});
	
	const topUser = Object.values(counts).sort((a, b) => b.count - a.count)[0] || { name: 'Ingen', count: 0 };

	return {
		items,
		categories,
		kpis: {
			totalWishes,
			totalSpent,
			totalSharedAmount,
			totalPersonalAmount,
			topUser,
			activeWishes: items.filter(i => i.status === 'WISH').length
		}
	};
};

export const actions: Actions = {
	createItem: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Ikke autoriseret' });

		const data = await request.formData();
		const title = data.get('title')?.toString();
		const url = data.get('url')?.toString() || null;
		const priceStr = data.get('price')?.toString();
		const categoryIdStr = data.get('categoryId')?.toString();
		const expenseType = data.get('expenseType')?.toString() as 'PERSONAL' | 'SHARED';

		if (!title || !priceStr || !categoryIdStr || !expenseType) {
			return fail(400, { error: 'Udfyld venligst alle påkrævede felter.' });
		}

		const price = parseFloat(priceStr);
		const categoryId = parseInt(categoryIdStr, 10);

		if (isNaN(price) || isNaN(categoryId)) {
			return fail(400, { error: 'Ugyldigt beløb eller kategori.' });
		}

		try {
			await prisma.item.create({
				data: {
					title,
					url,
					price,
					categoryId,
					expenseType,
					userId: locals.user.id
				}
			});
			return { success: true };
		} catch (error) {
			console.error('Fejl ved oprettelse:', error);
			return fail(500, { error: 'Intern serverfejl.' });
		}
	},

	rateItem: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		
		const data = await request.formData();
		const itemId = data.get('itemId')?.toString();
		const value = parseInt(data.get('value')?.toString() || '0');

		if (!itemId || !value) return fail(400);

		try {
			await prisma.rating.upsert({
				where: { itemId_userId: { itemId, userId: locals.user.id } },
				update: { value },
				create: { itemId, userId: locals.user.id, value }
			});
			return { success: true };
		} catch (error) {
			console.error('Fejl ved rating:', error);
			return fail(500);
		}
	}
};