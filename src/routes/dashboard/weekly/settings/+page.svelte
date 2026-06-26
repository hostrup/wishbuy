<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { User, Users, Trash2, Plus, ArrowLeft, Pencil, X } from '@lucide/svelte';

	let { data } = $props<{ data: PageData }>();

	// Holder styr på hvilken person der redigeres inline
	let editingPersonId = $state<string | null>(null);
</script>

<div
	class="relative min-h-screen bg-slate-50 p-4 font-sans text-slate-900 md:p-8 lg:p-12 dark:bg-slate-950 dark:text-slate-100"
>
	<!-- Ambient Background Glows -->
	<div
		class="pointer-events-none absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-600/10"
	></div>
	<div
		class="pointer-events-none absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-rose-500/10 blur-3xl dark:bg-rose-500/10"
	></div>

	<div class="relative z-10 mx-auto max-w-3xl space-y-8 pb-24">
		<!-- Tilbage link -->
		<div class="flex items-center">
			<a
				href="/dashboard/weekly"
				class="flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400"
			>
				<ArrowLeft size={16} />
				Tilbage til planen
			</a>
		</div>

		<!-- Min Profil -->
		<div
			class="rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
		>
			<div
				class="mb-5 flex items-center gap-2.5 border-b border-slate-200/50 pb-3 dark:border-white/5"
			>
				<User class="text-indigo-500 dark:text-indigo-400" size={20} />
				<h2 class="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Min Profil</h2>
			</div>

			<form method="POST" action="?/updateUser" use:enhance class="space-y-5">
				<div class="grid grid-cols-[auto_1fr] gap-4">
					<div>
						<label
							class="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
							for="emoji">Emoji</label
						>
						<input
							type="text"
							id="emoji"
							name="emoji"
							value={data.user?.emoji}
							class="w-16 rounded-2xl border border-slate-200 bg-white p-3 text-center text-2xl text-slate-900 transition-all outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500"
						/>
					</div>
					<div>
						<label
							class="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
							for="displayName">Visningsnavn</label
						>
						<input
							type="text"
							id="displayName"
							name="displayName"
							value={data.user?.displayName}
							class="w-full rounded-2xl border border-slate-200 bg-white p-3 text-base text-slate-900 transition-all outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500"
						/>
					</div>
				</div>
				<div class="text-xs font-medium text-slate-400">
					Login ID: {data.user?.username}
				</div>
				<button
					type="submit"
					class="w-full cursor-pointer rounded-2xl bg-indigo-600 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-indigo-500 active:scale-98"
				>
					Gem Profil
				</button>
			</form>
		</div>

		<!-- Husstanden -->
		<div
			class="rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
		>
			<div
				class="mb-5 flex items-center gap-2.5 border-b border-slate-200/50 pb-3 dark:border-white/5"
			>
				<Users class="text-indigo-500 dark:text-indigo-400" size={20} />
				<h2 class="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Husstanden</h2>
			</div>

			<div class="mb-8 space-y-3">
				{#each data.allPersons as person}
					<div
						class="overflow-hidden rounded-2xl border border-slate-200/50 bg-white/50 transition-all hover:bg-white/80 dark:border-white/5 dark:bg-slate-900/30 dark:hover:bg-slate-900/50"
					>
						{#if editingPersonId === person.id}
							<!-- Inline redigering af person -->
							<form
								method="POST"
								action="?/updatePerson"
								use:enhance={() => {
									return async ({ update }) => {
										editingPersonId = null;
										await update();
									};
								}}
								class="space-y-4 p-4"
							>
								<input type="hidden" name="id" value={person.id} />
								<div class="grid grid-cols-[auto_1fr] gap-4">
									<div>
										<label
											class="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
											for="edit_emoji_{person.id}">Emoji</label
										>
										<input
											type="text"
											id="edit_emoji_{person.id}"
											name="emoji"
											value={person.emoji || '👤'}
											class="w-16 rounded-2xl border border-slate-200 bg-white p-3 text-center text-2xl text-slate-900 transition-all outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500"
										/>
									</div>
									<div>
										<label
											class="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
											for="edit_name_{person.id}">Navn</label
										>
										<input
											type="text"
											id="edit_name_{person.id}"
											name="name"
											value={person.name}
											required
											class="w-full rounded-2xl border border-slate-200 bg-white p-3 text-base text-slate-900 transition-all outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500"
										/>
									</div>
								</div>
								<div>
									<label
										class="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
										for="edit_presence_{person.id}">Standard Dage (1=Man, 7=Søn)</label
									>
									<input
										type="text"
										id="edit_presence_{person.id}"
										name="defaultPresence"
										value={person.default_presence_days}
										class="w-full rounded-2xl border border-slate-200 bg-white p-3 text-base text-slate-900 transition-all outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500"
									/>
								</div>
								<div class="flex gap-3">
									<button
										type="submit"
										class="flex-1 cursor-pointer rounded-2xl bg-indigo-600 py-3 font-bold text-white shadow-lg transition-all hover:bg-indigo-500 active:scale-98"
									>
										Gem ændringer
									</button>
									<button
										type="button"
										onclick={() => (editingPersonId = null)}
										class="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
									>
										<X size={16} />
									</button>
								</div>
							</form>
						{:else}
							<!-- Vis-mode for person -->
							<div class="flex items-center justify-between p-4">
								<div class="flex items-center gap-3.5">
									<div
										class="rounded-xl border border-slate-200 bg-white p-2 text-3xl dark:border-white/10 dark:bg-slate-800"
									>
										{person.emoji}
									</div>
									<div>
										<div class="text-base font-bold text-slate-800 dark:text-white">
											{person.name}
										</div>
										<div class="text-xs font-semibold text-slate-400">
											Standarddage: <span class="font-bold text-indigo-600 dark:text-indigo-400"
												>{person.default_presence_days || 'Ingen'}</span
											>
										</div>
									</div>
								</div>
								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={() => (editingPersonId = person.id)}
										class="cursor-pointer rounded-xl border border-indigo-200/50 bg-indigo-50/50 p-2.5 text-indigo-600 transition-all hover:bg-indigo-100/50 active:scale-95 dark:border-indigo-900/30 dark:bg-indigo-950/10 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
										title="Rediger person"
									>
										<Pencil size={16} />
									</button>
									<form
										method="POST"
										action="?/deletePerson"
										use:enhance={({ cancel }) => {
											if (
												!confirm(`Slet ${person.name}? Dette fjerner personen fra alle dagplaner.`)
											) {
												cancel();
												return;
											}
											return async ({ update }) => {
												await update();
											};
										}}
									>
										<input type="hidden" name="id" value={person.id} />
										<button
											class="cursor-pointer rounded-xl border border-red-200/50 bg-red-50/50 p-2.5 text-red-600 transition-all hover:bg-red-100/50 active:scale-95 dark:border-red-900/30 dark:bg-red-950/10 dark:text-red-400 dark:hover:bg-red-900/20"
											title="Slet person"
										>
											<Trash2 size={16} />
										</button>
									</form>
								</div>
							</div>
						{/if}
					</div>
				{/each}
				{#if data.allPersons.length === 0}
					<p class="py-6 text-center text-sm text-slate-400">Ingen personer tilføjet endnu.</p>
				{/if}
			</div>

			<div class="border-t border-slate-200/50 pt-6 dark:border-white/5">
				<h3
					class="mb-4 text-sm font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400"
				>
					Tilføj familiemedlem
				</h3>
				<form method="POST" action="?/addPerson" use:enhance class="space-y-5">
					<div class="grid grid-cols-[auto_1fr] gap-4">
						<div>
							<label
								class="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
								for="new_emoji">Emoji</label
							>
							<input
								type="text"
								id="new_emoji"
								name="emoji"
								value="👤"
								class="w-16 rounded-2xl border border-slate-200 bg-white p-3 text-center text-2xl text-slate-900 transition-all outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500"
							/>
						</div>
						<div>
							<label
								class="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
								for="new_name">Navn</label
							>
							<input
								type="text"
								id="new_name"
								name="name"
								placeholder="F.eks. Emil"
								required
								class="w-full rounded-2xl border border-slate-200 bg-white p-3 text-base text-slate-900 transition-all outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500"
							/>
						</div>
					</div>
					<div>
						<label
							class="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
							for="defaultPresence">Standard Dage (1=Man, 7=Søn)</label
						>
						<input
							type="text"
							id="defaultPresence"
							name="defaultPresence"
							value="1,2,3,4,5,6,7"
							class="w-full rounded-2xl border border-slate-200 bg-white p-3 text-base text-slate-900 transition-all outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500"
						/>
					</div>
					<button
						type="submit"
						class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-3.5 font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
					>
						<Plus size={16} />
						Tilføj Person
					</button>
				</form>
			</div>
		</div>
	</div>
</div>
