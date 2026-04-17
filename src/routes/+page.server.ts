import { prisma } from '$lib/server/prisma';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { wishes: [], purchases: [], categories: [], kpis: null };
	}

	let categories = await prisma.category.findMany();
	if (categories.length === 0) {
		await prisma.category.createMany({
			data: [
				{ name: 'Personlig pleje', icon: '🧴' },
				{ name: 'HIFI & Lyd', icon: '🎧' },
				{ name: 'Teknik & IT', icon: '💻' },
				{ name: 'Biler & Tilbehør', icon: '🚗' },
				{ name: 'Hus & Have', icon: '🏡' },
				{ name: 'Tøj & Sko', icon: '👔' },
				{ name: 'Oplevelser', icon: '🥂' },
				{ name: 'Diverse', icon: '📦' }
			]
		});
		categories = await prisma.category.findMany();
	}

	const allItems = await prisma.item.findMany({
		include: { category: true, user: true, ratings: true },
		orderBy: { createdAt: 'desc' }
	});

	// Split data til listerne
	const wishes = allItems.filter(i => i.status === 'WISH');
	const purchases = allItems.filter(i => i.status === 'PURCHASED');

	// --- KPI Beregninger ---
	// 1. Ønsker (Drømme)
	const wishTotal = wishes.reduce((acc, i) => acc + i.price, 0);
	const wishShared = wishes.filter(i => i.expenseType === 'SHARED').reduce((acc, i) => acc + i.price, 0);
	const wishPersonal = wishes.filter(i => i.expenseType === 'PERSONAL').reduce((acc, i) => acc + i.price, 0);

	// 2. Køb (Realiseret forbrug)
	const buyTotal = purchases.reduce((acc, i) => acc + i.price, 0);
	const buyShared = purchases.filter(i => i.expenseType === 'SHARED').reduce((acc, i) => acc + i.price, 0);
	const buyPersonal = purchases.filter(i => i.expenseType === 'PERSONAL').reduce((acc, i) => acc + i.price, 0);

	// 3. Extremer (Hvem drømmer og forbruger mest?)
	const wishCounts: Record<string, {name: string, amount: number}> = {};
	wishes.forEach(i => {
		if (!wishCounts[i.userId]) wishCounts[i.userId] = { name: i.user.username, amount: 0 };
		wishCounts[i.userId].amount += i.price;
	});
	const topDreamer = Object.values(wishCounts).sort((a, b) => b.amount - a.amount)[0] || { name: 'Ingen', amount: 0 };

	const buyCounts: Record<string, {name: string, amount: number}> = {};
	purchases.forEach(i => {
		if (!buyCounts[i.userId]) buyCounts[i.userId] = { name: i.user.username, amount: 0 };
		buyCounts[i.userId].amount += i.price;
	});
	const topSpender = Object.values(buyCounts).sort((a, b) => b.amount - a.amount)[0] || { name: 'Ingen', amount: 0 };

	return {
		wishes,
		purchases,
		categories,
		kpis: {
			wishTotal, wishShared, wishPersonal, wishCount: wishes.length,
			buyTotal, buyShared, buyPersonal, buyCount: purchases.length,
			topDreamer, topSpender
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
		
		// Magien fra de to knapper (Hvilken knap blev trykket på?)
		const targetStatus = data.get('targetStatus')?.toString() === 'PURCHASED' ? 'PURCHASED' : 'WISH';

		if (!title || !priceStr || !categoryIdStr || !expenseType) {
			return fail(400, { error: 'Udfyld venligst alle påkrævede felter.' });
		}

		const price = parseFloat(priceStr);
		const categoryId = parseInt(categoryIdStr, 10);

		if (isNaN(price) || isNaN(categoryId)) return fail(400, { error: 'Ugyldigt beløb eller kategori.' });

		try {
			await prisma.item.create({
				data: { title, url, price, categoryId, expenseType, status: targetStatus, userId: locals.user.id }
			});
			return { success: true };
		} catch (error) {
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
		} catch (error) { return fail(500); }
	},

	toggleStatus: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const itemId = data.get('itemId')?.toString();

		if (!itemId) return fail(400);

		try {
			const item = await prisma.item.findUnique({ where: { id: itemId }});
			if (!item) return fail(404);

			await prisma.item.update({
				where: { id: itemId },
				data: { status: item.status === 'WISH' ? 'PURCHASED' : 'WISH' }
			});
			return { success: true };
		} catch (error) { return fail(500); }
	},

	deleteItem: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const itemId = data.get('itemId')?.toString();

		if (!itemId) return fail(400);

		try {
			await prisma.item.delete({ where: { id: itemId } });
			return { success: true };
		} catch (error) { return fail(500); }
	}
};