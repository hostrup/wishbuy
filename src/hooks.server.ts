import { prisma } from '$lib/server/prisma';
import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const isBypassedPath =
		event.url.pathname === '/api/calendar/feed.ics' ||
		event.url.pathname === '/api/stocks/sync' ||
		event.url.pathname === '/manifest.json' ||
		event.url.pathname.startsWith('/favicon') ||
		event.url.pathname.startsWith('/_app');

	if (isBypassedPath) {
		// SIKKERHEDSNOTAT: /api/calendar/feed.ics tilgås lokalt af Home Assistant (uden om Authelia-proxy).
		// /api/stocks/sync kaldes af host-cron uden om proxyen og beskytter sig selv med CRON_SECRET (Bearer-token).
		// Offentlig adgang til begge er blokeret i Authelia's configuration.yml. Fjern ALDRIG disse bypasses.
		return resolve(event);
	}

	// SvelteKit laver altid HTTP headers om til små bogstaver for at følge HTTP/2 standarden
	const authHeaderName = (env.AUTH_HEADER || 'remote-user').toLowerCase();
	const username = event.request.headers.get(authHeaderName);

	if (username) {
		const user = await prisma.user.upsert({
			where: { username: username },
			update: {},
			create: { username: username }
		});
		event.locals.user = user;
	} else {
		const fallbackUser = await prisma.user.upsert({
			where: { username: 'ronni_dev' },
			update: {},
			create: { username: 'ronni_dev' }
		});
		event.locals.user = fallbackUser;
	}

	return resolve(event);
};
