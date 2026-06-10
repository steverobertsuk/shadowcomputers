// Public build-time constants.
//
// Hardcoded here rather than read from environment variables because this is a fully
// static Astro site (output: "static"). Values must be baked in at build time; there is
// no server runtime to provide them later.
//
// Cloudflare "Variables and Secrets" are runtime bindings passed to the Worker's fetch
// handler — they are NOT injected into process.env or import.meta.env during the build
// step, so they cannot be used to supply build-time values for static sites.
//
// None of these values are secrets (they all appear in plain text in the page HTML),
// so hardcoding them here is safe and correct.

// Google Analytics 4 — Measurement ID (format: G-XXXXXXXXXX)
export const GA_ID = 'G-115YNQWJYF';

// Cloudflare Web Analytics — Beacon token (cookieless, no consent required).
// Empty string disables the beacon.
export const CF_BEACON_TOKEN = '';

// Cloudflare Turnstile — public site key (safe to expose in HTML).
// Create a widget at https://dash.cloudflare.com -> Turnstile.
// Empty string hides the Turnstile widget on the contact form.
export const TURNSTILE_SITE_KEY = '';
