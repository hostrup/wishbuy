import { prisma } from '$lib/server/prisma';
import type { RequestHandler } from './$types';
import ical from 'ical-generator';
import { addDays } from 'date-fns';

/**
 * Returnerer 18:00 Copenhagen-tid som et UTC Date objekt for en given dato.
 * Bruger Intl API til at korrekt beregne UTC offset (DST-bevidst).
 */
function getDinnerTimeUTC(planDate: Date): Date {
	const year = planDate.getUTCFullYear();
	const month = planDate.getUTCMonth() + 1;
	const day = planDate.getUTCDate();

	const formatter = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Europe/Copenhagen',
		hour: 'numeric',
		hour12: false
	});

	// Test 17:00 UTC (= 18:00 CET vintertid) og 16:00 UTC (= 18:00 CEST sommertid)
	const candidate17 = new Date(Date.UTC(year, month - 1, day, 17, 0, 0));
	const candidate16 = new Date(Date.UTC(year, month - 1, day, 16, 0, 0));

	const hour17 = parseInt(formatter.format(candidate17));
	return hour17 === 18 ? candidate17 : candidate16;
}

export const GET: RequestHandler = async () => {
	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);

	const thirtyDaysFromNow = addDays(today, 30);

	const plans = await prisma.dayPlan.findMany({
		where: {
			date: {
				gte: today,
				lte: thirtyDaysFromNow
			},
			recipeId: { not: null }
		},
		include: {
			recipe: true,
			persons: { include: { person: true } }
		},
		orderBy: { date: 'asc' }
	});

	const cal = ical({ name: 'Ugeplan & Madplan', timezone: 'Europe/Copenhagen' });

	for (const plan of plans) {
		if (!plan.recipe) continue;

		// Korrekt DST-bevidst konvertering: 18:00 Copenhagen tid -> UTC
		const startUTC = getDinnerTimeUTC(new Date(plan.date));
		const end = new Date(startUTC.getTime() + 60 * 60 * 1000); // 1 time

		const eatingPersons = plan.persons.map((p) => p.person.name).join(', ');
		let description = plan.note ? `Note: ${plan.note}\n` : '';
		if (eatingPersons) {
			description += `Spiser med: ${eatingPersons}`;
		}

		cal.createEvent({
			start: startUTC,
			end: end,
			summary: `🍽️ ${plan.recipe.name}`,
			description: description,
			url: 'https://wishbuy.hostrup.org'
		});
	}

	return new Response(cal.toString(), {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': 'attachment; filename="ugeplan.ics"'
		}
	});
};
