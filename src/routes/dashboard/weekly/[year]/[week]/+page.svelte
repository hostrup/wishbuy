<script lang="ts">
	import DayCard from '$lib/components/DayCard.svelte';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { CheckCircle2, Loader2, ArrowLeft } from '@lucide/svelte';
	import { getISOWeeksInYear } from 'date-fns';

	let { data } = $props<{ data: PageData }>();

	let currentYear = $derived(data.weekPlan?.year ?? new Date().getFullYear());
	let currentWeek = $derived(data.weekPlan?.week_number ?? 1);

	let weeksInCurrentYear = $derived(getISOWeeksInYear(new Date(currentYear, 6, 1)));
	let weeksInPrevYear = $derived(getISOWeeksInYear(new Date(currentYear - 1, 6, 1)));

	let prevWeek = $derived(currentWeek === 1 ? weeksInPrevYear : currentWeek - 1);
	let prevYear = $derived(currentWeek === 1 ? currentYear - 1 : currentYear);
	let nextWeek = $derived(currentWeek === weeksInCurrentYear ? 1 : currentWeek + 1);
	let nextYear = $derived(currentWeek === weeksInCurrentYear ? currentYear + 1 : currentYear);

	let isSavingWeekNote = $state(false);
	let showWeekNoteSuccess = $state(false);

	let stats = $derived.by(() => {
		if (!data.weekPlan?.dayPlans) return { totalDinners: 0, daysWithGuests: 0, totalAttendance: 0 };
		let totalDinners = 0,
			daysWithGuests = 0,
			totalAttendance = 0;
		for (const day of data.weekPlan.dayPlans) {
			if (day.recipe?.name?.trim()) totalDinners++;
			if (day.guests_note?.trim()) daysWithGuests++;
			totalAttendance += day.persons.length;
		}
		return { totalDinners, daysWithGuests, totalAttendance };
	});

	// Progress bar for planned meals
	let mealProgress = $derived(Math.round((stats.totalDinners / 7) * 100));
</script>

<div
	class="relative min-h-screen bg-slate-50 p-4 font-sans text-slate-900 md:p-8 lg:p-12 dark:bg-slate-950 dark:text-slate-100"
>
	<!-- Ambient Background Glows -->
	<div
		class="pointer-events-none absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-3xl dark:bg-amber-600/10"
	></div>
	<div
		class="pointer-events-none absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-rose-500/10 blur-3xl dark:bg-rose-500/10"
	></div>

	<div class="relative z-10 mx-auto max-w-7xl space-y-8">
		<!-- HEADER -->
		<header
			class="flex flex-col border-b border-slate-200/50 pb-4 md:flex-row md:items-end md:justify-between dark:border-white/10"
		>
			<div>
				<div class="flex items-center gap-2">
					<a
						href="/"
						class="flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
					>
						<ArrowLeft size={12} /> Tilbage til Hubben
					</a>
				</div>
				<h1
					class="mt-1 bg-gradient-to-r from-amber-600 to-amber-400 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-5xl dark:from-amber-400 dark:to-amber-300"
				>
					Ugeplan & Madplan
				</h1>
				<p class="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
					Familiens ugeskema med aftensmad, gæster og fremmøde.
				</p>
			</div>
			<div class="mt-4 flex items-center gap-3 md:mt-0">
				<a
					href="/dashboard/weekly/settings"
					class="cursor-pointer rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-xl hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
				>
					⚙️ Indstillinger
				</a>
			</div>
		</header>

		<!-- ── WEEK NAVIGATION ──────────────────────────────────── -->
		<div class="flex items-center justify-between">
			<a
				href="/dashboard/weekly/{prevYear}/{prevWeek}"
				class="group flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200/50 bg-white/80 px-4 py-3 text-sm font-bold text-slate-500 shadow-sm backdrop-blur-md transition-all hover:bg-slate-50 hover:text-amber-500 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-amber-400"
			>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="transition-transform duration-300 group-hover:-translate-x-1"
				>
					<path d="M19 12H5M12 19l-7-7 7-7" />
				</svg>
				<span class="hidden sm:inline">Uge {prevWeek}</span>
			</a>

			<!-- Center: Week badge -->
			<div class="flex flex-col items-center select-none">
				<div class="relative flex flex-col items-center">
					<span class="mb-0.5 text-[10px] font-bold tracking-[0.25em] text-slate-400 uppercase"
						>ÅR {currentYear}</span
					>
					<span
						class="bg-gradient-to-r from-amber-600 to-amber-400 bg-clip-text text-3xl font-black text-transparent md:text-4xl"
					>
						Uge {currentWeek}
					</span>
					<!-- Mini dots indicator -->
					<div class="mt-2 flex gap-1">
						{#each Array(7) as _, i}
							{@const hasRecipe = !!data.weekPlan?.dayPlans?.[i]?.recipe?.name?.trim()}
							<div
								class="h-1.5 w-1.5 rounded-full transition-all duration-500
								{hasRecipe
									? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
									: 'bg-slate-200 dark:bg-slate-700'}"
							></div>
						{/each}
					</div>
				</div>
			</div>

			<a
				href="/dashboard/weekly/{nextYear}/{nextWeek}"
				class="group flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200/50 bg-white/80 px-4 py-3 text-sm font-bold text-slate-500 shadow-sm backdrop-blur-md transition-all hover:bg-slate-50 hover:text-amber-500 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-amber-400"
			>
				<span class="hidden sm:inline">Uge {nextWeek}</span>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="transition-transform duration-300 group-hover:translate-x-1"
				>
					<path d="M5 12h14M12 5l7 7-7 7" />
				</svg>
			</a>
		</div>

		<!-- ── MAIN GRID ─────────────────────────────────────────── -->
		<div class="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-6">
			<!-- LEFT: Day cards -->
			<div class="space-y-4 lg:col-span-8">
				{#if data.weekPlan?.dayPlans}
					{#each data.weekPlan.dayPlans as dayPlan}
						<div>
							<DayCard {dayPlan} allPersons={data.allPersons} recentRecipes={data.recentRecipes} />
						</div>
					{/each}
				{:else}
					<div
						class="rounded-3xl border border-slate-200/50 bg-white/80 p-16 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
					>
						<div class="mb-4 text-5xl">📅</div>
						<p class="font-medium text-slate-500 dark:text-slate-400">
							Ingen dage fundet for denne uge.
						</p>
					</div>
				{/if}
			</div>

			<!-- RIGHT: Sidebar -->
			<div class="space-y-5 lg:col-span-4">
				<!-- STATS BENTO CARDS -->
				<div class="grid grid-cols-3 gap-3">
					<!-- Planned meals -->
					<div
						class="col-span-1 flex flex-col items-center rounded-2xl border border-slate-200/50 bg-white/80 p-4 text-center shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/80"
					>
						<svg
							class="mb-2 h-5 w-5 text-amber-500 dark:text-amber-400"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path
								d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"
							/>
						</svg>
						<span class="text-2xl font-black text-amber-600 dark:text-amber-400"
							>{stats.totalDinners}</span
						>
						<span class="mt-1 text-[9px] font-bold tracking-wider text-slate-400 uppercase"
							>Aftensmad</span
						>
					</div>
					<!-- Guests -->
					<div
						class="col-span-1 flex flex-col items-center rounded-2xl border border-slate-200/50 bg-white/80 p-4 text-center shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/80"
					>
						<svg
							class="mb-2 h-5 w-5 text-rose-500 dark:text-rose-400"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle
								cx="9"
								cy="7"
								r="4"
							/><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
						<span class="text-2xl font-black text-rose-500 dark:text-rose-400"
							>{stats.daysWithGuests}</span
						>
						<span class="mt-1 text-[9px] font-bold tracking-wider text-slate-400 uppercase"
							>Gæstedage</span
						>
					</div>
					<!-- Attendance -->
					<div
						class="col-span-1 flex flex-col items-center rounded-2xl border border-slate-200/50 bg-white/80 p-4 text-center shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/80"
					>
						<svg
							class="mb-2 h-5 w-5 text-violet-500"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path
								d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
							/>
						</svg>
						<span class="text-2xl font-black text-violet-500">{stats.totalAttendance}</span>
						<span class="mt-1 text-[9px] font-bold tracking-wider text-slate-400 uppercase"
							>Deltagere</span
						>
					</div>
				</div>

				<!-- MEAL PROGRESS BAR -->
				<div
					class="rounded-2xl border border-slate-200/50 bg-white/80 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/80"
				>
					<div class="mb-3 flex items-center justify-between">
						<span class="text-xs font-black tracking-wider text-slate-400 uppercase"
							>Ugens måltider</span
						>
						<span class="text-sm font-black text-amber-600 dark:text-amber-400"
							>{stats.totalDinners}/7</span
						>
					</div>
					<div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
						<div
							class="relative h-full overflow-hidden rounded-full bg-amber-500 transition-all duration-1000 ease-out dark:bg-amber-400"
							style="width: {mealProgress}%; shadow: 0 0 12px rgba(245,158,11,0.4);"
						></div>
					</div>
					<!-- Day dots below bar -->
					<div class="mt-2.5 flex justify-between">
						{#each ['M', 'T', 'O', 'T', 'F', 'L', 'S'] as label, i}
							{@const hasRecipe = !!data.weekPlan?.dayPlans?.[i]?.recipe?.name?.trim()}
							<div class="flex flex-col items-center gap-1">
								<div
									class="h-1.5 w-1.5 rounded-full {hasRecipe
										? 'bg-amber-500 dark:bg-amber-400'
										: 'bg-slate-200 dark:bg-slate-700'}"
								></div>
								<span class="text-[8px] font-bold text-slate-400">{label}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- WEEK NOTE (sticky) -->
				<div
					class="sticky top-24 rounded-3xl border border-slate-200/50 bg-white/80 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/80"
				>
					<div class="mb-4 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10"
							>
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="text-amber-500 dark:text-amber-400"
								>
									<circle cx="12" cy="12" r="5" /><path
										d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
									/>
								</svg>
							</div>
							<h3 class="text-sm font-black tracking-tight text-slate-800 dark:text-white">
								Ugens Husk
							</h3>
						</div>
						{#if isSavingWeekNote}
							<Loader2 size={12} class="animate-spin text-amber-500" />
						{:else}
							<CheckCircle2
								size={12}
								class="text-emerald-500 transition-opacity duration-300 {showWeekNoteSuccess
									? 'opacity-100'
									: 'opacity-0'}"
							/>
						{/if}
					</div>

					<form
						method="POST"
						action="?/updateWeekNote"
						use:enhance={() => {
							isSavingWeekNote = true;
							showWeekNoteSuccess = false;
							return async ({ result, update }) => {
								isSavingWeekNote = false;
								if (result.type === 'success') {
									showWeekNoteSuccess = true;
									setTimeout(() => {
										showWeekNoteSuccess = false;
									}, 2000);
								}
								await update({ reset: false });
							};
						}}
					>
						<input type="hidden" name="weekPlanId" value={data.weekPlan?.id} />
						<textarea
							name="note"
							placeholder="Hvem henter hvem? Hvad skal vi huske?"
							class="h-32 w-full resize-none rounded-2xl border border-slate-200 bg-white/50 p-4 text-sm leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-500 focus:bg-white dark:border-white/10 dark:bg-slate-900/50 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
							onblur={(e) => {
								e.currentTarget.closest('form')?.requestSubmit();
							}}>{data.weekPlan?.note || ''}</textarea
						>
						<button
							type="submit"
							class="mt-3 w-full cursor-pointer rounded-2xl bg-amber-600 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-amber-500"
						>
							Gem noter
						</button>
					</form>
				</div>

				<!-- SHOPPING TEASER -->
				<div
					class="relative overflow-hidden rounded-3xl border border-dashed border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/30 dark:bg-amber-950/10"
				>
					<div class="mb-2 flex items-center gap-2">
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="text-amber-500 dark:text-amber-400"
						>
							<circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path
								d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
							/>
						</svg>
						<h3
							class="text-xs font-black tracking-wider text-amber-700 uppercase dark:text-amber-300"
						>
							Indkøbsliste
						</h3>
					</div>
					<p class="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
						Automatisk indkøbsliste fra ugens opskrifter. <span
							class="font-bold text-amber-600 dark:text-amber-400">Coming soon</span
						>
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
