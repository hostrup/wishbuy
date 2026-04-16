import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite'; // <-- Tilføj denne import
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(), // <-- Tilføj denne linje FØR sveltekit()
		sveltekit()
	],
	ssr: {
		external: ['@prisma/client', 'pg']
	}
});