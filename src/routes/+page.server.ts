import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { user: locals.user };
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
	}
};
