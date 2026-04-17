<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	const formatCur = (val: number) => new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(val);

	let sharedPct = $derived(data.kpis?.wishTotal ? (data.kpis.wishShared / data.kpis.wishTotal) * 100 : 0);
	let buySharedPct = $derived(data.kpis?.buyTotal ? (data.kpis.buyShared / data.kpis.buyTotal) * 100 : 0);
	let grandTotal = $derived((data.kpis?.wishTotal || 0) + (data.kpis?.buyTotal || 0));
	let wishVsBuyPct = $derived(grandTotal ? ((data.kpis?.wishTotal || 0) / grandTotal) * 100 : 0);
</script>

<div class="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-12 font-sans">
	<div class="max-w-7xl mx-auto space-y-6 md:space-y-8">
		
		<header class="flex flex-col md:flex-row md:justify-between md:items-end border-b border-slate-200 pb-4 md:pb-6">
			<div>
				<h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">Ønskebrønden</h1>
				{#if data.user}
					<p class="text-slate-500 mt-1 text-sm md:text-base">Psyko-økonomisk radar for <span class="font-semibold">{data.user.username}</span></p>
				{/if}
			</div>
		</header>

		{#if data.kpis}
		<section class="flex overflow-x-auto pb-4 pt-1 snap-x snap-mandatory gap-4 md:grid md:grid-cols-3 lg:grid-cols-5 md:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
			
			<div class="w-[85vw] md:w-auto flex-shrink-0 snap-center bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-center bg-gradient-to-br from-white to-indigo-50/50">
				<p class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Penge Sparet Lige Nu</p>
				<p class="text-3xl font-black text-indigo-900">{formatCur(data.kpis.wishTotal)}</p>
				<p class="text-xs text-indigo-600/70 mt-1 font-medium">Udsat behov i {data.kpis.wishCount} ønsker</p>
			</div>

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

		</section>
		{/if}

		<main class="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
			<section class="xl:col-span-1 order-first">
				<div class="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-4 md:top-6 z-10">
					<h2 class="text-lg font-bold mb-4 border-b border-slate-100 pb-2">Kast i Brønden</h2>
					
					{#if form?.error}
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
								<label for="categoryId" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Kategori</label>
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
							<div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col hover:border-indigo-300 transition-colors relative group">
								
								<div class="absolute -top-3 -right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
									<form method="POST" action="?/deleteItem" use:enhance onsubmit={(e) => { if (!confirm('Er du sikker på, at du vil slette dette ønske permanent?')) e.preventDefault(); }}>
										<input type="hidden" name="itemId" value={item.id} />
										<button class="bg-red-100 hover:bg-red-500 text-red-600 hover:text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md border border-white transition-colors text-xs" title="Slet">✕</button>
									</form>
								</div>

								<div class="flex justify-between items-start mb-3">
									<div class="flex flex-col">
										<span class="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">{item.category.icon} {item.category.name}</span>
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
								<p class="text-[11px] font-medium text-slate-400 mb-2 mt-1">Af {item.user.username}</p>
								<p class="text-2xl font-black text-indigo-900 mt-auto mb-4">{formatCur(item.price)}</p>

								<div class="flex gap-2 pt-4 border-t border-slate-100 mt-auto">
									{#if item.url}
										<a href={item.url} target="_blank" rel="noopener noreferrer" class="p-3 md:p-2 bg-slate-50 rounded-xl md:rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 text-center flex-shrink-0 transition-colors">🔗</a>
									{/if}
									<form method="POST" action="?/toggleStatus" use:enhance class="flex-1 flex">
										<input type="hidden" name="itemId" value={item.id} />
										<button class="w-full bg-emerald-50 border border-emerald-100 hover:bg-emerald-500 hover:text-white text-emerald-600 text-sm font-bold py-3 md:py-2 rounded-xl md:rounded-lg active:scale-[0.98] transition-all">
											✔ Realiser (Køb)
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
								
								<div class="absolute -top-2 -right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
									<form method="POST" action="?/deleteItem" use:enhance onsubmit={(e) => { if (!confirm('Slet denne post fra historikken?')) e.preventDefault(); }}>
										<input type="hidden" name="itemId" value={item.id} />
										<button class="bg-white border border-slate-200 hover:bg-red-500 text-slate-400 hover:text-white w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-colors text-[10px]" title="Slet">✕</button>
									</form>
								</div>

								<div class="flex justify-between items-start mb-1.5">
									<span class="text-[9px] font-bold px-1.5 py-0.5 rounded text-slate-500 bg-white border border-slate-200">{item.expenseType === 'SHARED' ? 'FÆLLES' : 'EGO'}</span>
									<p class="text-sm font-bold text-slate-400">{formatCur(item.price)}</p>
								</div>
								
								<h3 class="text-base font-semibold text-slate-500 line-through decoration-slate-400/50 pr-4">{item.title}</h3>
								
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