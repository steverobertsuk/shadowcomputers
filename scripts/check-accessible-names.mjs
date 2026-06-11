import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const rootArg = process.argv[2];
if (!rootArg) {
  console.error(
    "Usage: node scripts/check-accessible-names.mjs <html-output-dir>",
  );
  process.exit(2);
}

const outputRoot = resolve(process.cwd(), rootArg);

function stripTags(input) {
  return input
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isHiddenAttrs(attrs) {
  if (/\shidden(?:\s|>|=|$)/i.test(` ${attrs} `)) {
    return true;
  }

  return /\baria-hidden\s*=\s*(["'])\s*true\s*\1/i.test(attrs);
}

function removeHiddenSubtrees(input) {
  let output = input;
  const hiddenBlockRegex =
    /<([a-z][a-z0-9:-]*)\b([^>]*?(?:\shidden(?:\s|>|=|$)|\baria-hidden\s*=\s*(["'])\s*true\s*\3)[^>]*)>[\s\S]*?<\/\1>/gi;
  const hiddenSelfClosingRegex =
    /<([a-z][a-z0-9:-]*)\b([^>]*?(?:\shidden(?:\s|>|=|$)|\baria-hidden\s*=\s*(["'])\s*true\s*\3)[^>]*)\/?>/gi;

  while (hiddenBlockRegex.test(output)) {
    output = output.replace(hiddenBlockRegex, " ");
  }

  return output.replace(hiddenSelfClosingRegex, " ");
}

function getAttrValue(attrs, name) {
  const regex = new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, "i");
  const match = attrs.match(regex);
  return match?.[2]?.trim() ?? "";
}

function hasNamedImg(innerHtml) {
  const visibleInnerHtml = removeHiddenSubtrees(innerHtml);
  const regex = /<(img|Image)\b([^>]*)\balt\s*=\s*(["'])(.*?)\3[^>]*>/gis;
  for (const match of visibleInnerHtml.matchAll(regex)) {
    if (isHiddenAttrs(match[2] ?? "")) {
      continue;
    }

    if ((match[4] ?? "").trim()) {
      return true;
    }
  }
  return false;
}

function hasNamedSvgTitle(innerHtml) {
  const visibleInnerHtml = removeHiddenSubtrees(innerHtml);
  const regex =
    /<svg\b([^>]*)>[\s\S]*?<title\b[^>]*>\s*([^<\s][\s\S]*?)\s*<\/title>[\s\S]*?<\/svg>/gi;
  for (const match of visibleInnerHtml.matchAll(regex)) {
    if (isHiddenAttrs(match[1] ?? "")) {
      continue;
    }

    if ((match[2] ?? "").trim()) {
      return true;
    }
  }

  return false;
}

function hasAccessibleName(attrs, innerHtml) {
  if (getAttrValue(attrs, "aria-label")) {
    return true;
  }

  if (getAttrValue(attrs, "aria-labelledby")) {
    return true;
  }

  if (hasNamedImg(innerHtml)) {
    return true;
  }

  if (hasNamedSvgTitle(innerHtml)) {
    return true;
  }

  const visibleText = stripTags(removeHiddenSubtrees(innerHtml));
  return visibleText.length > 0;
}

async function getHtmlFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const output = [];

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await getHtmlFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && fullPath.toLowerCase().endsWith(".html")) {
      output.push(fullPath);
    }
  }

  return output;
}

function getLineNumber(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

async function main() {
  const files = await getHtmlFiles(outputRoot);
  const violations = [];
  const regex = /<(a|h[1-6])\b([^>]*)>([\s\S]*?)<\/\1>/gi;

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");

    for (const match of source.matchAll(regex)) {
      const [raw, tag, attrs, innerHtml] = match;
      if (isHiddenAttrs(attrs)) {
        continue;
      }

      if (hasAccessibleName(attrs, innerHtml)) {
        continue;
      }

      const index = match.index ?? 0;
      const line = getLineNumber(source, index);
      const snippet = raw.replace(/\s+/g, " ").slice(0, 180);

      violations.push({ filePath, line, tag, snippet });
    }
  }

  if (violations.length === 0) {
    console.log("Accessible-name audit passed for headings and anchors.");
    return;
  }

  console.error(
    "Accessible-name audit failed. Headings and anchors must have an accessible name.",
  );
  for (const item of violations) {
    console.error(
      `${item.filePath}:${item.line} <${item.tag}> ${item.snippet}`,
    );
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
