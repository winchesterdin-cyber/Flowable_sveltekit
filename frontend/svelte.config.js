import adapter from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true
  },
  kit: {
    adapter: adapter({
      // Use edge functions for better performance (optional, can use 'standard' for serverless)
      edge: false,
      // Split into separate functions for better cold start performance
      split: false
    })
  }
};

export default config;
