import { fetchPage, traceRedirects } from "../http.js";
import { snapshotFromHtml, type CrawlResult, type FieldVitals, type WikidataHit } from "./crawl.js";
import type { SiteConfig } from "../types.js";

/** Network lookups used only at deep: competitors, Wikidata, field vitals, www/apex. */
export async function enrichDeep(site: SiteConfig, crawl: CrawlResult): Promise<void> {
  await traceHostVariant(site, crawl);
  await fetchCompetitors(site, crawl);
  await searchWikidata(site, crawl);
  await fetchFieldVitals(site, crawl);
}

async function traceHostVariant(site: SiteConfig, crawl: CrawlResult): Promise<void> {
  try {
    const url = new URL(site.url);
    const host = url.hostname.replace(/^www\./, "");
    const altHost = url.hostname.startsWith("www.") ? host : `www.${host}`;
    const alt = `${url.protocol}//${altHost}/`;
    const hops = await traceRedirects(alt);
    if (hops.length) crawl.redirectChains.push({ from: alt, hops });
  } catch (e) {
    crawl.errors.push(`www/apex: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function fetchCompetitors(site: SiteConfig, crawl: CrawlResult): Promise<void> {
  for (const raw of site.competitors.slice(0, 3)) {
    try {
      const res = await fetchPage(raw, { timeoutMs: 15_000 });
      if (!res.ok || !res.body) continue;
      const snap = snapshotFromHtml(res.finalUrl || raw, res.status, res.body);
      crawl.competitorPages.push({ url: raw, title: snap.title, h1: snap.h1 });
    } catch (e) {
      crawl.errors.push(`competitor ${raw}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

async function searchWikidata(site: SiteConfig, crawl: CrawlResult): Promise<void> {
  const query = site.brandNames[0] ?? site.legalName ?? site.name;
  crawl.wikidataQuery = query;
  const endpoint = new URL("https://www.wikidata.org/w/api.php");
  endpoint.searchParams.set("action", "wbsearchentities");
  endpoint.searchParams.set("search", query);
  endpoint.searchParams.set("language", site.language || "en");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("limit", "5");
  try {
    const res = await fetchPage(endpoint.toString(), { timeoutMs: 15_000 });
    if (!res.ok) return;
    const data = JSON.parse(res.body) as { search?: Array<{ id?: string; label?: string; description?: string }> };
    const hits: WikidataHit[] = (data.search ?? [])
      .filter((h) => h.id && h.label)
      .map((h) => ({ id: h.id!, label: h.label!, description: h.description ?? "" }));
    crawl.wikidataHits = hits;
  } catch (e) {
    crawl.errors.push(`wikidata: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function fetchFieldVitals(site: SiteConfig, crawl: CrawlResult): Promise<void> {
  const key = process.env.CRUX_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return;
  const origin = new URL(site.url).origin;
  try {
    const res = await fetch(
      `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ origin, formFactor: "PHONE" }),
      },
    );
    if (!res.ok) {
      crawl.errors.push(`crux: HTTP ${res.status}`);
      return;
    }
    const data = (await res.json()) as {
      record?: { metrics?: Record<string, { percentiles?: { p75?: number } }> };
    };
    const metrics = data.record?.metrics ?? {};
    const vitals: FieldVitals = {
      lcpMs: metrics.largest_contentful_paint?.percentiles?.p75 ?? null,
      inpMs: metrics.interaction_to_next_paint?.percentiles?.p75 ?? null,
      cls: metrics.cumulative_layout_shift?.percentiles?.p75 ?? null,
      formFactor: "PHONE",
    };
    crawl.fieldVitals = vitals;
  } catch (e) {
    crawl.errors.push(`crux: ${e instanceof Error ? e.message : String(e)}`);
  }
}
