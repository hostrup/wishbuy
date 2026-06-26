import { prisma } from '$lib/server/prisma';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const allPersons = await prisma.person.findMany({
		orderBy: { createdAt: 'asc' }
	});

	return {
		user: locals.user,
		allPersons
	};
};

export const actions: Actions = {
	updateUser: async ({ request, locals }) => {
		const data = await request.formData();
		const displayName = data.get('displayName') as string;
		const emoji = data.get('emoji') as string;

		if (!locals.user) return fail(401, { error: 'Not authenticated' });

		await prisma.user.update({
			where: { id: locals.user.id },
			data: {
				displayName: displayName || locals.user.username,
				emoji: emoji || '👤'
			}
		});

		return { success: true };
	},

	addPerson: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const emoji = data.get('emoji') as string;
		const defaultPresence = data.get('defaultPresence') as string; // Fx "1,2,3,4,5"

		if (!name) return fail(400, { error: 'Navn er påkrævet' });

		await prisma.person.create({
			data: {
				name,
				emoji: emoji || '👤',
				default_presence_days: defaultPresence || '1,2,3,4,5,6,7'
			}
		});

		return { success: true };
	},

	updatePerson: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const name = data.get('name') as string;
		const emoji = data.get('emoji') as string;
		const defaultPresence = data.get('defaultPresence') as string;

		if (!id || !name) return fail(400, { error: 'ID og navn er påkrævet' });

		await prisma.person.update({
			where: { id },
			data: {
				name,
				emoji: emoji || '👤',
				default_presence_days: defaultPresence || '1,2,3,4,5,6,7'
			}
		});

		return { success: true };
	},

	deletePerson: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;

		if (!id) return fail(400, { error: 'ID er påkrævet' });

		await prisma.person.delete({
			where: { id }
		});

		return { success: true };
	}
};
