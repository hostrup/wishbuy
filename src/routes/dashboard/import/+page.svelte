<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	let { data, form } = $props();

	// Step state
	let step = $state<'upload' | 'preview' | 'saved'>('upload');
	let isAnalyzing = $state(false);
	let isSaving = $state(false);

	// Form state
	let selectedAccountId = $state(data.accounts?.[0]?.id || '');

	// Preview data (from analyze action)
	let previewRows = $state<
		Array<{
			hash: string;
			date: string;
			dateFormatted: string;
			text: string;
			amount: number;
			amountFormatted: string;
			receiverName: string | null;
			supplementalText: string | null;
			senderAccount: string | null;
			receiverAccount: string | null;
			transferType: string | null;
			balance: string | null;
			paidBy: string | null;
			categoryId: string | null;
			categoryName: string;
			isExisting: boolean;
			status: string;
			aiKeyword?: string;
		}>
	>([]);

	let stats = $state({ total: 0, new: 0, existing: 0, mapped: 0 });
	let categoryOptions = $state<string[]>([]);
	let showOnlyNew = $state(false);
	let showOnlyUnmapped = $state(false);
	let resultMessage = $state('');
	let isAiSuggesting = $state(false);
	let aiSuggestionCount = $state(0);

	// Category name → ID map from server
	let categoryMap = $state<Record<string, string>>(data.categoryMap || {});

	// Editable categories (map of hash -> { categoryName, categoryId })
	let editedCategories = $state<Record<string, { name: string; id: string | null }>>({});

	function handleAnalyzeResult(result: any) {
		if (result.success) {
			previewRows = result.preview;
			stats = result.stats;
			categoryOptions = result.categoryOptions;
			categoryMap = result.categoryMap || categoryMap;
			// Initialize editable categories from mapped values
			editedCategories = {};
			result.preview.forEach((r: any) => {
				editedCategories[r.hash] = { name: r.categoryName, id: r.categoryId };
			});
			step = 'preview';
		}
	}

	function onCategoryChange(hash: string, newCat: string) {
		editedCategories[hash] = { name: newCat, id: categoryMap[newCat] || null };
		// Find and update the row
		const row = previewRows.find((r) => r.hash === hash);
		if (row) {
			row.categoryName = newCat;
			row.categoryId = categoryMap[newCat] || null;
			row.status = newCat === 'Ukendt' ? 'UNPROCESSED' : 'MANUAL_REVIEW';
		}
	}

	let filteredRows = $derived.by(() => {
		let result = previewRows;
		if (showOnlyNew) result = result.filter((r) => !r.isExisting);
		if (showOnlyUnmapped)
			result = result.filter((r) => r.categoryName === 'Ukendt' || !r.categoryId);
		return result;
	});

	const formatCur = (val: number) =>
		new Intl.NumberFormat('da-DK', {
			style: 'currency',
			currency: 'DKK',
			maximumFractionDigits: 0
		}).format(Math.abs(val));
</script>

<div
	class="relative min-h-screen bg-slate-50 p-4 font-sans text-slate-900 md:p-8 lg:p-12 dark:bg-slate-950 dark:text-slate-100"
>
	<!-- Ambient Background -->
	<div
		class="pointer-events-none absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-600/10"
	></div>
	<div
		class="pointer-events-none absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-500/10"
	></div>

	<div class="relative z-10 mx-auto max-w-7xl space-y-8">
		<!-- HEADER -->
		<header
			class="flex flex-col border-b border-slate-200/50 pb-4 md:flex-row md:items-end md:justify-between dark:border-white/10"
		>
			<div>
				<h1
					class="bg-gradient-to-r from-emerald-600 to-sky-500 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-5xl dark:from-emerald-400 dark:to-sky-300"
				>
					Bankimport
				</h1>
				<p class="mt-2 font-medium text-slate-500 dark:text-slate-400">
					Upload din CSV kontoudtog og kategorisér automatisk.
				</p>
			</div>
		</header>

		<!-- STEP 1: UPLOAD -->
		{#if step === 'upload'}
			<section
				class="rounded-3xl border border-slate-200/50 bg-white/80 p-8 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
			>
				<form
					method="POST"
					action="?/analyze"
					enctype="multipart/form-data"
					use:enhance={() => {
						isAnalyzing = true;
						return async ({ result, update }) => {
							await update();
							isAnalyzing = false;
							if (result.type === 'success') handleAnalyzeResult(result.data);
							else if (result.type === 'failure')
								resultMessage = (result.data as any)?.error || 'Ukendt fejl';
						};
					}}
					class="space-y-6"
				>
					<!-- Account selector -->
					<div>
						<label class="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
							>Vælg konto</label
						>
						<select
							name="accountId"
							bind:value={selectedAccountId}
							class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
						>
							{#each data.accounts as acc}
								<option value={acc.id}
									>{acc.name}{acc.accountNumber ? ` (${acc.accountNumber})` : ''}</option
								>
							{/each}
						</select>
					</div>

					<!-- File upload -->
					<div>
						<label class="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
							>Vælg CSV fil</label
						>
						<div
							class="relative rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center transition-colors hover:border-emerald-400 dark:border-slate-600 dark:bg-slate-900/50"
						>
							<input
								type="file"
								name="csv"
								accept=".csv"
								required
								class="absolute inset-0 cursor-pointer opacity-0"
							/>
							<div class="pointer-events-none">
								<div class="mb-3 text-4xl">📁</div>
								<p class="text-sm font-bold text-slate-600 dark:text-slate-300">
									Træk en CSV fil hertil eller klik for at vælge
								</p>
								<p class="mt-1 text-xs text-slate-400 dark:text-slate-500">
									Semikolon-separeret (CP1252) fra din danske bank
								</p>
							</div>
						</div>
					</div>

					{#if resultMessage}
						<div
							class="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-700 dark:text-red-300"
						>
							{resultMessage}
						</div>
					{/if}

					<button
						type="submit"
						disabled={isAnalyzing}
						class="w-full rounded-xl bg-emerald-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-emerald-500 disabled:opacity-50"
					>
						{#if isAnalyzing}
							⏳ Analyserer CSV...
						{:else}
							📊 Analyser CSV
						{/if}
					</button>
				</form>
			</section>
		{/if}

		<!-- STEP 2: PREVIEW -->
		{#if step === 'preview'}
			<section class="space-y-6">
				<!-- Stats cards -->
				<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
					<div
						class="rounded-2xl border border-slate-200/50 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
					>
						<p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Total</p>
						<p class="text-2xl font-black text-slate-800 dark:text-white">{stats.total}</p>
					</div>
					<div
						class="rounded-2xl border border-emerald-200/50 bg-emerald-50/80 p-4 shadow-sm backdrop-blur-xl dark:border-emerald-500/20 dark:bg-emerald-900/20"
					>
						<p
							class="text-[10px] font-bold tracking-widest text-emerald-600 uppercase dark:text-emerald-400"
						>
							Nye
						</p>
						<p class="text-2xl font-black text-emerald-800 dark:text-emerald-300">{stats.new}</p>
					</div>
					<div
						class="rounded-2xl border border-amber-200/50 bg-amber-50/80 p-4 shadow-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-amber-900/20"
					>
						<p
							class="text-[10px] font-bold tracking-widest text-amber-600 uppercase dark:text-amber-400"
						>
							Eksisterende
						</p>
						<p class="text-2xl font-black text-amber-800 dark:text-amber-300">{stats.existing}</p>
					</div>
					<div
						class="rounded-2xl border border-emerald-200/50 bg-emerald-50/80 p-4 shadow-sm backdrop-blur-xl dark:border-emerald-500/20 dark:bg-emerald-950/20"
					>
						<p
							class="text-[10px] font-bold tracking-widest text-emerald-600 uppercase dark:text-emerald-400"
						>
							Auto-mappet
						</p>
						<p class="text-2xl font-black text-emerald-800 dark:text-emerald-300">{stats.mapped}</p>
					</div>
				</div>

				<!-- Filters -->
				<div
					class="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/50 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
				>
					<label
						class="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300"
					>
						<input type="checkbox" bind:checked={showOnlyNew} class="rounded" /> Kun nye
					</label>
					<label
						class="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300"
					>
						<input type="checkbox" bind:checked={showOnlyUnmapped} class="rounded" /> Kun umappede
					</label>

					{#if previewRows.some((r) => r.categoryName === 'Ukendt' || !r.categoryId)}
						<form
							method="POST"
							action="?/suggestCategories"
							use:enhance={({ formData }) => {
								isAiSuggesting = true;
								const unknowns = previewRows.filter(
									(r) => r.categoryName === 'Ukendt' || !r.categoryId
								);
								formData.append(
									'transactionTexts',
									JSON.stringify(unknowns.map((u) => ({ text: u.text, amount: u.amount })))
								);
								return async ({ result }) => {
									isAiSuggesting = false;
									if (result.type === 'success' && (result.data as any)?.success) {
										const suggestions = ((result.data as any).suggestions as any[]) || [];
										previewRows = previewRows.map((row) => {
											const match = suggestions.find((s: any) => s.transactionText === row.text);
											if (match && (row.categoryName === 'Ukendt' || !row.categoryId)) {
												return {
													...row,
													categoryId: match.suggestedCategoryId,
													categoryName: match.suggestedCategory,
													aiKeyword: match.keyword,
													status: 'AI_SUGGESTED'
												};
											}
											return row;
										});
										// Opdater editedCategories
										previewRows.forEach((r) => {
											editedCategories[r.hash] = { name: r.categoryName, id: r.categoryId };
										});
										aiSuggestionCount = suggestions.filter(
											(s: any) => s.suggestedCategoryId
										).length;
									} else {
										alert(
											(result as any).data?.error || 'Der opstod en fejl under AI-kategoriseringen.'
										);
									}
								};
							}}
							class="inline-block md:ml-4"
						>
							<button
								type="submit"
								disabled={isAiSuggesting}
								class="flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-emerald-500 disabled:opacity-50"
							>
								{#if isAiSuggesting}
									<span>⏳ Analyserer...</span>
								{:else}
									<span>🤖 Kategorisér med AI</span>
								{/if}
							</button>
						</form>
					{/if}

					<span class="ml-auto text-xs text-slate-400"
						>Viser {filteredRows.length} af {previewRows.length} transaktioner</span
					>
				</div>

				{#if aiSuggestionCount > 0}
					<div
						class="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-300"
					>
						<span
							>🤖 AI foreslog kategorier for {aiSuggestionCount} transaktioner (markeret med grøn). Gennemse
							og juster dem inden du gemmer.</span
						>
						<button
							onclick={() => (aiSuggestionCount = 0)}
							class="ml-auto cursor-pointer hover:opacity-80">✕</button
						>
					</div>
				{/if}

				<!-- Data Table -->
				<div
					class="overflow-x-auto rounded-2xl border border-slate-200/50 bg-white/80 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
				>
					<table class="w-full text-left text-sm">
						<thead>
							<tr class="border-b border-slate-200 dark:border-white/10">
								<th class="p-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase"
									>Dato</th
								>
								<th class="p-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase"
									>Tekst</th
								>
								<th
									class="p-3 text-right text-[10px] font-bold tracking-widest text-slate-400 uppercase"
									>Beløb</th
								>
								<th class="p-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase"
									>Kort</th
								>
								<th class="p-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase"
									>Kategori</th
								>
							</tr>
						</thead>
						<tbody>
							{#each filteredRows as row (row.hash)}
								<tr
									class="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-white/5 dark:hover:bg-slate-700/50 {row.isExisting
										? 'opacity-50'
										: ''} {row.status === 'AI_SUGGESTED'
										? 'bg-emerald-50/50 dark:bg-emerald-950/10'
										: ''}"
								>
									<td
										class="p-3 text-xs font-medium whitespace-nowrap text-slate-600 dark:text-slate-300"
									>
										{row.dateFormatted}
										{#if row.isExisting}
											<span
												class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
												>EKS.</span
											>
										{/if}
									</td>
									<td class="max-w-[300px] p-3">
										<p
											class="truncate text-xs font-medium text-slate-800 dark:text-slate-200"
											title={row.text}
										>
											{row.text}
										</p>
										{#if row.supplementalText}
											<p
												class="truncate text-[11px] text-slate-400 dark:text-slate-500"
												title={row.supplementalText}
											>
												{row.supplementalText}
											</p>
										{/if}
									</td>
									<td
										class="p-3 text-right text-xs font-bold whitespace-nowrap text-slate-800 dark:text-slate-200"
									>
										{row.amountFormatted}
									</td>
									<td class="p-3 text-xs whitespace-nowrap">
										{#if row.paidBy === 'Mathilde'}
											<span
												class="rounded-full bg-pink-100 px-2 py-1 font-bold text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
												>M</span
											>
										{:else if row.paidBy === 'Ronni'}
											<span
												class="rounded-full bg-blue-100 px-2 py-1 font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
												>R</span
											>
										{:else}
											<span class="text-slate-400">-</span>
										{/if}
									</td>
									<td class="p-3">
										<div class="flex items-center gap-1.5">
											{#if row.status === 'AI_SUGGESTED'}
												<span
													title="AI foreslået kategori: {editedCategories[row.hash]
														?.name} (Nøgleord: {row.aiKeyword})"
													class="text-xs">🤖</span
												>
											{/if}
											<select
												value={editedCategories[row.hash]?.name || 'Ukendt'}
												onchange={(e) =>
													onCategoryChange(row.hash, (e.target as HTMLSelectElement).value)}
												class="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
											>
												<option value="Ukendt">Ukendt</option>
												{#each categoryOptions as cat}
													<option value={cat}>{cat}</option>
												{/each}
											</select>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
					{#if filteredRows.length === 0}
						<div class="p-8 text-center text-sm text-slate-400">
							Ingen transaktioner matcher filtrene.
						</div>
					{/if}
				</div>

				<!-- Action buttons -->
				<div class="flex gap-4">
					<button
						onclick={() => {
							step = 'upload';
							previewRows = [];
						}}
						class="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
					>
						← Tilbage
					</button>

					<form
						method="POST"
						action="?/save"
						use:enhance={() => {
							isSaving = true;
							return async ({ result, update }) => {
								await update();
								isSaving = false;
								if (result.type === 'success') {
									step = 'saved';
								}
							};
						}}
						class="contents"
					>
						<input type="hidden" name="accountId" value={selectedAccountId} />
						<input
							type="hidden"
							name="data"
							value={JSON.stringify(
								previewRows
									.filter((r) => !r.isExisting)
									.map((r) => ({
										hash: r.hash,
										date: r.date,
										text: r.text,
										amount: r.amount,
										categoryId: r.categoryId,
										status: r.status,
										senderAccount: r.senderAccount,
										receiverAccount: r.receiverAccount,
										receiverName: r.receiverName,
										transferType: r.transferType,
										supplementalText: r.supplementalText,
										balance: r.balance,
										paidBy: r.paidBy,
										aiKeyword: (r as any).aiKeyword
									}))
							)}
						/>
						<button
							type="submit"
							disabled={isSaving || stats.new === 0}
							class="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-emerald-500 disabled:opacity-50"
						>
							{#if isSaving}
								⏳ Gemmer...
							{:else}
								💾 Gem {stats.new} nye transaktioner
							{/if}
						</button>
					</form>
				</div>
			</section>
		{/if}

		<!-- STEP 3: SAVED -->
		{#if step === 'saved'}
			<section
				class="rounded-3xl border border-emerald-200/50 bg-white/80 p-12 text-center shadow-sm backdrop-blur-xl dark:border-emerald-500/20 dark:bg-slate-800/80"
			>
				<div class="mb-6 text-6xl">✅</div>
				<h2 class="mb-4 text-2xl font-black text-slate-800 dark:text-white">Gemt!</h2>
				<p class="mb-8 text-slate-500 dark:text-slate-400">
					Dine transaktioner er nu gemt i databasen.
					{#if form?.inserted}
						<br /><strong>{form.inserted}</strong> nye transaktioner importeret.
					{/if}
					{#if form?.updated}
						<br /><strong>{form.updated}</strong> eksisterende transaktioner opdateret med nye data.
					{/if}
				</p>
				<div class="flex justify-center gap-4">
					<button
						onclick={() => {
							step = 'upload';
							previewRows = [];
						}}
						class="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
					>
						Importer ny fil
					</button>
					<a
						href="/dashboard/finance"
						class="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-500"
					>
						Gå til Cockpit →
					</a>
				</div>
			</section>
		{/if}
	</div>
</div>
