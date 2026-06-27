<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let showProfileModal = $state(false);
	let profileEmoji = $state('👤');

	$effect(() => {
		if (data.user?.emoji) {
			profileEmoji = data.user.emoji;
		}
	});

	const commonEmojis = [
		'👤',
		'👶',
		'👩',
		'👨',
		'👧',
		'👦',
		'🐶',
		'🐱',
		'📱',
		'💻',
		'🎧',
		'⌚',
		'🚗',
		'🏡',
		'🪑',
		'👕',
		'👗',
		'👟',
		'💍',
		'💄',
		'⚽',
		'🎮',
		'📚',
		'🎁',
		'🛠️',
		'✈️',
		'🥂',
		'🍔',
		'🍕',
		'💡',
		'🔥',
		'💰',
		'💳',
		'🛒',
		'🛍️',
		'🎀',
		'🎈',
		'🎉',
		'❤️',
		'⭐'
	];
</script>

<svelte:head>
	<title>Hostrup Hub</title>
</svelte:head>

<div
	class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 p-6 font-sans text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100"
>
	<!-- Aurora glows (subtly dimmed in light mode, fully vibrant in dark mode) -->
	<div class="pointer-events-none absolute inset-0 opacity-30 dark:opacity-100">
		<div
			class="absolute -top-40 -left-40 h-[600px] w-[600px] animate-[pulse_8s_ease-in-out_infinite] rounded-full bg-indigo-500/15 blur-[130px] dark:bg-indigo-500/10"
		></div>
		<div
			class="absolute top-1/2 -right-40 h-[500px] w-[500px] animate-[pulse_10s_ease-in-out_infinite_2s] rounded-full bg-rose-500/15 blur-[110px] dark:bg-rose-500/10"
		></div>
		<div
			class="absolute -bottom-20 left-1/3 h-[400px] w-[400px] animate-[pulse_12s_ease-in-out_infinite_4s] rounded-full bg-indigo-500/15 blur-[100px] dark:bg-indigo-500/10"
		></div>
	</div>

	<div class="relative z-10 flex w-full max-w-4xl flex-col items-center gap-10">
		<!-- Logo / Brand -->
		<div class="text-center">
			<div
				class="mb-5 inline-flex h-20 w-20 items-center justify-center rounded-3xl border border-slate-200/50 bg-white/80 text-5xl shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
			>
				🏠
			</div>
			<h1
				class="bg-gradient-to-r from-indigo-600 to-rose-500 bg-clip-text text-5xl font-black tracking-tight text-transparent md:text-7xl dark:from-indigo-400 dark:to-rose-300"
			>
				Hostrup Hub
			</h1>
			<p class="mt-3 text-base font-medium text-slate-500 md:text-lg dark:text-slate-400">
				Husholdningens kommandocentral
			</p>
		</div>

		<!-- Tiles (using central glassmorphism and theme styling) -->
		<div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
			<a
				href="/dashboard/wishes"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-rose-500/50 dark:border-white/10 dark:bg-slate-800/80"
			>
				<span class="relative text-5xl">🎁</span>
				<h2 class="relative text-xl font-bold text-slate-800 dark:text-white">Ønsker</h2>
				<p
					class="relative text-center text-sm text-slate-500 transition-colors group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white"
				>
					Dine og familiens ønsker, stemmer og drømmekøb
				</p>
			</a>

			<a
				href="/dashboard/finance"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-indigo-500/50 dark:border-white/10 dark:bg-slate-800/80"
			>
				<span class="relative text-5xl">📊</span>
				<h2 class="relative text-xl font-bold text-slate-800 dark:text-white">Økonomi</h2>
				<p
					class="relative text-center text-sm text-slate-500 transition-colors group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white"
				>
					Forbrugsoverblik, grafer og AI-rådgivning
				</p>
			</a>

			<a
				href="/dashboard/import"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/50 dark:border-white/10 dark:bg-slate-800/80"
			>
				<span class="relative text-5xl">🏦</span>
				<h2 class="relative text-xl font-bold text-slate-800 dark:text-white">Bankimport</h2>
				<p
					class="relative text-center text-sm text-slate-500 transition-colors group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white"
				>
					Upload kontoudtog og kategorisér automatisk
				</p>
			</a>

			<a
				href="/dashboard/weekly"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-amber-500/50 dark:border-white/10 dark:bg-slate-800/80"
			>
				<span class="relative text-5xl">📅</span>
				<h2 class="relative text-xl font-bold text-slate-800 dark:text-white">Ugeplan</h2>
				<p
					class="relative text-center text-sm text-slate-500 transition-colors group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white"
				>
					Madplan, fremmøde og dagens noter for hele familien
				</p>
			</a>

			<a
				href="/dashboard/stocks"
				class="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-violet-500/50 dark:border-white/10 dark:bg-slate-800/80"
			>
				<span class="relative text-5xl">📈</span>
				<h2 class="relative text-xl font-bold text-slate-800 dark:text-white">Aktier</h2>
				<p
					class="relative text-center text-sm text-slate-500 transition-colors group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white"
				>
					Porteføljeoverblik, afkast og AI-analyse
				</p>
			</a>
		</div>

		<!-- Footer -->
		<div class="text-center text-sm text-slate-400 dark:text-slate-500">
			{#if data.user}
				Logget ind som
				<button
					onclick={() => {
						profileEmoji = data.user?.emoji || '👤';
						showProfileModal = true;
					}}
					class="inline-flex cursor-pointer items-center gap-1 font-bold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
					title="Klik for at redigere din profil"
				>
					<span>{data.user.emoji || '👤'}</span>
					<span class="underline decoration-dotted"
						>{data.user.displayName || data.user.username}</span
					>
					<span class="text-xs opacity-60">✎</span>
				</button>
			{/if}
		</div>
	</div>
</div>

{#if showProfileModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
	>
		<div
			class="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800"
		>
			<button
				onclick={() => (showProfileModal = false)}
				class="absolute top-4 right-4 text-xl font-bold text-slate-400 hover:text-slate-600 dark:text-slate-300"
				>✕</button
			>
			<h3 class="mb-6 text-xl font-bold text-slate-800 dark:text-white">Rediger Din Profil</h3>

			<form
				method="POST"
				action="?/updateProfile"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showProfileModal = false;
					};
				}}
				class="space-y-5"
			>
				<input type="hidden" name="emoji" value={profileEmoji} />

				<div>
					<label
						class="mb-2 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
						>Din Personlige Emoji</label
					>
					<div
						class="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/50"
					>
						{#each commonEmojis as emoji}
							<button
								type="button"
								onclick={() => (profileEmoji = emoji)}
								class="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-all hover:bg-slate-200 dark:hover:bg-slate-600 {profileEmoji ===
								emoji
									? 'bg-indigo-200 shadow-sm ring-2 ring-indigo-500'
									: ''}"
							>
								{emoji}
							</button>
						{/each}
					</div>
				</div>

				<div>
					<label
						for="displayName"
						class="mb-2 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
						>Dit Viste Navn</label
					>
					<input
						type="text"
						id="displayName"
						name="displayName"
						value={data.user?.displayName || data.user?.username || ''}
						required
						class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium transition-all outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900/50"
						placeholder="Fx Ronni Hostrup"
					/>
				</div>

				<div class="pt-2">
					<button
						type="submit"
						class="w-full rounded-xl bg-indigo-600 py-3.5 font-bold text-white shadow-md transition-all hover:bg-indigo-700 active:scale-[0.98]"
					>
						Gem Profil
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.6;
			transform: scale(1.05);
		}
	}
</style>
