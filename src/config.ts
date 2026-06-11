// Google Analytics 4 — Measurement ID (format: G-XXXXXXXXXX)
//
// Hardcoded here rather than read from an environment variable because this is a fully
// static Astro site (output: "static"). Values must be baked in at build time; there is
// no server runtime to provide them later.
//
// Cloudflare "Variables and Secrets" are runtime bindings passed to the Worker's fetch
// handler — they are NOT injected into process.env or import.meta.env during the build
// step, so they cannot be used to supply build-time values for static sites.
//
// The GA Measurement ID is not a secret (it appears in plain text in every page's HTML),
// so hardcoding it here is safe and correct.
export const GA_ID = 'G-115YNQWJYF';
