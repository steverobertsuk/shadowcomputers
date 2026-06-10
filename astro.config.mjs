import { defineConfig, passthroughImageService } from "astro/config";
import mdx from "@astrojs/mdx";
import cloudflare from "@astrojs/cloudflare";
import { loadEnv } from "vite";

const env = loadEnv("", process.cwd(), "");

export default defineConfig({
  output: "static",
  integrations: [mdx()],
  site: env.SITE ?? "https://shadowcomputers.co.uk",
  adapter: cloudflare({
    imageService: "passthrough",
    configPath: "wrangler.dev.toml",
  }),
  image: {
    service: passthroughImageService(),
  },
  server: {
    port: 8081,
  },
  preview: {
    port: 8081,
  },
  vite: {
    server: {
      strictPort: true,
    },
  },
});
