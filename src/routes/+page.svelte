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

	const commonEmojis = ['👤','👶','👩','👨','👧','👦','🐶','🐱','📱','💻','🎧','⌚','🚗','🏡','🪑','👕','👗','👟','💍','💄','⚽','🎮','📚','🎁','🛠️','✈️','🥂','🍔','🍕','💡','🔥','💰','💳','🛒','🛍️','🎀','🎈','🎉','❤️','⭐'];

	const formatCur = (val: number) => new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(val);
	const formatDate = (date: Date) => new Intl.DateTimeFormat('da-DK', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));

	let sharedPct = $derived(data.kpis?.wishTotal ? (data.kpis.wishShared / data.kpis.wishTotal) * 100 : 0);
	let buySharedPct = $derived(data.kpis?.buyTotal ? (data.kpis.buyShared / data.kpis.buyTotal) * 100 : 0);
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

	let highestSharedPrice = $derived(data.wishes.filter(w => w.expenseType === 'SHARED').reduce((max, w) => Math.max(max, w.price), 0));
	let now = $state(Date.now());

	$effect(() => {
		const interval = setInterval(() => { now = Date.now(); }, 60000); // update every minute
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
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
		<div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 overflow-hidden relative max-h-[90vh] flex flex-col">
			<button onclick={() => {showCategoryModal = false; editCatId = null; isCreatingCat = false;}} class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold z-10">✕</button>
			<h3 class="text-xl font-bold text-slate-800 mb-6">
				{#if isCreatingCat}Opret Ny Kategori{:else if editCatId}Rediger Kategori{:else}Kategorier{/if}
			</h3>
			
			{#if form?.error && showCategoryModal}
				<div class="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{form.error}</div>
			{/if}

			{#if editCatId === null && !isCreatingCat}
				<div class="flex-1 overflow-y-auto space-y-2 pr-2 mb-4">
					{#each data.categories as cat}
						<button onclick={() => openCategoryEdit(cat)} class="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-colors text-left group">
							<span class="font-medium text-slate-700">{cat.icon} {cat.name}</span>
							<span class="text-xs font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">Rediger</span>
						</button>
					{/each}
				</div>
				<button onclick={openCategoryCreate} class="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors border border-slate-200">
					+ Opret Ny Kategori
				</button>
			{:else if isCreatingCat}
				<form id="createCatForm" method="POST" action="?/createCategory" use:enhance={() => {
					return async ({ update, result }) => {
						await update();
						if (result.type === 'success' || result.type === 'redirect') isCreatingCat = false;
					};
				}} class="space-y-5">
					<input type="hidden" name="icon" value={editCatIcon} />
					
					<div>
						<label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vælg Kategori Ikon</label>
						<div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
							{#each commonEmojis as emoji}
								<button type="button" onclick={() => editCatIcon = emoji} class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-lg transition-all {editCatIcon === emoji ? 'bg-indigo-200 ring-2 ring-indigo-500 shadow-sm' : ''}">
									{emoji}
								</button>
							{/each}
						</div>
					</div>

					<div>
						<label for="name" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kategorinavn</label>
						<input type="text" id="name" name="name" bind:value={editCatName} required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all">
					</div>
				</form>
				<div class="pt-2 flex gap-3 mt-5">
					<button type="button" onclick={() => isCreatingCat = false} class="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Annuller</button>
					<button type="submit" form="createCatForm" class="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md">Opret</button>
				</div>
			{:else}
				<form id="updateCatForm" method="POST" action="?/updateCategory" use:enhance={() => {
					return async ({ update, result }) => {
						await update();
						if (result.type === 'success' || result.type === 'redirect') editCatId = null;
					};
				}} class="space-y-5">
					<input type="hidden" name="categoryId" value={editCatId} />
					<input type="hidden" name="icon" value={editCatIcon} />
					
					<div>
						<label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vælg Kategori Ikon</label>
						<div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
							{#each commonEmojis as emoji}
								<button type="button" onclick={() => editCatIcon = emoji} class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-lg transition-all {editCatIcon === emoji ? 'bg-indigo-200 ring-2 ring-indigo-500 shadow-sm' : ''}">
									{emoji}
								</button>
							{/each}
						</div>
					</div>

					<div>
						<label for="name" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kategorinavn</label>
						<input type="text" id="name" name="name" bind:value={editCatName} required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all">
					</div>
				</form>

				<form id="deleteCatForm" method="POST" action="?/deleteCategory" use:enhance={() => {
					return async ({ update, result }) => {
						await update();
						if (result.type === 'success' || result.type === 'redirect') editCatId = null;
					};
				}} onsubmit={(e) => { if (!confirm('Er du sikker på, at du vil slette denne kategori?')) e.preventDefault(); }}>
					<input type="hidden" name="categoryId" value={editCatId} />
				</form>

				<div class="pt-2 flex gap-2 mt-5">
					<button type="button" onclick={() => editCatId = null} class="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Annuller</button>
					<button type="submit" form="deleteCatForm" class="flex-none px-4 py-3.5 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-all">Slet</button>
					<button type="submit" form="updateCatForm" class="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md">Gem</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

{#if showProfileModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
		<div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-hidden relative">
			<button onclick={() => showProfileModal = false} class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
			<h3 class="text-xl font-bold text-slate-800 mb-6">Rediger Din Profil</h3>
			
			<form method="POST" action="?/updateProfile" use:enhance={() => {
				return async ({ update }) => {
					await update();
					showProfileModal = false;
				};
			}} class="space-y-5">
				<input type="hidden" name="emoji" value={profileEmoji} />
				
				<div>
					<label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Din Personlige Emoji</label>
					<div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
						{#each commonEmojis as emoji}
							<button type="button" onclick={() => profileEmoji = emoji} class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-lg transition-all {profileEmoji === emoji ? 'bg-indigo-200 ring-2 ring-indigo-500 shadow-sm' : ''}">
								{emoji}
							</button>
						{/each}
					</div>
				</div>

				<div>
					<label for="displayName" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dit Viste Navn</label>
					<input type="text" id="displayName" name="displayName" value={data.user?.displayName || data.user?.username || ''} required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all" placeholder="Fx Ronni Hostrup">
				</div>

				<div class="pt-2">
					<button type="submit" class="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md">
						Gem Profil
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300 p-4 md:p-12 font-sans">
	<div class="max-w-7xl mx-auto space-y-6 md:space-y-8">
		
		<header class="flex flex-col md:flex-row md:justify-between md:items-end border-b border-slate-200 pb-4 md:pb-6">
			<div>
				<h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">Ønskebrønden</h1>
				{#if data.user}
					<div class="mt-2 flex items-center gap-3 text-sm md:text-base">
						<button onclick={() => { profileEmoji = data.user?.emoji || '👤'; showProfileModal = true; }} class="font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-2 active:scale-95 shadow-sm border border-indigo-100/50">
							<span class="text-lg">{data.user.emoji || '👤'}</span> {data.user.displayName || data.user.username} <span class="text-[10px] opacity-60 ml-1">✎</span>
						</button>
						<a href="/dashboard" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-1.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors">
							📊 Dashboard →
						</a>
					</div>
				{/if}
			</div>
		</header>

		{#if data.kpis}
		<section class="flex overflow-x-auto pb-4 pt-1 snap-x snap-mandatory gap-4 md:grid md:grid-cols-3 lg:grid-cols-5 md:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
			
			<div class="w-[85vw] md:w-auto flex-shrink-0 snap-center bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-center bg-gradient-to-br from-white to-indigo-50/50">
				<p class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Værdi af Drømme</p>
				<p class="text-3xl font-black text-indigo-900">{formatCur(data.kpis.wishTotal)}</p>
				<p class="text-xs text-indigo-600/70 mt-1 font-medium">Udsat behov i {data.kpis.wishCount} ønsker</p>
			</div>

			<a href="/dashboard" class="w-[85vw] md:w-auto flex-shrink-0 snap-center bg-white hover:bg-slate-50 transition-colors p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center group cursor-pointer relative overflow-hidden">
				<div class="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300">↗</div>
				<p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Forbrug denne måned</p>
				<p class="text-3xl font-black text-slate-800">{formatCur(data.kpis.currentMonthExpenses || 0)}</p>
				<p class="text-xs text-slate-500 mt-1 font-medium truncate max-w-[150px]">Største post: {data.kpis.topCategoryName || 'Ingen'}</p>
			</a>

			<div class="w-[85vw] md:w-auto flex-shrink-0 snap-center bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
				<div class="w-14 h-14 rounded-full shrink-0 shadow-inner" style="background: conic-gradient(#6366f1 0% {wishVsBuyPct}%, #cbd5e1 {wishVsBuyPct}% 100%);"></div>
				<div class="flex flex-col justify-center">
					<p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Økonomisk Tyngde</p>
					<div class="text-[11px] text-slate-600 font-medium flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> Drømme ({Math.round(wishVsBuyPct)}%)</div>
					<div class="text-[11px] text-slate-600 font-medium flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-slate-300"></span> Købt ({100 - Math.round(wishVsBuyPct)}%)</div>
				</div>
			</div>

			<div class="w-[85vw] md:w-auto flex-shrink-0 snap-center bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
				<div class="w-14 h-14 rounded-full shrink-0 shadow-inner" style="background: conic-gradient(#8b5cf6 0% {sharedPct}%, #f43f5e {sharedPct}% 100%);"></div>
				<div class="flex flex-col justify-center">
					<p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Drømme-fordeling</p>
					<div class="text-[11px] text-slate-600 font-medium flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-violet-500"></span> Fælles ({Math.round(sharedPct)}%)</div>
					<div class="text-[11px] text-slate-600 font-medium flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Ego ({100 - Math.round(sharedPct)}%)</div>
				</div>
			</div>

			<div class="w-[85vw] md:w-auto flex-shrink-0 snap-center bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
				<div class="w-14 h-14 rounded-full shrink-0 shadow-inner" style="background: conic-gradient(#10b981 0% {buySharedPct}%, #f59e0b {buySharedPct}% 100%);"></div>
				<div class="flex flex-col justify-center">
					<p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Forbrugs-fordeling</p>
					<div class="text-[11px] text-slate-600 font-medium flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Fælles ({Math.round(buySharedPct)}%)</div>
					<div class="text-[11px] text-slate-600 font-medium flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500"></span> Ego ({100 - Math.round(buySharedPct)}%)</div>
				</div>
			</div>

			<div class="w-[85vw] md:w-auto flex-shrink-0 snap-center bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
				<div class="mb-2 md:mb-0">
					<p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Største Drømmer</p>
					<p class="text-sm font-bold text-slate-800">{data.kpis.topDreamer.name} <span class="font-normal text-slate-500 text-xs ml-1">({formatCur(data.kpis.topDreamer.amount)})</span></p>
				</div>
				<div>
					<p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Største Forbruger</p>
					<p class="text-sm font-bold text-slate-800">{data.kpis.topSpender.name} <span class="font-normal text-slate-500 text-xs ml-1">({formatCur(data.kpis.topSpender.amount)})</span></p>
				</div>
			</div>

			{#if data.kpis.cooldownGain !== undefined}
			<div class="w-[85vw] md:w-auto flex-shrink-0 snap-center bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col justify-center bg-gradient-to-br from-white to-emerald-50/50 relative overflow-hidden">
				<div class="absolute -right-4 -bottom-4 text-emerald-500/10 text-7xl rotate-12">🥶</div>
				<p class="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Afkølings-gevinst</p>
				<p class="text-3xl font-black text-emerald-600">{formatCur(data.kpis.cooldownGain)}</p>
				<p class="text-xs text-emerald-600/70 mt-1 font-medium z-10 relative">Sparet ved at "sove på det"</p>
			</div>
			{/if}

		</section>
		{/if}

		<main class="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
			<section class="xl:col-span-1 order-first">
				<div class="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-4 md:top-6 z-10">
					<h2 class="text-lg font-bold mb-4 border-b border-slate-100 pb-2">Kast i Brønden</h2>
					
					{#if form?.error && !showCategoryModal}
						<div class="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{form.error}</div>
					{/if}

					<form method="POST" action="?/createItem" use:enhance class="space-y-4">
						<div>
							<label for="title" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Hvad kigger du på?</label>
							<input type="text" id="title" name="title" required class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium text-base">
						</div>

						<div>
							<label for="url" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Link (valgfrit)</label>
							<input type="url" id="url" name="url" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm" placeholder="https://...">
						</div>

						<div>
							<label for="price" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pris (DKK)</label>
							<input type="number" step="0.01" id="price" name="price" required class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold text-lg" placeholder="0">
						</div>

						<div class="grid grid-cols-2 gap-3">
							<div>
								<div class="flex justify-between items-center mb-1">
									<label for="categoryId" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kategori</label>
									<button type="button" onclick={() => { showCategoryModal = true; editCatId = null; isCreatingCat = false; }} class="text-[10px] text-indigo-500 hover:text-indigo-700 font-bold px-1 rounded hover:bg-indigo-50 transition-colors">✎ Ret</button>
								</div>
								<select id="categoryId" name="categoryId" required class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium">
									{#each data.categories as category}
										<option value={category.id}>{category.icon} {category.name}</option>
									{/each}
								</select>
							</div>
							<div>
								<label for="expenseType" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Hvem?</label>
								<select id="expenseType" name="expenseType" required class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium">
									<option value="SHARED">Fælles</option>
									<option value="PERSONAL">Kun Mig</option>
								</select>
							</div>
						</div>

						<div class="bg-slate-50 p-3 border border-slate-200 rounded-xl mt-2">
							<input type="hidden" name="desireLevel" value={newDesireLevel} />
							<label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Need-Level (Vigtighed)</label>
							<div class="flex gap-2 justify-center">
								{#each [1,2,3,4,5] as level}
									<button type="button" onclick={() => newDesireLevel = level} class="text-2xl transition-all hover:scale-110 active:scale-95 {newDesireLevel >= level ? 'drop-shadow-sm scale-110' : 'opacity-20 hover:opacity-50 grayscale'}" title={desireLabels[level-1].replace(/⭐/g, '').trim()}>⭐</button>
								{/each}
							</div>
							<p class="text-[10px] text-slate-500 font-medium text-center mt-2 h-4">{desireLabels[newDesireLevel-1]}</p>
						</div>

						<div class="pt-2 flex flex-col gap-2">
							<button type="submit" name="targetStatus" value="WISH" class="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm text-base">
								✨ Gem i Brønden
							</button>
							<button type="submit" name="targetStatus" value="PURCHASED" class="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-emerald-100 hover:text-emerald-700 active:scale-[0.98] transition-all text-sm">
								💸 Registrer direkte som købt
							</button>
						</div>
					</form>
				</div>
			</section>

			<section class="xl:col-span-2 space-y-8 md:space-y-10 order-last">
				
				<div>
					<h2 class="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">✨ I Brønden <span class="text-sm font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{data.wishes.length}</span></h2>
					
					{#if data.wishes.length === 0}
						<div class="p-8 text-center bg-white rounded-2xl border border-slate-200 border-dashed text-slate-500">Brønden er tom.</div>
					{/if}

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{#each data.wishes as item}
							{@const itemDaysOld = (now - new Date(item.createdAt).getTime()) / (1000 * 3600 * 24)}
							{@const isLocked = item.price >= 1000 && itemDaysOld < 7}
							{@const daysLeft = Math.ceil(7 - itemDaysOld)}

							<div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col hover:border-indigo-300 transition-colors relative group">
								
								<div class="absolute -top-3 -right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
									<form method="POST" action="?/deleteItem" use:enhance onsubmit={(e) => { if (!confirm('Er du sikker på, at du vil slette dette ønske permanent?')) e.preventDefault(); }}>
										<input type="hidden" name="itemId" value={item.id} />
										<button class="bg-red-100 hover:bg-red-500 text-red-600 hover:text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md border border-white transition-colors text-xs" title="Slet">✕</button>
									</form>
								</div>

								<div class="flex justify-between items-start mb-3">
									<div class="flex flex-col">
										
										<form method="POST" action="?/changeItemCategory" use:enhance class="mb-1">
											<input type="hidden" name="itemId" value={item.id} />
											<div class="relative inline-flex items-center group/cat">
												<select name="categoryId" onchange={(e) => e.currentTarget.form?.requestSubmit()} class="appearance-none text-[10px] uppercase font-bold tracking-widest text-slate-400 group-hover/cat:text-indigo-500 bg-transparent border-none p-0 pr-3.5 cursor-pointer focus:ring-0 outline-none transition-colors">
													{#each data.categories as cat}
														<option value={cat.id} selected={cat.id === item.categoryId}>
															{cat.icon} {cat.name}
														</option>
													{/each}
												</select>
												<span class="pointer-events-none absolute right-0 text-[8px] text-slate-300 group-hover/cat:text-indigo-400 transition-colors">▼</span>
											</div>
										</form>

										<span class="text-[10px] font-bold px-2 py-0.5 rounded-md self-start {item.expenseType === 'SHARED' ? 'bg-violet-100 text-violet-700' : 'bg-rose-100 text-rose-700'}">
											{item.expenseType === 'SHARED' ? 'FÆLLES' : 'EGO'}
										</span>
									</div>

									<div class="flex gap-1 bg-slate-50 p-1 rounded-lg">
										<form method="POST" action="?/rateItem" use:enhance>
											<input type="hidden" name="itemId" value={item.id} />
											<button name="value" value="1" class="px-2 py-1.5 md:py-1 rounded hover:bg-green-100 text-slate-400 hover:text-green-600 active:scale-95 transition-all flex items-center gap-1">
												👍 <span class="text-xs font-bold">{item.ratings.filter(r => r.value === 1).length}</span>
											</button>
										</form>
										<form method="POST" action="?/rateItem" use:enhance>
											<input type="hidden" name="itemId" value={item.id} />
											<button name="value" value="-1" class="px-2 py-1.5 md:py-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 active:scale-95 transition-all flex items-center gap-1">
												👎 <span class="text-xs font-bold">{item.ratings.filter(r => r.value === -1).length}</span>
											</button>
										</form>
									</div>
								</div>
								
								<h3 class="text-lg md:text-xl font-bold text-slate-800 leading-tight pr-4">{item.title}</h3>
								
								<div class="flex gap-0.5 mt-1.5 mb-1">
									{#each Array(item.desireLevel || 3) as _}
										<span class="text-amber-400 text-[10px]">⭐</span>
									{/each}
								</div>

								<div class="flex justify-between items-center mt-1 mb-2">
									<p class="text-[11px] font-medium text-slate-500">
										Af <span class="bg-slate-100 px-1.5 py-0.5 rounded ml-0.5">{item.user.emoji || '👤'} {item.user.displayName || item.user.username}</span>
									</p>
									<p class="text-[10px] font-medium text-slate-400">Oprettet: {formatDate(item.createdAt)}</p>
								</div>
								
								<p class="text-2xl font-black text-indigo-900 mt-auto mb-4">{formatCur(item.price)}</p>

								<div class="flex gap-2 pt-4 border-t border-slate-100 mt-auto">
									{#if item.url}
										<a href={item.url} target="_blank" rel="noopener noreferrer" class="p-3 md:p-2 bg-slate-50 rounded-xl md:rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 text-center flex-shrink-0 transition-colors">🔗</a>
									{/if}
									
									<form method="POST" action="?/toggleStatus" use:enhance onsubmit={(e) => {
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
									}} class="flex-1 flex">
										<input type="hidden" name="itemId" value={item.id} />
										<button type={isLocked ? 'button' : 'submit'} class="w-full text-sm font-bold py-3 md:py-2 rounded-xl md:rounded-lg transition-all {isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : 'bg-emerald-50 border border-emerald-100 hover:bg-emerald-500 hover:text-white text-emerald-600 active:scale-[0.98]'}">
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
					<h2 class="text-lg font-bold text-slate-500 mb-4 flex items-center gap-2">💸 Realiseret (Købt) <span class="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{data.purchases.length}</span></h2>
					
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{#each data.purchases as item}
							<div class="bg-slate-100/70 p-4 md:p-5 rounded-2xl border border-slate-200 flex flex-col relative group">
								
								<div class="absolute -top-2 -right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
									<form method="POST" action="?/deleteItem" use:enhance onsubmit={(e) => { if (!confirm('Slet denne post fra historikken?')) e.preventDefault(); }}>
										<input type="hidden" name="itemId" value={item.id} />
										<button class="bg-white border border-slate-200 hover:bg-red-500 text-slate-400 hover:text-white w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-colors text-[10px]" title="Slet">✕</button>
									</form>
								</div>

								<div class="flex justify-between items-start mb-1.5">
									<div class="flex items-center gap-2">
										<span class="text-[9px] font-bold px-1.5 py-0.5 rounded text-slate-500 bg-white border border-slate-200">{item.expenseType === 'SHARED' ? 'FÆLLES' : 'EGO'}</span>
										
										<form method="POST" action="?/changeItemCategory" use:enhance>
											<input type="hidden" name="itemId" value={item.id} />
											<div class="relative inline-flex items-center group/cat">
												<select name="categoryId" onchange={(e) => e.currentTarget.form?.requestSubmit()} class="appearance-none text-[9px] uppercase font-bold tracking-widest text-slate-400 group-hover/cat:text-indigo-500 bg-transparent border-none p-0 pr-3.5 cursor-pointer focus:ring-0 outline-none transition-colors">
													{#each data.categories as cat}
														<option value={cat.id} selected={cat.id === item.categoryId}>
															{cat.icon} {cat.name}
														</option>
													{/each}
												</select>
												<span class="pointer-events-none absolute right-0 text-[8px] text-slate-300 group-hover/cat:text-indigo-400 transition-colors">▼</span>
											</div>
										</form>
									</div>

									<p class="text-sm font-bold text-slate-400">{formatCur(item.price)}</p>
								</div>
								
								<h3 class="text-base font-semibold text-slate-500 line-through decoration-slate-400/50 pr-4">{item.title}</h3>
								
								<div class="flex justify-between items-center mt-1 mb-2">
									<p class="text-[10px] font-medium text-slate-400">
										Af <span class="px-1 py-0.5 rounded">{item.user.emoji || '👤'} {item.user.displayName || item.user.username}</span>
									</p>
									<p class="text-[10px] font-medium text-slate-400">Købt: {item.purchasedAt ? formatDate(item.purchasedAt) : formatDate(item.createdAt)}</p>
								</div>

								<form method="POST" action="?/toggleStatus" use:enhance class="mt-4">
									<input type="hidden" name="itemId" value={item.id} />
									<button class="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 underline decoration-indigo-200 underline-offset-2 py-1 transition-colors active:opacity-70">
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