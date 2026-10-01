import * as cheerio from "cheerio";
import { absoluteUrl, fetchPage, normalizePath, sameOrigin, type FetchResult } from "../http.js";

export type PageSnapshot = {
  url: string;
  status: number;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  h1: string[];
  hreflang: Array<{ lang: string; href: string }>;
  ogImage: string | null;
  twitterCard: string | null;
  jsonLd: unknown[];
  internalLinks: string[];
  hasLlmsMention: boolean;
  lang: string | null;
  formActions: string[];
};

export type CrawlResult = {
  seed: string;
  pages: PageSnapshot[];
  robotsTxt: string | null;
  robotsStatus: number | null;
  sitemapUrls: string[];
  sitemapBodies: Record<string, string>;
  /** True if at least one sitemap or sitemapindex document was fetched successfully */
  sitemapFound: boolean;
  llmsTxt: string | null;
  llmsStatus: number | null;
  /** Response headers for notable paths (robots, home, llms, first sitemap) */
  notableHeaders: Record<string, Record<string, string>>;
  errors: string[];
};

function parseJsonLd(raw: string): unknown[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

export function snapshotFromHtml(url: string, status: number, html: string): PageSnapshot {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || null;
  const robotsMeta = $('meta[name="robots"]').attr("content")?.trim() || null;
  const h1 = $("h1")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  const hreflang = $('link[rel="alternate"][hreflang]')
    .map((_, el) => ({
      lang: $(el).attr("hreflang") || "",
      href: $(el).attr("href") || "",
    }))
    .get()
    .filter((x) => x.lang && x.href);
  const ogImage = $('meta[property="og:image"]').attr("content")?.trim() || null;
  const twitterCard = $('meta[name="twitter:card"]').attr("content")?.trim() || null;
  const jsonLd: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).text();
    jsonLd.push(...parseJsonLd(text));
  });
  const lang = $("html").attr("lang")?.trim() || null;
  const formActions = $("form")
    .map((_, el) => $(el).attr("action") || "")
    .get()
    .filter(Boolean);

  const internalLinks = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    const abs = absoluteUrl(url, href);
    if (!abs || !sameOrigin(url, abs)) return;
    internalLinks.add(abs.split("#")[0]!);
  });

  return {
    url,
    status,
    title,
    metaDescription,
    canonical,
    robotsMeta,
    h1,
    hreflang,
    ogImage,
    twitterCard,
    jsonLd,
    internalLinks: [...internalLinks],
    hasLlmsMention: /llms\.txt/i.test(html),
    lang,
    formActions,
  };
}

function extractSitemapLocs(xml: string): string[] {
  const locs: string[] = [];
  const re = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    locs.push(m[1]!.trim());
  }
  return locs;
}

async function discoverSitemaps(origin: string, robotsTxt: string | null): Promise<string[]> {
  const candidates = new Set<string>();
  if (robotsTxt) {
    for (const line of robotsTxt.split(/\r?\n/)) {
      const match = line.match(/^\s*Sitemap:\s*(.+)\s*$/i);
      if (match) candidates.add(match[1]!.trim());
    }
  }
  for (const path of ["/sitemap.xml", "/sitemap-index.xml", "/sitemap_index.xml", "/wp-sitemap.xml"]) {
    candidates.add(new URL(path, origin).toString());
  }
  return [...candidates];
}

export async function crawlSite(
  seed: string,
  options: { maxPages?: number; extraUrls?: string[]; rewriteSitemapHostToSeed?: boolean } = {},
): Promise<CrawlResult> {
  const maxPages = options.maxPages ?? 25;
  const errors: string[] = [];
  const origin = new URL(seed).origin;
  const notableHeaders: Record<string, Record<string, string>> = {};

  let robotsTxt: string | null = null;
  let robotsStatus: number | null = null;
  try {
    const robots = await fetchPage(new URL("/robots.txt", origin).toString());
    robotsStatus = robots.status;
    notableHeaders["robots.txt"] = robots.headers;
    if (robots.ok) robotsTxt = robots.body;
  } catch (e) {
    errors.push(`robots.txt: ${e instanceof Error ? e.message : String(e)}`);
  }

  let llmsTxt: string | null = null;
  let llmsStatus: number | null = null;
  try {
    const llms = await fetchPage(new URL("/llms.txt", origin).toString());
    llmsStatus = llms.status;
    notableHeaders["llms.txt"] = llms.headers;
    if (llms.ok && !llms.contentType.includes("text/html")) llmsTxt = llms.body;
    else if (llms.ok && llms.body && !llms.body.trim().startsWith("<")) llmsTxt = llms.body;
  } catch (e) {
    errors.push(`llms.txt: ${e instanceof Error ? e.message : String(e)}`);
  }

  const sitemapCandidates = await discoverSitemaps(origin, robotsTxt);
  const sitemapBodies: Record<string, string> = {};
  const sitemapUrls: string[] = [];
  let sitemapFound = false;

  const maybeRewrite = (url: string): string => {
    if (!options.rewriteSitemapHostToSeed) return url;
    try {
      const u = new URL(url);
      const seedHost = new URL(seed).host;
      // Prefer probing the host under audit when the sitemap points at production
      u.protocol = new URL(seed).protocol;
      u.host = seedHost;
      return u.toString();
    } catch {
      return url;
    }
  };

  for (const sm of sitemapCandidates) {
    try {
      const res = await fetchPage(sm);
      if (!res.ok) continue;
      if (!/<urlset|<sitemapindex/i.test(res.body) || !res.body.includes("<loc")) continue;
      sitemapFound = true;
      sitemapBodies[sm] = res.body;
      notableHeaders[`sitemap:${sm}`] = res.headers;
      const locs = extractSitemapLocs(res.body);
      const isIndex = /sitemapindex/i.test(res.body);
      if (isIndex) {
        for (const child of locs.slice(0, 10)) {
          const childUrl = maybeRewrite(child);
          try {
            const childRes = await fetchPage(childUrl);
            if (childRes.ok && /<urlset/i.test(childRes.body) && childRes.body.includes("<loc")) {
              sitemapBodies[childUrl] = childRes.body;
              sitemapUrls.push(...extractSitemapLocs(childRes.body));
            } else if (child !== childUrl) {
              // Fallback to the original absolute child URL
              const orig = await fetchPage(child);
              if (orig.ok && orig.body.includes("<loc") && /<urlset/i.test(orig.body)) {
                sitemapBodies[child] = orig.body;
                sitemapUrls.push(...extractSitemapLocs(orig.body));
              }
            }
          } catch {
            /* ignore child failures */
          }
        }
      } else {
        sitemapUrls.push(...locs);
      }
    } catch {
      /* candidate missing is fine */
    }
  }

  const queue: string[] = [seed];
  for (const u of options.extraUrls ?? []) queue.push(u);
  for (const u of sitemapUrls.slice(0, maxPages)) queue.push(u);

  const seen = new Set<string>();
  const pages: PageSnapshot[] = [];

  while (queue.length && pages.length < maxPages) {
    const next = queue.shift()!;
    const key = normalizePath(next) + new URL(next).search;
    const fullKey = new URL(next).origin + key;
    if (seen.has(fullKey)) continue;
    seen.add(fullKey);

    let res: FetchResult;
    try {
      res = await fetchPage(next);
    } catch (e) {
      errors.push(`${next}: ${e instanceof Error ? e.message : String(e)}`);
      pages.push({
        url: next,
        status: 0,
        title: null,
        metaDescription: null,
        canonical: null,
        robotsMeta: null,
        h1: [],
        hreflang: [],
        ogImage: null,
        twitterCard: null,
        jsonLd: [],
        internalLinks: [],
        hasLlmsMention: false,
        lang: null,
        formActions: [],
      });
      continue;
    }

    if (pages.length === 0 || next === seed) {
      notableHeaders["home"] = res.headers;
    }

    if (!res.contentType.includes("html") && res.status >= 200 && res.status < 400) {
      continue;
    }

    const snap = snapshotFromHtml(res.finalUrl || next, res.status, res.body);
    // Keep requested URL for 404 tracking
    snap.url = next;
    pages.push(snap);

    for (const link of snap.internalLinks) {
      if (pages.length + queue.length >= maxPages * 2) break;
      const k = new URL(link).origin + normalizePath(link);
      if (!seen.has(k)) queue.push(link);
    }
  }

  return {
    seed,
    pages,
    robotsTxt,
    robotsStatus,
    sitemapUrls: [...new Set(sitemapUrls)],
    sitemapBodies,
    sitemapFound,
    llmsTxt,
    llmsStatus,
    notableHeaders,
    errors,
  };
}
