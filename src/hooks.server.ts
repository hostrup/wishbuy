import { prisma } from '$lib/server/prisma';
import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const handle: Handle = async ({ event, resolve }) => {
	// I SvelteKit bruger vi 'env' fra $env/dynamic/private til at læse variabler ved runtime
	const authHeaderName = env.AUTH_HEADER?.toLowerCase() || 'remote-user';
	
	// Til lokal udvikling bruger vi bare et 'ronni_dev' fallback
	const username = event.request.headers.get(authHeaderName) || 'ronni_dev';

	if (username) {
		// Find brugeren i databasen
		let user = await prisma.user.findUnique({
			where: { username }
		});

		// Hvis det er første gang du logger ind, opretter vi dig automatisk
		if (!user) {
			user = await prisma.user.create({
				data: { 
					username: username,
					displayName: username 
				}
			});
		}

		// Gem brugeren globalt for dette request
		event.locals.user = {
			id: user.id,
			username: user.username
		};
	} else {
		event.locals.user = null;
	}

	return resolve(event);
};