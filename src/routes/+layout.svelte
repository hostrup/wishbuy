<script lang="ts">
	import './layout.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>Ønskebrønden</title>
</svelte:head>

{@render children()}