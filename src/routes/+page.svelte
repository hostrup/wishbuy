<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	// Hjælpefunktion til at formatere beløb som DKK
	const formatCur = (val: number) => new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(val);
</script>

<div class="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-12">
	<div class="max-w-6xl mx-auto space-y-8">
		
		<header class="flex justify-between items-end border-b border-slate-200 pb-6">
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-slate-800">WishBuy Tracker</h1>
				{#if data.user}
					<p class="text-slate-500 mt-1">Logget ind som <span class="font-semibold">{data.user.username}</span></p>
				{/if}
			</div>
		</header>

		{#if data.kpis}
		<section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
				<p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aktive Ønsker</p>
				<p class="text-2xl font-bold text-slate-800">{data.kpis.activeWishes} <span class="text-sm font-normal text-slate-400">stk</span></p>
			</div>
			<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
				<p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fælles Budget</p>
				<p class="text-2xl font-bold text-indigo-600">{formatCur(data.kpis.totalSharedAmount)}</p>
			</div>
			<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
				<p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Flest Ønsker</p>
				<p class="text-2xl font-bold text-slate-800">{data.kpis.topUser.name} <span class="text-xs bg-slate-100 px-2 py-0.5 rounded ml-1 text-slate-500">{data.kpis.topUser.count}</span></p>
			</div>
			<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
				<p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Købt</p>
				<p class="text-2xl font-bold text-emerald-600">{formatCur(data.kpis.totalSpent)}</p>
			</div>
		</section>
		{/if}

		<main class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<section class="lg:col-span-1">
				<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-6">
					<h2 class="text-lg font-semibold mb-4 border-b border-slate-100 pb-2">Tilføj nyt ønske</h2>
					
					{#if form?.error}
						<div class="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
							{form.error}
						</div>
					{/if}

					<form method="POST" action="?/createItem" use:enhance class="space-y-4">
						<div>
							<label for="title" class="block text-sm font-medium text-slate-700 mb-1">Titel / Navn</label>
							<input type="text" id="title" name="title" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition-all">
						</div>

						<div>
							<label for="url" class="block text-sm font-medium text-slate-700 mb-1">Link (valgfrit)</label>
							<input type="url" id="url" name="url" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition-all" placeholder="https://...">
						</div>

						<div>
							<label for="price" class="block text-sm font-medium text-slate-700 mb-1">Pris (DKK)</label>
							<input type="number" step="0.01" id="price" name="price" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition-all" placeholder="0.00">
						</div>

						<div>
							<label for="categoryId" class="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
							<select id="categoryId" name="categoryId" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition-all bg-white">
								<option value="" disabled selected>Vælg kategori</option>
								{#each data.categories as category}
									<option value={category.id}>{category.icon} {category.name}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="expenseType" class="block text-sm font-medium text-slate-700 mb-1">Type af udgift</label>
							<select id="expenseType" name="expenseType" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition-all bg-white">
								<option value="PERSONAL">Personlig (Mig)</option>
								<option value="SHARED">Fælles (Husstand)</option>
							</select>
						</div>

						<button type="submit" class="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 transition-colors">
							Gem ønske
						</button>
					</form>
				</div>
			</section>

			<section class="lg:col-span-2 space-y-4">
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{#if data.items.length === 0}
						<div class="sm:col-span-2 p-8 text-center bg-white rounded-2xl border border-slate-100 border-dashed text-slate-500">
							Ingen ønsker fundet.
						</div>
					{/if}

					{#each data.items as item}
						<div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col hover:border-sky-200 transition-colors">
							<div class="flex justify-between items-start mb-3">
								<div class="flex flex-col">
									<span class="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">{item.category.name}</span>
									<span class="text-xs font-medium px-2 py-0.5 rounded-md self-start {item.expenseType === 'SHARED' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}">
										{item.expenseType === 'SHARED' ? 'Fælles' : 'Personlig'}
									</span>
								</div>

								<div class="flex gap-1 bg-slate-50 p-1 rounded-lg">
									<form method="POST" action="?/rateItem" use:enhance>
										<input type="hidden" name="itemId" value={item.id} />
										<button name="value" value="1" class="px-2 py-1 rounded hover:bg-green-100 text-slate-400 hover:text-green-600 transition-colors flex items-center gap-1">
											👍 <span class="text-xs font-semibold">{item.ratings.filter(r => r.value === 1).length}</span>
										</button>
									</form>
									<form method="POST" action="?/rateItem" use:enhance>
										<input type="hidden" name="itemId" value={item.id} />
										<button name="value" value="-1" class="px-2 py-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors flex items-center gap-1">
											👎 <span class="text-xs font-semibold">{item.ratings.filter(r => r.value === -1).length}</span>
										</button>
									</form>
								</div>
							</div>
							
							<h3 class="text-lg font-semibold text-slate-800">{item.title}</h3>
							<p class="text-xs text-slate-500 mb-2">Tilføjet af {item.user.username}</p>
							
							<p class="text-2xl font-bold text-slate-900 mt-auto mb-4">
								{formatCur(item.price)}
							</p>

							<div class="flex gap-2 pt-4 border-t border-slate-50 mt-auto">
								{#if item.url}
									<a href={item.url} target="_blank" rel="noopener noreferrer" class="p-2 bg-slate-50 rounded-lg text-slate-600 hover:bg-slate-100 text-center flex-shrink-0">
										🔗
									</a>
								{/if}
								<button class="flex-1 bg-sky-50 hover:bg-sky-100 text-sky-700 text-sm font-bold py-2 rounded-lg transition-colors">
									Marker som købt
								</button>
							</div>
						</div>
					{/each}
				</div>
			</section>
		</main>
	</div>
</div>