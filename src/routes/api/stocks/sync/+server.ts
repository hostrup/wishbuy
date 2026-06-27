import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	updateStockQuotes,
	updateDailyCloses,
	updateExchangeRate
} from '$lib/server/stocks/fetchPrices';
import type { RequestHandler } from './$types';

// SIKKERHEDSNOTAT: Denne rute er undtaget Authelia-header-tjekket i hooks.server.ts,
// fordi den kaldes af host-cron uden om proxyen. Adgang kræver i stedet en gyldig
// Bearer-token (CRON_SECRET). Offentlig adgang er desuden blokeret i Authelia.
// Fjern ALDRIG token-tjekket nedenfor.

function authorize(request: Request): boolean {
	const secret = env.CRON_SECRET;
	if (!secret) return false;
	const header = request.headers.get('authorization') ?? '';
	return header === `Bearer ${secret}`;
}

export const POST: RequestHandler = async ({ request, url }) => {
	if (!authorize(request)) {
		throw error(401, 'Unauthorized');
	}

	const mode = url.searchParams.get('mode') ?? 'all';
	const out: Record<string, unknown> = { mode };

	try {
		if (mode === 'quotes' || mode === 'all') {
			out.quotes = await updateStockQuotes();
		}
		if (mode === 'daily' || mode === 'all') {
			out.daily = await updateDailyCloses();
		}
		if (mode === 'fx' || mode === 'all') {
			out.fx = await updateExchangeRate();
		}
		return json({ ok: true, syncedAt: new Date().toISOString(), ...out });
	} catch (e) {
		return json(
			{ ok: false, error: e instanceof Error ? e.message : 'Sync fejlede', ...out },
			{ status: 500 }
		);
	}
};
