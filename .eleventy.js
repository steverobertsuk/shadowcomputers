const fs   = require('fs');
const path = require('path');

// Load .env without external dependencies
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq  = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addShortcode("year", () => String(new Date().getFullYear()));

  eleventyConfig.addGlobalData("site", () => ({
    name: "Shadow Computers",
    shortName: "ShadowComps",
    description: "Hosting, Web & Media Systems with part-time IT Support.",
    url: process.env.NODE_ENV === "production"
      ? "https://shadowcomputers.co.uk"
      : "http://localhost:8080",
    themeColor: "#3B82F6",
    bgColor: "#05070F",
    // Analytics — replace placeholders before going live
    gaId:             process.env.GA_MEASUREMENT_ID    || "",
    cfToken:          process.env.CF_BEACON_TOKEN      || "",
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY   || "",
  }));

  // Pass through static assets
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/favicon.ico");
  eleventyConfig.addPassthroughCopy("src/site.webmanifest");
  eleventyConfig.addPassthroughCopy("src/_redirects");

  // Watch CSS for changes
  eleventyConfig.addWatchTarget("src/css/");

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
