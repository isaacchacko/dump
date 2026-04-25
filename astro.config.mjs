// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// Match static output folders (…/slug/index.html) and Vercel’s usual trailing-slash behavior
	trailingSlash: "always",
	// Set your Vercel URL for absolute URLs in RSS/meta later
	// site: "https://your-app.vercel.app",
});
