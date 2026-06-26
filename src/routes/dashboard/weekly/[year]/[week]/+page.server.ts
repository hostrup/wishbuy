import { prisma } from '$lib/server/prisma';
import type { PageServerLoad, Actions } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const year = parseInt(params.year, 10);
	const weekNumber = parseInt(params.week, 10);

	// Valider parametre — parseInt returnerer NaN ved ugyldige URL-segmenter
	if (isNaN(year) || isNaN(weekNumber) || weekNumber < 1 || weekNumber > 53) {
		error(400, 'Ugyldig uge eller årstal i URL');
	}

	// Bootstrap persons if none exist
	let allPersons = await prisma.person.findMany({
		orderBy: { createdAt: 'asc' }
	});

	if (allPersons.length === 0) {
		const defaultPersons = [
			{ name: 'Mathilde', emoji: '👩', default_presence_days: '1,2,3,4,5,6,7' },
			{ name: 'Ronni', emoji: '👨', default_presence_days: '1,2,3,4,5,6,7' },
			{ name: 'Rasmus', emoji: '👦', default_presence_days: '1,2,3,4,5,6,7' },
			{ name: 'Emil', emoji: '🧒', default_presence_days: '5,6,7' },
			{ name: 'Sara', emoji: '👱‍♀️', default_presence_days: '' }
		];
		for (const p of defaultPersons) {
			await prisma.person.create({ data: p });
		}
		allPersons = await prisma.person.findMany({
			orderBy: { createdAt: 'asc' }
		});
	}

	// Find eller opret uge
	let weekPlan = await prisma.weekPlan.findUnique({
		where: { year_week_number: { year, week_number: weekNumber } },
		include: {
			dayPlans: {
				include: {
					recipe: true,
					persons: { include: { person: true } }
				},
				orderBy: { date: 'asc' }
			}
		}
	});

	if (!weekPlan) {
		weekPlan = await prisma.weekPlan.create({
			data: { year, week_number: weekNumber },
			include: { dayPlans: { include: { recipe: true, persons: { include: { person: true } } } } }
		});
	}

	// Udregn start på ugen korrekt i UTC (håndterer alle ISO edge cases inkl. uge 53 uden tidszone-skift)
	// 4. januar er altid i ISO uge 1
	const jan4 = new Date(Date.UTC(year, 0, 4));
	const jan4DayOfWeek = jan4.getUTCDay() || 7; // Map søndag (0) til 7
	const firstWeekStart = new Date(Date.UTC(year, 0, 4 - (jan4DayOfWeek - 1)));
	const startOfWeekUTC = new Date(
		firstWeekStart.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000
	);

	if (weekPlan.dayPlans.length < 7) {
		for (let i = 0; i < 7; i++) {
			const dayDate = new Date(startOfWeekUTC.getTime());
			dayDate.setUTCDate(startOfWeekUTC.getUTCDate() + i);

			const existingDay = weekPlan.dayPlans.find((dp) => dp.date.getTime() === dayDate.getTime());
			if (!existingDay) {
				// Opret dagen
				const newDay = await prisma.dayPlan.create({
					data: {
						date: dayDate,
						weekPlanId: weekPlan.id
					}
				});

				// Tilføj default personer baseret på ugedag (0 = Søndag, 1 = Mandag... Date.getDay() for UTC)
				const jsDay = dayDate.getUTCDay();
				// Vi oversætter jsDay til ISO ugedag (1=Mandag, 7=Søndag) for at matche evt logik
				const isoDay = jsDay === 0 ? 7 : jsDay;

				for (const person of allPersons) {
					const defaultDays = person.default_presence_days.split(',').map(Number);
					if (defaultDays.includes(isoDay)) {
						await prisma.dayPlanPerson.create({
							data: { dayPlanId: newDay.id, personId: person.id }
						});
					}
				}
			}
		}

		// Genindlæs ugeplanen efter oprettelse af dage
		weekPlan = (await prisma.weekPlan.findUnique({
			where: { id: weekPlan.id },
			include: {
				dayPlans: {
					include: {
						recipe: true,
						persons: { include: { person: true } }
					},
					orderBy: { date: 'asc' }
				}
			}
		})) as typeof weekPlan;
	}

	const recentRecipes = await prisma.recipe.findMany({
		orderBy: { last_used: 'desc' },
		take: 20
	});

	return {
		weekPlan,
		allPersons,
		recentRecipes
	};
};

export const actions: Actions = {
	updateRecipe: async ({ request }) => {
		const data = await request.formData();
		const dayPlanId = data.get('dayPlanId') as string;
		const recipeName = data.get('recipeName') as string;

		if (!dayPlanId) return { success: false };

		if (!recipeName || recipeName.trim() === '') {
			await prisma.dayPlan.update({
				where: { id: dayPlanId },
				data: { recipeId: null }
			});
			return { success: true };
		}

		// Find eller opret recipe
		let recipe = await prisma.recipe.findFirst({
			where: { name: { equals: recipeName.trim(), mode: 'insensitive' } }
		});

		if (!recipe) {
			recipe = await prisma.recipe.create({
				data: { name: recipeName.trim(), last_used: new Date() }
			});
		} else {
			recipe = await prisma.recipe.update({
				where: { id: recipe.id },
				data: { last_used: new Date() }
			});
		}

		await prisma.dayPlan.update({
			where: { id: dayPlanId },
			data: { recipeId: recipe.id }
		});

		return { success: true };
	},

	togglePerson: async ({ request }) => {
		const data = await request.formData();
		const dayPlanId = data.get('dayPlanId') as string;
		const personId = data.get('personId') as string;
		const isPresent = data.get('isPresent') === 'true';

		try {
			if (isPresent) {
				await prisma.dayPlanPerson.delete({
					where: { dayPlanId_personId: { dayPlanId, personId } }
				});
			} else {
				await prisma.dayPlanPerson.create({
					data: { dayPlanId, personId }
				});
			}
		} catch (e: unknown) {
			// Håndter race conditions: P2025 = allerede slettet, P2002 = allerede oprettet, P2023 = ugyldig UUID
			const code = (e as { code?: string })?.code;
			if (code !== 'P2025' && code !== 'P2002' && code !== 'P2023') throw e;
		}

		return { success: true };
	},

	updateNote: async ({ request }) => {
		const data = await request.formData();
		const dayPlanId = data.get('dayPlanId') as string;
		const note = data.get('note') as string;

		await prisma.dayPlan.update({
			where: { id: dayPlanId },
			data: { note: note ? note.trim() : null }
		});

		return { success: true };
	},

	updateWeekNote: async ({ request }) => {
		const data = await request.formData();
		const weekPlanId = data.get('weekPlanId') as string;
		const note = data.get('note') as string;

		if (!weekPlanId) return { success: false };

		await prisma.weekPlan.update({
			where: { id: weekPlanId },
			data: { note: note ? note.trim() : null }
		});

		return { success: true };
	},

	updateGuests: async ({ request }) => {
		const data = await request.formData();
		const dayPlanId = data.get('dayPlanId') as string;
		const guests_note = data.get('guests_note') as string;

		if (!dayPlanId) return { success: false };

		await prisma.dayPlan.update({
			where: { id: dayPlanId },
			data: { guests_note: guests_note ? guests_note.trim() : null }
		});

		return { success: true };
	}
};
