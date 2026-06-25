<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let showProfileModal = $state(false);
	let profileEmoji = $state(data.user?.emoji || '👤');

	let showCategoryModal = $state(false);
	let isCreatingCat = $state(false);
	let editCatId = $state<number | null>(null);
	let editCatName = $state('');
	let editCatIcon = $state('📦');

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

	const formatCur = (val: number) =>
		new Intl.NumberFormat('da-DK', {
			style: 'currency',
			currency: 'DKK',
			maximumFractionDigits: 0
		}).format(val);
	const formatDate = (date: Date) =>
		new Intl.DateTimeFormat('da-DK', { day: '2-digit', month: 'short', year: 'numeric' }).format(
			new Date(date)
		);

	let sharedPct = $derived(
		data.kpis?.wishTotal ? (data.kpis.wishShared / data.kpis.wishTotal) * 100 : 0
	);
	let buySharedPct = $derived(
		data.kpis?.buyTotal ? (data.kpis.buyShared / data.kpis.buyTotal) * 100 : 0
	);
	let grandTotal = $derived((data.kpis?.wishTotal || 0) + (data.kpis?.buyTotal || 0));
	let wishVsBuyPct = $derived(grandTotal ? ((data.kpis?.wishTotal || 0) / grandTotal) * 100 : 0);

	let newDesireLevel = $state(3);
	const desireLabels = [
		'⭐ Kunne være meget sjovt (Impuls)',
		'⭐⭐ Lidt spændende',
		'⭐⭐⭐ Ret lækkert at have (Vil forbedre hverdagen)',
		'⭐⭐⭐⭐ Rigtig meget (Tænker tit på det)',
		'⭐⭐⭐⭐⭐ Kan ikke sove om natten (Livsnødvendigt)'
	];

	let highestSharedPrice = $derived(
		data.wishes
			.filter((w) => w.expenseType === 'SHARED')
			.reduce((max, w) => Math.max(max, w.price), 0)
	);
	let now = $state(Date.now());

	$effect(() => {
		const interval = setInterval(() => {
			now = Date.now();
		}, 60000); // update every minute
		return () => clearInterval(interval);
	});

	function openCategoryEdit(cat: any) {
		editCatId = cat.id;
		editCatName = cat.name;
		editCatIcon = cat.icon || '📦';
		isCreatingCat = false;
	}

	function openCategoryCreate() {
		editCatId = null;
		editCatName = '';
		editCatIcon = '📦';
		isCreatingCat = true;
	}
</script>

{#if showCategoryModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
	>
		<div
			class="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800"
		>
			<button
				onclick={() => {
					showCategoryModal = false;
					editCatId = null;
					isCreatingCat = false;
				}}
				class="absolute top-4 right-4 z-10 text-xl font-bold text-slate-400 hover:text-slate-600 dark:text-slate-300"
				>✕</button
			>
			<h3 class="mb-6 text-xl font-bold text-slate-800 dark:text-white">
				{#if isCreatingCat}Opret Ny Kategori{:else if editCatId}Rediger Kategori{:else}Kategorier{/if}
			</h3>

			{#if form?.error && showCategoryModal}
				<div class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
					{form.error}
				</div>
			{/if}

			{#if editCatId === null && !isCreatingCat}
				<div class="mb-4 flex-1 space-y-2 overflow-y-auto pr-2">
					{#each data.categories as cat}
						<button
							onclick={() => openCategoryEdit(cat)}
							class="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:bg-indigo-50 dark:border-white/10 dark:bg-slate-900/50"
						>
							<span class="font-medium text-slate-700 dark:text-slate-200"
								>{cat.icon} {cat.name}</span
							>
							<span
								class="text-xs font-bold text-indigo-500 opacity-0 transition-opacity group-hover:opacity-100"
								>Rediger</span
							>
						</button>
					{/each}
				</div>
				<button
					onclick={openCategoryCreate}
					class="w-full rounded-xl border border-slate-200 bg-slate-100 py-3 font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:border-white/10 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
				>
					+ Opret Ny Kategori
				</button>
			{:else if isCreatingCat}
				<form
					id="createCatForm"
					method="POST"
					action="?/createCategory"
					use:enhance={() => {
						return async ({ update, result }) => {
							await update();
							if (result.type === 'success' || result.type === 'redirect') isCreatingCat = false;
						};
					}}
					class="space-y-5"
				>
					<input type="hidden" name="icon" value={editCatIcon} />

					<div>
						<label
							class="mb-2 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
							>Vælg Kategori Ikon</label
						>
						<div
							class="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/50"
						>
							{#each commonEmojis as emoji}
								<button
									type="button"
									onclick={() => (editCatIcon = emoji)}
									class="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-all hover:bg-slate-200 dark:hover:bg-slate-600 {editCatIcon ===
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
							for="name"
							class="mb-2 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
							>Kategorinavn</label
						>
						<input
							type="text"
							id="name"
							name="name"
							bind:value={editCatName}
							required
							class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium transition-all outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900/50"
						/>
					</div>
				</form>
				<div class="mt-5 flex gap-3 pt-2">
					<button
						type="button"
						onclick={() => (isCreatingCat = false)}
						class="flex-1 rounded-xl bg-slate-100 py-3.5 font-bold text-slate-600 transition-all hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
						>Annuller</button
					>
					<button
						type="submit"
						form="createCatForm"
						class="flex-1 rounded-xl bg-indigo-600 py-3.5 font-bold text-white shadow-md transition-all hover:bg-indigo-700"
						>Opret</button
					>
				</div>
			{:else}
				<form
					id="updateCatForm"
					method="POST"
					action="?/updateCategory"
					use:enhance={() => {
						return async ({ update, result }) => {
							await update();
							if (result.type === 'success' || result.type === 'redirect') editCatId = null;
						};
					}}
					class="space-y-5"
				>
					<input type="hidden" name="categoryId" value={editCatId} />
					<input type="hidden" name="icon" value={editCatIcon} />

					<div>
						<label
							class="mb-2 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
							>Vælg Kategori Ikon</label
						>
						<div
							class="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/50"
						>
							{#each commonEmojis as emoji}
								<button
									type="button"
									onclick={() => (editCatIcon = emoji)}
									class="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-all hover:bg-slate-200 dark:hover:bg-slate-600 {editCatIcon ===
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
							for="name"
							class="mb-2 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
							>Kategorinavn</label
						>
						<input
							type="text"
							id="name"
							name="name"
							bind:value={editCatName}
							required
							class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium transition-all outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900/50"
						/>
					</div>
				</form>

				<form
					id="deleteCatForm"
					method="POST"
					action="?/deleteCategory"
					use:enhance={() => {
						return async ({ update, result }) => {
							await update();
							if (result.type === 'success' || result.type === 'redirect') editCatId = null;
						};
					}}
					onsubmit={(e) => {
						if (!confirm('Er du sikker på, at du vil slette denne kategori?')) e.preventDefault();
					}}
				>
					<input type="hidden" name="categoryId" value={editCatId} />
				</form>

				<div class="mt-5 flex gap-2 pt-2">
					<button
						type="button"
						onclick={() => (editCatId = null)}
						class="flex-1 rounded-xl bg-slate-100 py-3.5 font-bold text-slate-600 transition-all hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
						>Annuller</button
					>
					<button
						type="submit"
						form="deleteCatForm"
						class="flex-none rounded-xl bg-red-100 px-4 py-3.5 font-bold text-red-600 transition-all hover:bg-red-200"
						>Slet</button
					>
					<button
						type="submit"
						form="updateCatForm"
						class="flex-1 rounded-xl bg-indigo-600 py-3.5 font-bold text-white shadow-md transition-all hover:bg-indigo-700"
						>Gem</button
					>
				</div>
			{/if}
		</div>
	</div>
{/if}

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

<div
	class="min-h-screen bg-slate-50 p-4 font-sans text-slate-900 transition-colors duration-300 md:p-12 dark:bg-slate-900 dark:text-slate-100"
>
	<div class="mx-auto max-w-7xl space-y-6 md:space-y-8">
		<header
			class="flex flex-col border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between md:pb-6 dark:border-white/10"
		>
			<div>
				<h1
					class="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl"
				>
					Ønskebrønden
				</h1>
				{#if data.user}
					<div class="mt-2 flex items-center gap-3 text-sm md:text-base">
						<button
							onclick={() => {
								profileEmoji = data.user?.emoji || '👤';
								showProfileModal = true;
							}}
							class="flex items-center gap-2 rounded-xl border border-indigo-100/30 bg-indigo-500/10 px-3.5 py-2.0 font-bold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-100/50 hover:text-indigo-800 active:scale-95 dark:border-indigo-500/20 dark:bg-indigo-500/15 dark:text-indigo-400 dark:hover:bg-indigo-500/30"
						>
							<span class="text-lg">{data.user.emoji || '👤'}</span>
							<span>Rediger Profil</span>
							<span class="ml-1 text-[10px] opacity-60">✎</span>
						</button>
					</div>
				{/if}
			</div>
		</header>

		{#if data.kpis}
			<section
				class="flex snap-x snap-mandatory gap-4 overflow-x-auto pt-1 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-5 [&::-webkit-scrollbar]:hidden"
			>
				<div
					class="flex w-[85vw] flex-shrink-0 snap-center flex-col justify-center rounded-2xl border border-indigo-100/50 bg-white/80 backdrop-blur-xl bg-gradient-to-br from-white/80 to-indigo-50/30 p-5 shadow-sm md:w-auto md:p-6 dark:border-indigo-500/20 dark:bg-slate-800/80"
				>
					<p class="mb-1 text-[10px] font-bold tracking-widest text-indigo-400 uppercase">
						Værdi af Drømme
					</p>
					<p class="text-3xl font-black text-indigo-900">{formatCur(data.kpis.wishTotal)}</p>
					<p class="mt-1 text-xs font-medium text-indigo-600/70">
						Udsat behov i {data.kpis.wishCount} ønsker
					</p>
				</div>

				<a
					href="/dashboard/finance"
					class="group relative flex w-[85vw] flex-shrink-0 cursor-pointer snap-center flex-col justify-center overflow-hidden rounded-2xl border border-slate-200/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition-colors hover:bg-white/90 md:w-auto md:p-6 dark:border-white/10 dark:bg-slate-800/80 dark:hover:bg-slate-700/80"
				>
					<div
						class="absolute top-3 right-3 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100"
					>
						↗
					</div>
					<p class="mb-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
						Forbrug denne måned
					</p>
					<p class="text-3xl font-black text-slate-800 dark:text-white">
						{formatCur(data.kpis.currentMonthExpenses || 0)}
					</p>
					<p
						class="mt-1 max-w-[150px] truncate text-xs font-medium text-slate-500 dark:text-slate-400"
					>
						Største post: {data.kpis.topCategoryName || 'Ingen'}
					</p>
				</a>

				<div
					class="flex w-[85vw] flex-shrink-0 snap-center items-center gap-4 rounded-2xl border border-slate-200/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl md:w-auto md:p-6 dark:border-white/10 dark:bg-slate-800/80"
				>
					<div
						class="h-14 w-14 shrink-0 rounded-full shadow-inner"
						style="background: conic-gradient(var(--color-indigo-500) 0% {wishVsBuyPct}%, var(--color-slate-300) {wishVsBuyPct}% 100%);"
					></div>
					<div class="flex flex-col justify-center">
						<p class="mb-1.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
							Økonomisk Tyngde
						</p>
						<div
							class="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300"
						>
							<span class="h-2 w-2 rounded-full bg-indigo-500"></span> Drømme ({Math.round(
								wishVsBuyPct
							)}%)
						</div>
						<div
							class="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300"
						>
							<span class="h-2 w-2 rounded-full bg-slate-300"></span> Købt ({100 -
								Math.round(wishVsBuyPct)}%)
						</div>
					</div>
				</div>

				<div
					class="flex w-[85vw] flex-shrink-0 snap-center items-center gap-4 rounded-2xl border border-slate-200/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl md:w-auto md:p-6 dark:border-white/10 dark:bg-slate-800/80"
				>
					<div
						class="h-14 w-14 shrink-0 rounded-full shadow-inner"
						style="background: conic-gradient(var(--color-violet-500) 0% {sharedPct}%, var(--color-rose-500) {sharedPct}% 100%);"
					></div>
					<div class="flex flex-col justify-center">
						<p class="mb-1.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
							Drømme-fordeling
						</p>
						<div
							class="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300"
						>
							<span class="h-2 w-2 rounded-full bg-violet-500"></span> Fælles ({Math.round(
								sharedPct
							)}%)
						</div>
						<div
							class="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300"
						>
							<span class="h-2 w-2 rounded-full bg-rose-500"></span> Ego ({100 -
								Math.round(sharedPct)}%)
						</div>
					</div>
				</div>

				<div
					class="flex w-[85vw] flex-shrink-0 snap-center items-center gap-4 rounded-2xl border border-slate-200/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl md:w-auto md:p-6 dark:border-white/10 dark:bg-slate-800/80"
				>
					<div
						class="h-14 w-14 shrink-0 rounded-full shadow-inner"
						style="background: conic-gradient(var(--color-emerald-500) 0% {buySharedPct}%, var(--color-rose-500) {buySharedPct}% 100%);"
					></div>
					<div class="flex flex-col justify-center">
						<p class="mb-1.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
							Forbrugs-fordeling
						</p>
						<div
							class="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300"
						>
							<span class="h-2 w-2 rounded-full bg-emerald-500"></span> Fælles ({Math.round(
								buySharedPct
							)}%)
						</div>
						<div
							class="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300"
						>
							<span class="h-2 w-2 rounded-full bg-rose-500"></span> Ego ({100 -
								Math.round(buySharedPct)}%)
						</div>
					</div>
				</div>

				<div
					class="flex w-[85vw] flex-shrink-0 snap-center flex-col justify-between rounded-2xl border border-slate-200/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl md:w-auto md:p-6 dark:border-white/10 dark:bg-slate-800/80"
				>
					<div class="mb-2 md:mb-0">
						<p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
							Største Drømmer
						</p>
						<p class="text-sm font-bold text-slate-800 dark:text-white">
							{data.kpis.topDreamer.name}
							<span class="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400"
								>({formatCur(data.kpis.topDreamer.amount)})</span
							>
						</p>
					</div>
					<div>
						<p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
							Største Forbruger
						</p>
						<p class="text-sm font-bold text-slate-800 dark:text-white">
							{data.kpis.topSpender.name}
							<span class="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400"
								>({formatCur(data.kpis.topSpender.amount)})</span
							>
						</p>
					</div>
				</div>

				{#if data.kpis.cooldownGain !== undefined}
					<div
						class="relative flex w-[85vw] flex-shrink-0 snap-center flex-col justify-center overflow-hidden rounded-2xl border border-emerald-100/50 bg-white/80 bg-gradient-to-br from-white/80 to-emerald-50/30 p-5 shadow-sm backdrop-blur-xl md:w-auto md:p-6 dark:border-emerald-500/20 dark:bg-slate-800/80"
					>
						<div class="absolute -right-4 -bottom-4 rotate-12 text-7xl text-emerald-500/10">🥶</div>
						<p class="mb-1 text-[10px] font-bold tracking-widest text-emerald-500 uppercase">
							Afkølings-gevinst
						</p>
						<p class="text-3xl font-black text-emerald-600">{formatCur(data.kpis.cooldownGain)}</p>
						<p class="relative z-10 mt-1 text-xs font-medium text-emerald-600/70">
							Sparet ved at "sove på det"
						</p>
					</div>
				{/if}
			</section>
		{/if}

		<main class="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-3">
			<section class="order-first xl:col-span-1">
				<div
					class="sticky top-4 z-10 rounded-3xl border border-slate-200/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl md:top-6 md:p-6 dark:border-white/10 dark:bg-slate-800/80"
				>
					<h2 class="mb-4 border-b border-slate-100 pb-2 text-lg font-bold dark:border-white/5">
						Kast i Brønden
					</h2>

					{#if form?.error && !showCategoryModal}
						<div class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
							{form.error}
						</div>
					{/if}

					<form method="POST" action="?/createItem" use:enhance class="space-y-4">
						<div>
							<label
								for="title"
								class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
								>Hvad drømmer du om?</label
							>
							<input
								type="text"
								id="title"
								name="title"
								required
								class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-base font-medium transition-all outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-800 dark:bg-slate-900/50 dark:focus:bg-slate-900"
							/>
						</div>

						<div>
							<label
								for="url"
								class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
								>Link (valgfrit)</label
							>
							<input
								type="url"
								id="url"
								name="url"
								class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition-all outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-800 dark:bg-slate-900/50 dark:focus:bg-slate-900"
								placeholder="https://..."
							/>
						</div>

						<div>
							<label
								for="price"
								class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
								>Pris (DKK)</label
							>
							<input
								type="number"
								step="0.01"
								id="price"
								name="price"
								required
								class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-lg font-bold transition-all outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-800 dark:bg-slate-900/50 dark:focus:bg-slate-900"
								placeholder="0"
							/>
						</div>

						<div class="grid grid-cols-2 gap-3">
							<div>
								<div class="mb-1 flex items-center justify-between">
									<label
										for="categoryId"
										class="block text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
										>Kategori</label
									>
									<button
										type="button"
										onclick={() => {
											showCategoryModal = true;
											editCatId = null;
											isCreatingCat = false;
										}}
										class="rounded px-1 text-[10px] font-bold text-indigo-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
										>✎ Ret</button
									>
								</div>
								<select
									id="categoryId"
									name="categoryId"
									required
									class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900/50"
								>
									{#each data.categories as category}
										<option value={category.id}>{category.icon} {category.name}</option>
									{/each}
								</select>
							</div>
							<div>
								<label
									for="expenseType"
									class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
									>Hvem?</label
								>
								<select
									id="expenseType"
									name="expenseType"
									required
									class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900/50"
								>
									<option value="SHARED">Fælles</option>
									<option value="PERSONAL">Ego</option>
								</select>
							</div>
						</div>

						<div
							class="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/50"
						>
							<input type="hidden" name="desireLevel" value={newDesireLevel} />
							<label
								class="mb-2 block text-center text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
								>Behovsgrad</label
							>
							<div class="flex justify-center gap-2">
								{#each [1, 2, 3, 4, 5] as level}
									<button
										type="button"
										onclick={() => (newDesireLevel = level)}
										class="text-2xl transition-all hover:scale-110 active:scale-95 {newDesireLevel >=
										level
											? 'scale-110 drop-shadow-sm'
											: 'opacity-20 grayscale hover:opacity-50'}"
										title={desireLabels[level - 1].replace(/⭐/g, '').trim()}>⭐</button
									>
								{/each}
							</div>
							<p
								class="mt-2 h-4 text-center text-[10px] font-medium text-slate-500 dark:text-slate-400"
							>
								{desireLabels[newDesireLevel - 1]}
							</p>
						</div>

						<div class="flex flex-col gap-2 pt-2">
							<button
								type="submit"
								name="targetStatus"
								value="WISH"
								class="w-full rounded-xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98]"
							>
								✨ Gem i Brønden
							</button>
							<button
								type="submit"
								name="targetStatus"
								value="PURCHASED"
								class="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-emerald-100 hover:text-emerald-700 active:scale-[0.98] dark:bg-slate-700 dark:text-slate-300"
							>
								💸 Registrer direkte som købt
							</button>
						</div>
					</form>
				</div>
			</section>

			<section class="order-last space-y-8 md:space-y-10 xl:col-span-2">
				<div>
					<h2 class="mb-4 flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
						✨ I Brønden <span
							class="rounded-full bg-indigo-100 px-2 py-0.5 text-sm font-medium text-indigo-700"
							>{data.wishes.length}</span
						>
					</h2>

					{#if data.wishes.length === 0}
						<div
							class="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-white/10 dark:bg-slate-800 dark:text-slate-400"
						>
							Brønden er tom.
						</div>
					{/if}

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{#each data.wishes as item}
							{@const itemDaysOld = (now - new Date(item.createdAt).getTime()) / (1000 * 3600 * 24)}
							{@const isLocked = item.price >= 1000 && itemDaysOld < 7}
							{@const daysLeft = Math.ceil(7 - itemDaysOld)}

							<div
								class="group relative flex flex-col rounded-3xl border border-slate-200/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition-colors hover:border-indigo-500/50 dark:border-white/10 dark:bg-slate-800/80"
							>
								<div
									class="absolute -top-3 -right-3 z-10 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
								>
									<form
										method="POST"
										action="?/deleteItem"
										use:enhance
										onsubmit={(e) => {
											if (!confirm('Er du sikker på, at du vil slette dette ønske permanent?'))
												e.preventDefault();
										}}
									>
										<input type="hidden" name="itemId" value={item.id} />
										<button
											class="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-red-100 text-xs text-red-600 shadow-md transition-colors hover:bg-red-500 hover:text-white"
											title="Slet">✕</button
										>
									</form>
								</div>

								<div class="mb-3 flex items-start justify-between">
									<div class="flex flex-col">
										<form method="POST" action="?/changeItemCategory" use:enhance class="mb-1">
											<input type="hidden" name="itemId" value={item.id} />
											<div class="group/cat relative inline-flex items-center">
												<select
													name="categoryId"
													onchange={(e) => e.currentTarget.form?.requestSubmit()}
													class="cursor-pointer appearance-none border-none bg-transparent p-0 pr-3.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase transition-colors outline-none group-hover/cat:text-indigo-500 focus:ring-0"
												>
													{#each data.categories as cat}
														<option value={cat.id} selected={cat.id === item.categoryId}>
															{cat.icon}
															{cat.name}
														</option>
													{/each}
												</select>
												<span
													class="pointer-events-none absolute right-0 text-[8px] text-slate-300 transition-colors group-hover/cat:text-indigo-400"
													>▼</span
												>
											</div>
										</form>

										<form
											method="POST"
											action="?/changeItemExpenseType"
											use:enhance
											class="group/expense inline-flex self-start"
										>
											<input type="hidden" name="itemId" value={item.id} />
											<div class="relative inline-flex items-center">
												<select
													name="expenseType"
													onchange={(e) => e.currentTarget.form?.requestSubmit()}
													class="cursor-pointer appearance-none rounded-md border-none px-2 py-0.5 pr-4 text-[10px] font-bold transition-colors outline-none focus:ring-0 {item.expenseType ===
													'SHARED'
														? 'bg-violet-100 text-violet-700'
														: 'bg-rose-100 text-rose-700'}"
												>
													<option value="SHARED" selected={item.expenseType === 'SHARED'}
														>FÆLLES</option
													>
													<option value="PERSONAL" selected={item.expenseType === 'PERSONAL'}
														>EGO</option
													>
												</select>
												<span
													class="pointer-events-none absolute right-1 text-[8px] {item.expenseType ===
													'SHARED'
														? 'text-violet-400'
														: 'text-rose-400'} opacity-50 group-hover/expense:opacity-100">▼</span
												>
											</div>
										</form>
									</div>

									<div class="flex gap-1 rounded-lg bg-slate-50 p-1 dark:bg-slate-900/50">
										<form method="POST" action="?/rateItem" use:enhance>
											<input type="hidden" name="itemId" value={item.id} />
											<button
												name="value"
												value="1"
												class="flex items-center gap-1 rounded px-2 py-1.5 text-slate-400 transition-all hover:bg-green-100 hover:text-green-600 active:scale-95 md:py-1"
											>
												👍 <span class="text-xs font-bold"
													>{item.ratings.filter((r) => r.value === 1).length}</span
												>
											</button>
										</form>
										<form method="POST" action="?/rateItem" use:enhance>
											<input type="hidden" name="itemId" value={item.id} />
											<button
												name="value"
												value="-1"
												class="flex items-center gap-1 rounded px-2 py-1.5 text-slate-400 transition-all hover:bg-red-100 hover:text-red-600 active:scale-95 md:py-1"
											>
												👎 <span class="text-xs font-bold"
													>{item.ratings.filter((r) => r.value === -1).length}</span
												>
											</button>
										</form>
									</div>
								</div>

								<h3
									class="pr-4 text-lg leading-tight font-bold text-slate-800 md:text-xl dark:text-white"
								>
									{item.title}
								</h3>

								<div class="mt-1.5 mb-1 flex gap-0.5">
									{#each Array(item.desireLevel || 3) as _}
										<span class="text-[10px] text-amber-400">⭐</span>
									{/each}
								</div>

								<div class="mt-1 mb-2 flex items-center justify-between">
									<div
										class="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400"
									>
										Af
										<form
											method="POST"
											action="?/changeItemUser"
											use:enhance
											class="group/user relative inline-block"
										>
											<input type="hidden" name="itemId" value={item.id} />
											<select
												name="userId"
												onchange={(e) => e.currentTarget.form?.requestSubmit()}
												class="cursor-pointer appearance-none rounded border-none bg-slate-100 px-1.5 py-0.5 pr-4 text-[11px] font-bold text-slate-600 transition-colors outline-none hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
											>
												{#each data.users as u}
													<option value={u.id} selected={u.id === item.userId}>
														{u.emoji || '👤'}
														{u.displayName || u.username}
													</option>
												{/each}
											</select>
											<span
												class="pointer-events-none absolute top-1 right-1 text-[8px] text-slate-400 group-hover/user:text-indigo-500"
												>▼</span
											>
										</form>
									</div>
									<p class="text-[10px] font-medium text-slate-400">
										Oprettet: {formatDate(item.createdAt)}
									</p>
								</div>

								<p class="mt-auto mb-4 text-2xl font-black text-indigo-900">
									{formatCur(item.price)}
								</p>

								<div class="mt-auto flex gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
									{#if item.url}
										<a
											href={item.url}
											target="_blank"
											rel="noopener noreferrer"
											class="flex-shrink-0 rounded-xl bg-slate-50 p-3 text-center text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 md:rounded-lg md:p-2 dark:bg-slate-900/50"
											>🔗</a
										>
									{/if}

									<form
										method="POST"
										action="?/toggleStatus"
										use:enhance
										onsubmit={(e) => {
											if (isLocked) {
												e.preventDefault();
												return;
											}
											if (item.expenseType === 'PERSONAL' && highestSharedPrice > 0) {
												const pct = Math.round((item.price / highestSharedPrice) * 100);
												if (pct >= 5) {
													const msg = `🛑 Reality Check!\nEr du sikker på dette ego-køb?\n\nFor de samme ${formatCur(item.price)} kunne I betale ${pct}% af jeres dyreste fælles ønske!\n\nVil du fortsætte?`;
													if (!confirm(msg)) {
														e.preventDefault();
													}
												}
											}
										}}
										class="flex flex-1"
									>
										<input type="hidden" name="itemId" value={item.id} />
										<button
											type={isLocked ? 'button' : 'submit'}
											class="w-full rounded-xl py-3 text-sm font-bold transition-all md:rounded-lg md:py-2 {isLocked
												? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-slate-700'
												: 'border border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white active:scale-[0.98]'}"
										>
											{#if isLocked}
												🔒 Låst i {daysLeft} {daysLeft === 1 ? 'dag' : 'dage'}
											{:else}
												✔ Realiser (Køb)
											{/if}
										</button>
									</form>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="opacity-90">
					<h2
						class="mb-4 flex items-center gap-2 text-lg font-bold text-slate-500 dark:text-slate-400"
					>
						💸 Realiseret (Købt) <span
							class="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300"
							>{data.purchases.length}</span
						>
					</h2>

					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{#each data.purchases as item}
							<div
								class="group relative flex flex-col rounded-2xl border border-slate-200 bg-slate-100 p-4 md:p-5 dark:border-white/10 dark:bg-slate-700/70"
							>
								<div
									class="absolute -top-2 -right-2 z-10 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
								>
									<form
										method="POST"
										action="?/deleteItem"
										use:enhance
										onsubmit={(e) => {
											if (!confirm('Slet denne post fra historikken?')) e.preventDefault();
										}}
									>
										<input type="hidden" name="itemId" value={item.id} />
										<button
											class="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] text-slate-400 shadow-sm transition-colors hover:bg-red-500 hover:text-white dark:border-white/10 dark:bg-slate-800"
											title="Slet">✕</button
										>
									</form>
								</div>

								<div class="mb-1.5 flex items-start justify-between">
									<div class="flex items-center gap-2">
										<form
											method="POST"
											action="?/changeItemExpenseType"
											use:enhance
											class="group/expense inline-flex"
										>
											<input type="hidden" name="itemId" value={item.id} />
											<div class="relative inline-flex items-center">
												<select
													name="expenseType"
													onchange={(e) => e.currentTarget.form?.requestSubmit()}
													class="cursor-pointer appearance-none rounded border border-slate-200 bg-white px-1.5 py-0.5 pr-3.5 text-[9px] font-bold text-slate-500 transition-colors outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-800 dark:text-slate-400"
												>
													<option value="SHARED" selected={item.expenseType === 'SHARED'}
														>FÆLLES</option
													>
													<option value="PERSONAL" selected={item.expenseType === 'PERSONAL'}
														>EGO</option
													>
												</select>
												<span
													class="pointer-events-none absolute right-1 text-[8px] text-slate-300 opacity-50 group-hover/expense:text-indigo-400 group-hover/expense:opacity-100"
													>▼</span
												>
											</div>
										</form>

										<form method="POST" action="?/changeItemCategory" use:enhance>
											<input type="hidden" name="itemId" value={item.id} />
											<div class="group/cat relative inline-flex items-center">
												<select
													name="categoryId"
													onchange={(e) => e.currentTarget.form?.requestSubmit()}
													class="cursor-pointer appearance-none border-none bg-transparent p-0 pr-3.5 text-[9px] font-bold tracking-widest text-slate-400 uppercase transition-colors outline-none group-hover/cat:text-indigo-500 focus:ring-0"
												>
													{#each data.categories as cat}
														<option value={cat.id} selected={cat.id === item.categoryId}>
															{cat.icon}
															{cat.name}
														</option>
													{/each}
												</select>
												<span
													class="pointer-events-none absolute right-0 text-[8px] text-slate-300 transition-colors group-hover/cat:text-indigo-400"
													>▼</span
												>
											</div>
										</form>
									</div>

									<p class="text-sm font-bold text-slate-400">{formatCur(item.price)}</p>
								</div>

								<h3
									class="pr-4 text-base font-semibold text-slate-500 line-through decoration-slate-400/50 dark:text-slate-400"
								>
									{item.title}
								</h3>

								<div class="mt-1 mb-2 flex items-center justify-between">
									<div class="flex items-center gap-1 text-[10px] font-medium text-slate-400">
										Af
										<form
											method="POST"
											action="?/changeItemUser"
											use:enhance
											class="group/user relative inline-block"
										>
											<input type="hidden" name="itemId" value={item.id} />
											<select
												name="userId"
												onchange={(e) => e.currentTarget.form?.requestSubmit()}
												class="cursor-pointer appearance-none rounded border border-slate-200 bg-white px-1.5 py-0.5 pr-4 text-[10px] font-bold text-slate-600 transition-colors outline-none hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-700/50"
											>
												{#each data.users as u}
													<option value={u.id} selected={u.id === item.userId}>
														{u.emoji || '👤'}
														{u.displayName || u.username}
													</option>
												{/each}
											</select>
											<span
												class="pointer-events-none absolute top-1 right-1 text-[8px] text-slate-400 group-hover/user:text-indigo-500"
												>▼</span
											>
										</form>
									</div>
									<p class="text-[10px] font-medium text-slate-400">
										Købt: {item.purchasedAt
											? formatDate(item.purchasedAt)
											: formatDate(item.createdAt)}
									</p>
								</div>

								<form method="POST" action="?/toggleStatus" use:enhance class="mt-4">
									<input type="hidden" name="itemId" value={item.id} />
									<button
										class="py-1 text-[11px] font-bold text-indigo-500 underline decoration-indigo-200 underline-offset-2 transition-colors hover:text-indigo-700 active:opacity-70"
									>
										Fortryd køb (Send til brønd)
									</button>
								</form>
							</div>
						{/each}
					</div>
				</div>
			</section>
		</main>
	</div>
</div>
