import { redirect } from '@sveltejs/kit';
import { getISOWeek, getYear } from 'date-fns';

export const load = async () => {
	const now = new Date();
	throw redirect(302, `/dashboard/weekly/${getYear(now)}/${getISOWeek(now)}`);
};
