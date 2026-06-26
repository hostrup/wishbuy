<script lang="ts">
	import { enhance } from '$app/forms';
	import { Users, Loader2, CheckCircle2 } from '@lucide/svelte';

	import type { Person, Recipe } from '@prisma/client';

	interface DayPlanPerson {
		dayPlanId: string;
		personId: string;
		person?: Person;
	}

	interface DayPlanExtended {
		id: string;
		date: Date | string;
		note: string | null;
		guests_note: string | null;
		recipeId: string | null;
		recipe: Recipe | null;
		persons: DayPlanPerson[];
	}

	let { dayPlan, allPersons, recentRecipes } = $props<{
		dayPlan: DayPlanExtended;
		allPersons: Person[];
		recentRecipes: Recipe[];
	}>();

	let date = $derived(new Date(dayPlan.date));
	const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
	const dayNamesShort = ['SØN', 'MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR'];
	let dayName = $derived(dayNames[date.getUTCDay()]);
	let dayNameShort = $derived(dayNamesShort[date.getUTCDay()]);
	let isToday = $derived(
		new Date().toISOString().split('T')[0] === date.toISOString().split('T')[0]
	);

	let isSavingRecipe = $state(false);
	let showRecipeSuccess = $state(false);
	let isSavingNote = $state(false);
	let showNoteSuccess = $state(false);
	let isEditingGuests = $state(false);

	let presentPersonIds = $derived(dayPlan.persons.map((p: DayPlanPerson) => p.personId));
	let presentCount = $derived(dayPlan.persons.length);

	let isFocusedRecipe = $state(false);
	let isFocusedNote = $state(false);

	// eslint-disable-next-line svelte/prefer-writable-derived
	let lastSubmittedRecipe = $state('');
	// eslint-disable-next-line svelte/prefer-writable-derived
	let lastSubmittedNote = $state('');

	$effect(() => {
		lastSubmittedRecipe = dayPlan.recipe?.name || '';
	});
	$effect(() => {
		lastSubmittedNote = dayPlan.note || '';
	});

	// Compact status text
	let statusText = $derived(
		presentCount === 0
			? 'Ingen hjemme'
			: presentCount === allPersons.length
				? 'Alle med'
				: `${presentCount}/${allPersons.length}`
	);
	let statusColor = $derived(
		presentCount === 0
			? 'text-slate-400 dark:text-slate-600'
			: presentCount === allPersons.length
				? 'text-emerald-500 dark:text-emerald-400'
				: 'text-amber-500'
	);
	let hasRecipe = $derived(!!dayPlan.recipe?.name);
</script>

<article
	class="group relative flex flex-col overflow-hidden rounded-3xl border transition-all duration-500
	{isToday
		? 'border-indigo-500/50 bg-white/90 shadow-[0_8px_48px_rgba(108,92,231,0.15)] dark:border-indigo-400/50 dark:bg-slate-800/90 dark:shadow-[0_8px_48px_rgba(108,92,231,0.1)]'
		: 'border-slate-200/50 bg-white/80 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80'}"
>
	<!-- Today indicator line top -->
	{#if isToday}
		<div
			class="absolute top-0 right-0 left-0 h-[2px] rounded-full"
			style="background: linear-gradient(90deg, transparent, var(--color-indigo-400) 30%, var(--color-indigo-500) 50%, var(--color-indigo-400) 70%, transparent);
			       box-shadow: 0 0 12px var(--color-indigo-500), 0 0 24px var(--color-indigo-500);"
		></div>
	{/if}

	<!-- ── HEADER ─────────────────────────────────────────── -->
	<div class="flex items-center justify-between px-5 pt-5 pb-3">
		<div class="flex items-center gap-3">
			<!-- Day number badge -->
			<div
				class="flex h-12 w-12 flex-col items-center justify-center rounded-2xl transition-all duration-300
				{isToday
					? 'bg-gradient-to-br from-indigo-500 to-rose-400 shadow-[0_4px_16px_rgba(108,92,231,0.35)]'
					: 'border border-slate-200/50 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]'}"
			>
				<span
					class="text-[9px] font-black tracking-[0.12em] uppercase
					{isToday ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}"
				>
					{dayNameShort}
				</span>
				<span
					class="text-lg leading-none font-black
					{isToday ? 'text-white' : 'text-slate-900 dark:text-white'}"
				>
					{date.getUTCDate()}
				</span>
			</div>
			<div>
				<h2
					class="text-base font-black tracking-tight
					{isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}"
				>
					{dayName}
				</h2>
				<p class="text-[11px] font-bold {statusColor} transition-colors">{statusText}</p>
			</div>
		</div>

		<!-- Recipe status pill -->
		<div class="flex items-center gap-1.5">
			{#if hasRecipe}
				<span
					class="flex items-center gap-1.5 rounded-full border border-indigo-500/15 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-black tracking-wider text-indigo-600 uppercase dark:text-indigo-400"
				>
					<!-- Fork & knife SVG -->
					<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" class="opacity-80">
						<path
							d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-8.5-15.03-8.5-15.03 0h15.03zM1.02 17h15v2h-15z"
						/>
					</svg>
					{dayPlan.recipe.name.split(' ').slice(0, 2).join(' ')}
				</span>
			{/if}
		</div>
	</div>

	<!-- ── RECIPE INPUT ──────────────────────────────────── -->
	<div class="relative px-4 pb-3">
		<form
			method="POST"
			action="?/updateRecipe"
			use:enhance={({ formData }) => {
				const value = formData.get('recipeName') as string;
				lastSubmittedRecipe = value;
				isSavingRecipe = true;
				showRecipeSuccess = false;
				return async ({ result, update }) => {
					isSavingRecipe = false;
					if (result.type === 'success') {
						showRecipeSuccess = true;
						setTimeout(() => {
							showRecipeSuccess = false;
						}, 2000);
					}
					await update({ reset: false });
				};
			}}
		>
			<input type="hidden" name="dayPlanId" value={dayPlan.id} />
			<div class="relative flex items-center">
				<!-- Fork SVG icon -->
				<span
					class="pointer-events-none absolute left-4 transition-all duration-300
					{isFocusedRecipe ? 'text-indigo-500' : 'text-slate-400/40'}"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
						<path d="M7 2v20" />
						<path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
					</svg>
				</span>
				<input
					type="text"
					id="recipe-input-{dayPlan.id}"
					name="recipeName"
					value={dayPlan.recipe?.name || ''}
					placeholder="Hvar spiser vi?"
					class="w-full rounded-2xl py-3.5 pr-12 pl-11 text-sm font-bold text-slate-800 transition-all duration-300 outline-none placeholder:text-slate-400/50 dark:text-slate-100
					{showRecipeSuccess
						? 'border border-emerald-500/40 bg-emerald-500/[0.03] shadow-[0_0_20px_rgba(16,185,129,0.12)]'
						: isSavingRecipe
							? 'border border-amber-500/30 bg-amber-500/[0.02]'
							: isFocusedRecipe
								? 'border border-indigo-500/35 bg-white/10 shadow-[0_0_20px_rgba(108,92,231,0.08)] dark:bg-slate-700/30'
								: 'border border-slate-200/50 bg-slate-50/50 hover:border-slate-300 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/10 dark:hover:bg-white/[0.04]'}"
					autocomplete="off"
					onfocus={() => (isFocusedRecipe = true)}
					onblur={(e) => {
						const value = e.currentTarget.value;
						if (value !== lastSubmittedRecipe) {
							const form = e.currentTarget.closest('form');
							setTimeout(() => {
								if (form) form.requestSubmit();
							}, 100);
						}
						setTimeout(() => (isFocusedRecipe = false), 200);
					}}
				/>
				<div class="pointer-events-none absolute right-4">
					{#if isSavingRecipe}
						<Loader2 size={14} class="animate-spin text-amber-500" />
					{:else if showRecipeSuccess}
						<CheckCircle2 size={14} class="text-emerald-500" />
					{/if}
				</div>
			</div>
		</form>

		<!-- Recipe suggestions dropdown -->
		{#if isFocusedRecipe && recentRecipes.length > 0}
			<div
				class="absolute top-full right-4 left-4 z-50 mt-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95"
			>
				<p
					class="mb-2 px-1 text-[9px] font-black tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500"
				>
					Seneste retter
				</p>
				<div class="flex flex-wrap gap-1.5">
					{#each recentRecipes.slice(0, 4) as recipe, i}
						<button
							type="button"
							onpointerdown={(e) => {
								e.preventDefault();
								const input = document.getElementById(
									`recipe-input-${dayPlan.id}`
								) as HTMLInputElement;
								if (input) {
									input.value = recipe.name;
									lastSubmittedRecipe = recipe.name;
									const form = input.closest('form');
									if (form) form.requestSubmit();
								}
								isFocusedRecipe = false;
							}}
							class="rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all duration-200 active:scale-95
							{i === 0
								? 'border border-indigo-500/20 bg-indigo-500/15 text-indigo-600 hover:bg-indigo-500 hover:text-white dark:text-indigo-400'
								: 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/5 dark:bg-white/[0.03] dark:text-neutral-300 dark:hover:bg-white/[0.08]'}"
						>
							{recipe.name}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- ── NOTE INPUT ────────────────────────────────────── -->
	<div class="px-4 pb-4">
		<form
			method="POST"
			action="?/updateNote"
			use:enhance={({ formData }) => {
				const value = formData.get('note') as string;
				lastSubmittedNote = value;
				isSavingNote = true;
				showNoteSuccess = false;
				return async ({ result, update }) => {
					isSavingNote = false;
					if (result.type === 'success') {
						showNoteSuccess = true;
						setTimeout(() => {
							showNoteSuccess = false;
						}, 2000);
					}
					await update({ reset: false });
				};
			}}
		>
			<input type="hidden" name="dayPlanId" value={dayPlan.id} />
			<div class="relative flex items-center">
				<span
					class="pointer-events-none absolute left-3.5 transition-colors duration-300
					{isFocusedNote ? 'text-indigo-500' : 'text-slate-400/30'}"
				>
					<svg
						width="13"
						height="13"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
						<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
					</svg>
				</span>
				<input
					type="text"
					name="note"
					value={dayPlan.note || ''}
					placeholder="Dagens note..."
					class="w-full rounded-xl py-2.5 pr-10 pl-10 text-[12px] font-medium transition-all duration-300 outline-none placeholder:text-slate-400/40
					{showNoteSuccess
						? 'border border-emerald-500/30 bg-emerald-500/[0.02]'
						: isFocusedNote
							? 'border border-indigo-500/25 bg-white/10 text-slate-800 shadow-[0_0_16px_rgba(108,92,231,0.06)] dark:bg-slate-700/20 dark:text-slate-200'
							: 'border border-slate-200/40 bg-transparent text-slate-600 hover:border-slate-300 dark:border-white/5 dark:text-slate-400 dark:hover:border-white/10'}"
					onfocus={() => (isFocusedNote = true)}
					onblur={(e) => {
						const value = e.currentTarget.value;
						if (value !== lastSubmittedNote) {
							const form = e.currentTarget.closest('form');
							setTimeout(() => {
								if (form) form.requestSubmit();
							}, 100);
						}
						isFocusedNote = false;
					}}
				/>
				<div class="pointer-events-none absolute right-3">
					{#if isSavingNote}
						<Loader2 size={12} class="animate-spin text-amber-500" />
					{:else if showNoteSuccess}
						<CheckCircle2 size={12} class="text-emerald-500" />
					{/if}
				</div>
			</div>
		</form>
	</div>

	<!-- ── DIVIDER ───────────────────────────────────────── -->
	<div
		class="mx-4 mb-4 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10"
	></div>

	<!-- ── PERSONS ───────────────────────────────────────── -->
	<div class="flex flex-col gap-3 px-4 pb-5">
		<div class="flex flex-wrap items-end gap-2.5">
			{#each allPersons as person, i}
				{@const isPresent = presentPersonIds.includes(person.id)}
				<form
					method="POST"
					action="?/togglePerson"
					use:enhance
					class="flex flex-col items-center gap-1.5"
				>
					<input type="hidden" name="dayPlanId" value={dayPlan.id} />
					<input type="hidden" name="personId" value={person.id} />
					<input type="hidden" name="isPresent" value={isPresent.toString()} />
					<button
						type="submit"
						class="relative flex h-11 w-11 items-center justify-center rounded-full text-[20px] transition-all duration-300 active:scale-90"
					>
						<!-- Animated ring for present state -->
						{#if isPresent}
							<span
								class="absolute inset-0 rounded-full"
								style="background: conic-gradient(from 0deg, var(--color-indigo-400), var(--color-indigo-500), var(--color-indigo-400)); padding: 2px;"
							>
								<span class="absolute inset-[2px] rounded-full bg-white dark:bg-slate-800"></span>
							</span>
							<span
								class="absolute inset-0 rounded-full"
								style="box-shadow: 0 0 16px var(--color-indigo-500), 0 0 32px var(--color-indigo-500);"
							>
							</span>
						{/if}
						<span
							class="relative z-10 transition-all duration-300 select-none
							{isPresent ? 'scale-105' : 'opacity-30 grayscale hover:opacity-60 hover:grayscale-0'}"
						>
							{person.emoji || '👤'}
						</span>
					</button>
					<span
						class="text-[9px] font-black tracking-[0.1em] uppercase transition-colors duration-300
						{isPresent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600'}"
					>
						{person.name}
					</span>
				</form>
			{/each}

			<!-- Guest toggle -->
			<div class="ml-auto flex flex-col items-center gap-1.5">
				<button
					type="button"
					onclick={() => (isEditingGuests = !isEditingGuests)}
					class="flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 active:scale-90
					{dayPlan.guests_note
						? 'border border-indigo-500/25 bg-indigo-500/15 text-indigo-600 shadow-[0_0_16px_rgba(108,92,231,0.2)] dark:text-indigo-400'
						: 'border border-slate-200 bg-slate-100/50 text-slate-400 hover:border-slate-300 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-500 dark:hover:border-white/10 dark:hover:text-white'}"
				>
					<Users size={17} />
				</button>
				<span
					class="text-[9px] font-black tracking-[0.1em] uppercase
					{dayPlan.guests_note
						? 'text-indigo-600 dark:text-indigo-400'
						: 'text-slate-400 dark:text-slate-600'}"
				>
					Gæster
				</span>
			</div>
		</div>

		<!-- Guest form -->
		{#if isEditingGuests || dayPlan.guests_note}
			<div class="transition-all duration-300">
				{#if isEditingGuests}
					<form
						method="POST"
						action="?/updateGuests"
						use:enhance={() => {
							return async ({ update }) => {
								isEditingGuests = false;
								await update();
							};
						}}
					>
						<input type="hidden" name="dayPlanId" value={dayPlan.id} />
						<div class="flex gap-2">
							<input
								type="text"
								name="guests_note"
								value={dayPlan.guests_note || ''}
								placeholder="Hvem spiser med? (fx 'Bedstefar')"
								class="flex-1 rounded-2xl border border-indigo-500/20 bg-slate-50 px-4 py-2.5 text-xs text-slate-800 transition-all outline-none placeholder:text-slate-400/30 hover:border-indigo-500/35 focus:border-indigo-500/35 focus:ring-2 focus:ring-indigo-500/20 dark:bg-white/[0.01] dark:text-slate-100"
							/>
							<button
								type="submit"
								class="rounded-2xl px-4 py-2.5 text-xs font-bold text-white transition-all active:scale-95"
								style="background: linear-gradient(135deg, var(--color-indigo-600), var(--color-indigo-500)); box-shadow: 0 4px 16px rgba(108,92,231,0.3);"
							>
								Gem
							</button>
						</div>
					</form>
				{:else}
					<button
						type="button"
						onclick={() => (isEditingGuests = true)}
						class="flex w-full items-center gap-2 rounded-2xl px-4 py-2.5 text-left text-xs font-bold text-indigo-700 transition-all hover:bg-indigo-500/10 dark:text-indigo-300"
						style="background: rgba(108,92,231,0.05); border: 1px solid rgba(108,92,231,0.15);"
					>
						<Users size={13} class="flex-shrink-0 text-indigo-500 dark:text-indigo-400" />
						<span class="mr-1 font-normal text-slate-500 dark:text-slate-400">Gæster:</span
						>{dayPlan.guests_note}
					</button>
				{/if}
			</div>
		{/if}
	</div>
</article>
