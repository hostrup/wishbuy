import { prisma } from '$lib/server/prisma';
import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// SvelteKit laver altid HTTP headers om til små bogstaver for at følge HTTP/2 standarden
	const authHeaderName = (env.AUTH_HEADER || 'remote-user').toLowerCase();
	const username = event.request.headers.get(authHeaderName);

	// --- DEBUGGING: Dette udskrives i din Docker log ---
	console.log(`[AUTH] Kigger efter header: '${authHeaderName}'`);
	console.log(`[AUTH] Værdi modtaget fra Nginx:`, username);
	// ---------------------------------------------------

	if (username) {
		// Hvis Authelia sender et brugernavn, slår vi det op (eller opretter det automatisk første gang)
		const user = await prisma.user.upsert({
			where: { username: username },
			update: {}, // Gør intet hvis brugeren allerede findes
			create: { username: username } // Opret Mathilde/Ronni hvis det er første login
		});
		event.locals.user = user;
	} else {
		// Hvis ingen header findes (fx ved lokal udvikling uden NPM), falder vi tilbage til dev-brugeren
		console.log('[AUTH] ADVARSEL: Ingen header fundet. Bruger fallback (ronni_dev)');
		const fallbackUser = await prisma.user.upsert({
			where: { username: 'ronni_dev' },
			update: {},
			create: { username: 'ronni_dev' }
		});
		event.locals.user = fallbackUser;
	}

	return resolve(event);
};