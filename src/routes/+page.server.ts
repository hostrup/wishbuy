import { prisma } from '$lib/server/prisma';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { wishes: [], purchases: [], categories: [], kpis: null, user: null };
	}

	let categories = await prisma.category.findMany({
		orderBy: { name: 'asc' }
	});
	
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
		categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
	}

	const allItems = await prisma.item.findMany({
		include: { category: true, user: true, ratings: true },
		orderBy: { createdAt: 'desc' }
	});

	const wishes = allItems.filter(i => i.status === 'WISH');
	const purchases = allItems.filter(i => i.status === 'PURCHASED');

	const wishTotal = wishes.reduce((acc, i) => acc + i.price, 0);
	const wishShared = wishes.filter(i => i.expenseType === 'SHARED').reduce((acc, i) => acc + i.price, 0);
	const wishPersonal = wishes.filter(i => i.expenseType === 'PERSONAL').reduce((acc, i) => acc + i.price, 0);

	const buyTotal = purchases.reduce((acc, i) => acc + i.price, 0);
	const buyShared = purchases.filter(i => i.expenseType === 'SHARED').reduce((acc, i) => acc + i.price, 0);
	const buyPersonal = purchases.filter(i => i.expenseType === 'PERSONAL').reduce((acc, i) => acc + i.price, 0);

	const abandoned = allItems.filter(i => i.status === 'ABANDONED');
	const cooldownGain = abandoned.reduce((acc, i) => acc + i.price, 0);

	const wishCounts: Record<string, {name: string, amount: number}> = {};
	wishes.forEach(i => {
		if (!wishCounts[i.userId]) {
			const nameToDisplay = i.user.displayName || i.user.username;
			wishCounts[i.userId] = { name: `${i.user.emoji || '👤'} ${nameToDisplay}`, amount: 0 };
		}
		wishCounts[i.userId].amount += i.price;
	});
	const topDreamer = Object.values(wishCounts).sort((a, b) => b.amount - a.amount)[0] || { name: 'Ingen', amount: 0 };

	const buyCounts: Record<string, {name: string, amount: number}> = {};
	purchases.forEach(i => {
		if (!buyCounts[i.userId]) {
			const nameToDisplay = i.user.displayName || i.user.username;
			buyCounts[i.userId] = { name: `${i.user.emoji || '👤'} ${nameToDisplay}`, amount: 0 };
		}
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
			topDreamer, topSpender, cooldownGain
		},
		user: locals.user
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Ikke autoriseret' });

		const data = await request.formData();
		const displayName = data.get('displayName')?.toString();
		const emoji = data.get('emoji')?.toString() || '👤';

		try {
			await prisma.user.update({
				where: { id: locals.user.id },
				data: { displayName, emoji }
			});
			return { success: true };
		} catch (error) {
			return fail(500, { error: 'Kunne ikke opdatere profilen.' });
		}
	},

	createCategory: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Ikke autoriseret' });

		const data = await request.formData();
		const name = data.get('name')?.toString();
		const icon = data.get('icon')?.toString() || '📦';

		if (!name) return fail(400, { error: 'Kategorinavn er påkrævet.' });

		try {
			await prisma.category.create({
				data: { name, icon }
			});
			return { success: true };
		} catch (error) {
			return fail(500, { error: 'Kunne ikke oprette kategorien.' });
		}
	},

	updateCategory: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Ikke autoriseret' });

		const data = await request.formData();
		const categoryId = parseInt(data.get('categoryId')?.toString() || '0', 10);
		const name = data.get('name')?.toString();
		const icon = data.get('icon')?.toString() || '📦';

		if (!categoryId || !name) return fail(400, { error: 'Manglende data til kategoriopdatering.' });

		try {
			await prisma.category.update({
				where: { id: categoryId },
				data: { name, icon }
			});
			return { success: true };
		} catch (error) {
			return fail(500, { error: 'Kunne ikke opdatere kategorien.' });
		}
	},

	deleteCategory: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Ikke autoriseret' });

		const data = await request.formData();
		const categoryId = parseInt(data.get('categoryId')?.toString() || '0', 10);

		if (!categoryId) return fail(400, { error: 'Kategori-ID mangler.' });

		// Sikkerhedsnet: Tjek om kategorien er i brug
		const itemsCount = await prisma.item.count({ where: { categoryId } });
		if (itemsCount > 0) {
			return fail(400, { error: 'Kategorien kan ikke slettes, da der er ønsker knyttet til den.' });
		}

		try {
			await prisma.category.delete({
				where: { id: categoryId }
			});
			return { success: true };
		} catch (error) {
			return fail(500, { error: 'Kunne ikke slette kategorien.' });
		}
	},

	createItem: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Ikke autoriseret' });

		const data = await request.formData();
		const title = data.get('title')?.toString();
		const url = data.get('url')?.toString() || null;
		const priceStr = data.get('price')?.toString();
		const categoryIdStr = data.get('categoryId')?.toString();
		const expenseType = data.get('expenseType')?.toString() as 'PERSONAL' | 'SHARED';
		const desireLevelStr = data.get('desireLevel')?.toString();
		const desireLevel = desireLevelStr ? parseInt(desireLevelStr, 10) : 3;
		
		const targetStatus = data.get('targetStatus')?.toString() === 'PURCHASED' ? 'PURCHASED' : 'WISH';
		const purchasedDate = targetStatus === 'PURCHASED' ? new Date() : null;

		if (!title || !priceStr || !categoryIdStr || !expenseType) {
			return fail(400, { error: 'Udfyld venligst alle påkrævede felter.' });
		}

		const price = parseFloat(priceStr);
		const categoryId = parseInt(categoryIdStr, 10);

		if (isNaN(price) || isNaN(categoryId)) return fail(400, { error: 'Ugyldigt beløb eller kategori.' });

		try {
			await prisma.item.create({
				data: { 
					title, 
					url, 
					price, 
					categoryId, 
					expenseType, 
					status: targetStatus, 
					desireLevel,
					purchasedAt: purchasedDate,
					userId: locals.user.id 
				}
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

			// Tvungen Cooldown check (kun for ønsker over 1000 DKK)
			if (item.status === 'WISH' && item.price >= 1000) {
				const daysOld = (new Date().getTime() - item.createdAt.getTime()) / (1000 * 3600 * 24);
				if (daysOld < 7) {
					return fail(400, { error: `Cooldown aktiv: Varen kan tidligst købes om ${Math.ceil(7 - daysOld)} dage.` });
				}
			}

			const newStatus = item.status === 'WISH' ? 'PURCHASED' : 'WISH';
			const newPurchasedAt = newStatus === 'PURCHASED' ? new Date() : null;

			await prisma.item.update({
				where: { id: itemId },
				data: { status: newStatus, purchasedAt: newPurchasedAt }
			});
			return { success: true };
		} catch (error) { return fail(500); }
	},

	changeItemCategory: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const itemId = data.get('itemId')?.toString();
		const categoryId = parseInt(data.get('categoryId')?.toString() || '0', 10);

		if (!itemId || !categoryId) return fail(400);

		try {
			await prisma.item.update({
				where: { id: itemId },
				data: { categoryId }
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
			const item = await prisma.item.findUnique({ where: { id: itemId }});
			if (!item) return fail(404);

			if (item.status === 'WISH') {
				await prisma.item.update({ where: { id: itemId }, data: { status: 'ABANDONED' } });
			} else {
				await prisma.item.delete({ where: { id: itemId } });
			}
			return { success: true };
		} catch (error) { return fail(500); }
	}
};