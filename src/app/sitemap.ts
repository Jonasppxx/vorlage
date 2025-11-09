import fs from "fs";
import path from "path";

const APP_DIR = path.join(process.cwd(), "src", "app");

function isPageFile(name: string) {
  return name === "page.tsx" || name === "page.ts" || name === "page.jsx" || name === "page.js";
}

function walkPages(dir: string, pages: Array<{ url: string; lastModified: Date; relDir: string }>, baseUrl: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // If this directory contains a page file, add it as a route
  for (const e of entries) {
    if (e.isFile() && isPageFile(e.name)) {
      const relDir = path.relative(APP_DIR, dir);
      // Build route but strip out grouping folders that are wrapped in ()
      const parts = relDir === "" ? [] : relDir.split(path.sep);
      const routeParts = parts.filter((s) => !(s.startsWith("(") && s.endsWith(")")));
      const route = routeParts.length === 0 ? "/" : `/${routeParts.join("/")}`;
      const stat = fs.statSync(path.join(dir, e.name));
      pages.push({ url: `${baseUrl}${route}`, lastModified: stat.mtime, relDir });
      break; // only add once per directory even if multiple page files
    }
  }

  // Recurse into subdirectories
  for (const e of entries) {
    if (e.isDirectory()) {
      const name = e.name;
      // skip folders that are not routes
      if (name === "api" || name === "components" || name === "lib" || name.startsWith("_")) continue;
      walkPages(path.join(dir, name), pages, baseUrl);
    }
  }
}

export default async function sitemap() {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const baseUrl = rawBaseUrl.replace(/\/\/+$/g, "");

  const pages: Array<{ url: string; lastModified: Date; relDir: string }> = [];

  try {
    if (fs.existsSync(APP_DIR)) {
      walkPages(APP_DIR, pages, baseUrl);
    }
  } catch (err) {
    // on error, return minimal sitemap (root only)
    return [
      {
        url: `${baseUrl}/`,
        lastModified: new Date(),
        priority: 1.0,
        changefreq: "daily",
      },
    ];
  }

  // Normalize URLs (remove duplicate trailing slashes) and deduplicate
  const normalizeKey = (url: string) => {
    // Remove trailing slashes for comparison, but treat baseUrl as root
    let key = url.replace(/\/+$/g, "");
    const base = baseUrl.replace(/\/+$/g, "");
    if (key === base) return `${base}/`;
    return key;
  };

  const seen = new Set<string>();
  const uniquePages: Array<{ url: string; lastModified: Date; relDir: string }> = [];

  // iterate in sorted order but keep canonical URLs
  const sorted = pages.sort((a, b) => a.url.localeCompare(b.url));
  for (const p of sorted) {
    const key = normalizeKey(p.url);
    if (seen.has(key)) continue;
    seen.add(key);

    // ensure the stored url is canonical: root ends with '/', others don't
    const base = baseUrl.replace(/\/+$/g, "");
    let canonicalUrl = p.url.replace(/\/+$/g, "");
    if (canonicalUrl === base) canonicalUrl = `${base}/`;

    uniquePages.push({ url: canonicalUrl, lastModified: p.lastModified, relDir: p.relDir });
  }

  // Ensure root is present (with trailing slash)
  if (!uniquePages.some((p) => p.url === `${baseUrl}/`)) {
    uniquePages.unshift({ url: `${baseUrl}/`, lastModified: new Date(), relDir: "" });
  }

  // Map to sitemap entries with priority rules:
  // - root (/) : priority 1.0 (most important)
  // - any route that comes from a (stripe) grouping : low priority 0.1
  // - any /admin route : low priority 0.1
  // - all others: default 0.7
  return uniquePages.map((p) => {
    const pathPart = p.url.replace(baseUrl, "") || "/";

    let priority = 0.7;
    let changefreq: "daily" | "weekly" | "monthly" | "yearly" = "weekly";

    // Check relDir segments for grouping or admin
    const relSegments = p.relDir ? p.relDir.split(/\\|\//).filter(Boolean) : [];
    const cameFromStripeGroup = relSegments.some((s) => s.startsWith("(") && s.includes("stripe"));
    const isAdmin = relSegments.includes("admin") || pathPart.startsWith("/admin");

    if (pathPart === "/") {
      priority = 1.0;
      changefreq = "daily";
    } else if (cameFromStripeGroup || isAdmin) {
      // deprioritize stripe-grouped pages and admin pages
      priority = 0.1;
      changefreq = "yearly";
    }

    return {
      url: p.url,
      lastModified: p.lastModified,
      priority,
      changefreq,
    };
  });
}
