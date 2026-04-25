import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const blog = defineCollection({
	loader: glob({
		pattern: "**/*.md",
		base: new URL("./content/blog/", import.meta.url),
	}),
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
		description: z.string().optional(),
		draft: z.boolean().optional().default(false),
	}),
});

export const collections = { blog };
