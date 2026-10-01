import type { CrawlResult, PageSnapshot } from "./crawl.js";
import type { AuditDepth, Finding, GeoAnswer, Measurement, SiteConfig, Stat } from "../types.js";
import { depthProfile, type RulePack } from "../depth.js";

export type SearchIntent = "informational" | "commercial" | "transactional" | "navigational";

const CTA_RE =
  /contact|book|demo|pricing|quote|call|get started|talk to|kapcsolat|ajánlat|ajanlat|foglal|beszél|beszel/i;
const TRUST_RE =
  /@|tel:|\+\d|founded|since 20|testimonial|clients include|address|utca|street|kft|ltd|gmbh/i;
const ARTICLE_RE = /\/(blog|blogs|article|articles|news|posts|guide|guides|tudastar|tudas)(\/|$)/i;
const THIN_SKIP_RE = /privacy|adatkez|impressum|legal|cookie|terms/i;

export function classifyIntent(url: string, title: string, h1: string): SearchIntent {
  const blob = `${url} ${title} ${h1}`.toLowerCase();
  if (/contact|book-a-call|pricing|cart|checkout|\/demo|kapcsolat|ajanlat|ajánlat/.test(blob)) {
    return "transactional";
  }
  if (/\/(blog|blogs|article|articles|guide|guides|news)\b|what is|how to|mi az|jelentése|jelentese/.test(blob)) {
    return "informational";
  }
  if (/service|product|solution|platform|szolgaltatas|szolgáltatás/.test(blob)) return "commercial";
  return "navigational";
}

function finding(partial: Omit<Finding, "evidence" | "relatedUrls" | "artifacts"> & Partial<Finding>): Finding {
  return {
    evidence: [],
    relatedUrls: [],
    artifacts: [],
    ...partial,
  };
}

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return path;
  } catch {
    return url;
  }
}

function indexable(p: PageSnapshot): boolean {
  return p.status >= 200 && p.status < 400 && !p.robotsMeta?.toLowerCase().includes("noindex");
}

export function extraFindings(input: {
  site: SiteConfig;
  crawl: CrawlResult;
  depth: AuditDepth;
  measurement: Measurement;
  geoAnswers: GeoAnswer[];
}): { findings: Finding[]; alreadyDoneWell: string[]; stats: Stat[]; appendix: Array<{ title: string; kind: "pre" | "markdown" | "json"; content: string }> } {
  const packs = new Set<RulePack>(depthProfile(input.depth).packs);
  const findings: Finding[] = [];
  const alreadyDoneWell: string[] = [];
  const stats: Stat[] = [];
  const appendix: Array<{ title: string; kind: "pre" | "markdown" | "json"; content: string }> = [];
  const { site, crawl, measurement } = input;
  const pages = crawl.pages.filter((p) => p.status >= 200 && p.status < 400);
  const home = pages.find((p) => pathOf(p.url) === "/") ?? pages[0];

  if (packs.has("standard")) {
    standardRules({ site, crawl, pages, home, findings, alreadyDoneWell, stats });
  }
  if (packs.has("deep")) {
    deepRules({ site, crawl, pages, home, measurement, geoAnswers: input.geoAnswers, findings, alreadyDoneWell, stats, appendix });
  } else if (packs.has("standard")) {
    geoSheet({ site, geoAnswers: input.geoAnswers, pages, findings, appendix, repeat: false });
  }

  return { findings, alreadyDoneWell, stats, appendix };
}

function standardRules(ctx: {
  site: SiteConfig;
  crawl: CrawlResult;
  pages: PageSnapshot[];
  home: PageSnapshot | undefined;
  findings: Finding[];
  alreadyDoneWell: string[];
  stats: Stat[];
}) {
  const { site, crawl, pages, home, findings, alreadyDoneWell } = ctx;
  const live = pages.filter(indexable);

  const byTitle = new Map<string, string[]>();
  for (const p of live) {
    const title = (p.title ?? "").trim();
    if (!title) continue;
    const list = byTitle.get(title) ?? [];
    list.push(p.url);
    byTitle.set(title, list);
  }
  const dupes = [...byTitle.entries()].filter(([, urls]) => urls.length > 1);
  if (dupes.length) {
    findings.push(
      finding({
        id: `${site.id}-duplicate-titles`,
        priority: "IMPORTANT",
        level: "P1",
        category: "technical",
        title: "Duplicate titles",
        effort: "1 h",
        what: `${dupes.length} title(s) are shared by more than one indexable URL. Example: "${dupes[0]![0]}" on ${dupes[0]![1].slice(0, 3).join(", ")}.`,
        why: "Shared titles make the pages compete and give search and AI systems no way to tell them apart.",
        fix: "Give every indexable URL a title that states that page's intent.",
        evidence: dupes.slice(0, 6).map(([title, urls]) => `${title} → ${urls.length}`),
        agentAction: { type: "edit_html_meta" },
      }),
    );
  }

  const thin = live.filter((p) => p.wordCount > 0 && p.wordCount < 80 && !THIN_SKIP_RE.test(p.url));
  if (thin.length) {
    findings.push(
      finding({
        id: `${site.id}-thin-pages`,
        priority: "IMPORTANT",
        level: "P1",
        category: "content_keywords",
        title: "Thin indexable pages",
        effort: "1–2 h",
        what: `${thin.length} indexable page(s) have under 80 words. Examples: ${thin.slice(0, 4).map((p) => `${p.url} (${p.wordCount})`).join("; ")}.`,
        why: "Thin URLs rarely match a search intent and dilute the crawl.",
        fix: "Expand the page into a real answer, merge it into a stronger URL, or noindex it.",
        relatedUrls: thin.slice(0, 6).map((p) => p.url),
        agentAction: { type: "edit_copy" },
      }),
    );
  }

  const articles = live.filter((p) => ARTICLE_RE.test(p.url));
  const unsigned = articles.filter((p) => !p.hasDate || !p.hasAuthor);
  if (unsigned.length) {
    findings.push(
      finding({
        id: `${site.id}-article-trust`,
        priority: "IMPORTANT",
        level: "P1",
        category: "content_keywords",
        title: "Dates and an author on articles",
        effort: "1 h",
        what: `${unsigned.length} article URL(s) are missing a visible date, an author, or both.`,
        why: "Search and AI systems use a date and a named author to judge whether a technical page is current.",
        fix: "Show the author and a publish date under the title, and mark them up as BlogPosting.",
        relatedUrls: unsigned.slice(0, 6).map((p) => p.url),
        agentAction: { type: "edit_html_meta" },
      }),
    );
  }

  const missingAlt = live.reduce((n, p) => n + p.imagesMissingAlt, 0);
  if (missingAlt > 0) {
    findings.push(
      finding({
        id: `${site.id}-image-alt`,
        priority: "NICE_TO_HAVE",
        level: "P2",
        category: "technical",
        title: "Images without alt text",
        effort: "30 min",
        what: `${missingAlt} image(s) have an empty or missing alt attribute.`,
        why: "Alt text is how search and assistive tech read an image. Decorative images should use an empty alt on purpose, not by accident.",
        fix: "Write a short alt for informative images. Leave alt=\"\" only when the image is decorative.",
        agentAction: { type: "edit_html_meta" },
      }),
    );
  }

  const headers = crawl.notableHeaders["home"] ?? {};
  const required = ["strict-transport-security", "content-security-policy", "x-content-type-options"];
  const missingHeaders = required.filter((h) => !headers[h]);
  if (Object.keys(headers).length && missingHeaders.length) {
    findings.push(
      finding({
        id: `${site.id}-security-headers`,
        priority: "NICE_TO_HAVE",
        level: "P2",
        category: "technical",
        title: "Security headers",
        effort: "30 min",
        what: `The homepage response is missing: ${missingHeaders.join(", ")}.`,
        why: "These headers are not a ranking factor, but a consultancy site that talks about trust should send them.",
        fix: "Set HSTS, a content-security policy, and X-Content-Type-Options on HTML responses.",
        agentAction: { type: "configure_headers" },
      }),
    );
  } else if (Object.keys(headers).length) {
    alreadyDoneWell.push("Homepage sends HSTS, CSP, and X-Content-Type-Options.");
  }

  const unlinkedArticles = articles.filter((p) => {
    const hrefs = p.internalLinks.join(" ").toLowerCase();
    return !CTA_RE.test(hrefs) && !/\/(services|service|contact|pricing|work)/i.test(hrefs);
  });
  if (unlinkedArticles.length) {
    findings.push(
      finding({
        id: `${site.id}-internal-links`,
        priority: "IMPORTANT",
        level: "P1",
        category: "content_keywords",
        title: "Articles do not link to a commercial page",
        effort: "1 h",
        what: `${unlinkedArticles.length} article(s) have no internal link toward a service, pricing, or contact URL.`,
        why: "That link tells search which URL answers the commercial query, and it moves the reader toward an enquiry.",
        fix: "End each article with one sentence and a link to the matching service or contact page.",
        relatedUrls: unlinkedArticles.slice(0, 6).map((p) => p.url),
        agentAction: { type: "edit_copy" },
      }),
    );
  }

  if (crawl.llmsTxt && site.brandNames.length) {
    const text = crawl.llmsTxt;
    const namesBrand = site.brandNames.some((b) => text.toLowerCase().includes(b.toLowerCase()));
    const statesLimit = /does not|don't|do not|nem |not a /i.test(text);
    if (!namesBrand || text.trim().length < 280 || !statesLimit) {
      findings.push(
        finding({
          id: `${site.id}-llms-quality`,
          priority: "IMPORTANT",
          level: "P1",
          category: "geo_ai",
          title: "llms.txt does not state the entity clearly",
          effort: "30 min",
          what: `llms.txt is ${text.trim().length} characters.${namesBrand ? "" : " It does not contain the brand name."}${statesLimit ? "" : " It does not say what the organisation does not do."}`,
          why: "A short file with the legal name, place, founder, offer, and an explicit limit is what assistants can quote. The file is an aid, not a ranking factor.",
          fix: "Rewrite the opening paragraph so it can stand alone: who, where, founder, what you do, what you do not do. Then list the key URLs.",
          agentAction: { type: "add_file", target: "llms.txt" },
        }),
      );
    } else {
      alreadyDoneWell.push("llms.txt names the brand and states a limit.");
    }
  }

  const canonicalMismatch = live.filter((p) => {
    if (!p.canonical) return false;
    try {
      return pathOf(p.canonical) !== pathOf(p.url);
    } catch {
      return false;
    }
  });
  if (canonicalMismatch.length) {
    findings.push(
      finding({
        id: `${site.id}-canonical-mismatch`,
        priority: "IMPORTANT",
        level: "P1",
        category: "technical",
        title: "Canonical points at a different URL",
        effort: "30–60 min",
        what: `${canonicalMismatch.length} indexable URL(s) declare a canonical path that is not their own. Example: ${canonicalMismatch[0]!.url} → ${canonicalMismatch[0]!.canonical}.`,
        why: "A 200 with a foreign canonical is how soft duplicates and old URLs survive a redesign.",
        fix: "Self-canonical the URL that should rank. Redirect the one that should not.",
        relatedUrls: canonicalMismatch.slice(0, 6).map((p) => p.url),
        agentAction: { type: "edit_html_meta" },
      }),
    );
  }

  if (home) {
    const ctaBlob = `${home.linkTexts.join(" ")} ${home.excerpt} ${home.formActions.join(" ")}`;
    if (!CTA_RE.test(ctaBlob) && home.formActions.length === 0) {
      findings.push(
        finding({
          id: `${site.id}-homepage-cta`,
          priority: "IMPORTANT",
          level: "P1",
          category: "conversion",
          title: "Homepage has no clear next step",
          effort: "30 min",
          what: "The homepage text and links do not show a contact, booking, demo, or pricing action.",
          why: "Search and AI traffic still has to land on a page that asks for the next step.",
          fix: "Put one primary action above the fold and repeat it after the proof.",
          relatedUrls: [home.url],
          agentAction: { type: "edit_copy", target: "homepage" },
        }),
      );
    }
    if (home.excerpt && !TRUST_RE.test(`${home.excerpt} ${home.linkTexts.join(" ")} ${JSON.stringify(home.jsonLd)}`)) {
      findings.push(
        finding({
          id: `${site.id}-trust-signals`,
          priority: "IMPORTANT",
          level: "P1",
          category: "conversion",
          title: "Homepage does not show a checkable trust signal",
          effort: "30–60 min",
          what: "The opening text has no email, phone, address, legal form, founding year, or named client proof.",
          why: "Visitors and AI answers both look for a concrete fact they can verify.",
          fix: "Add one line a stranger can check: legal name, place, year, and a way to reach a person.",
          relatedUrls: [home.url],
          agentAction: { type: "edit_copy", target: "homepage" },
        }),
      );
    }
    if (home.cmp && home.trackers.length) {
      findings.push(
        finding({
          id: `${site.id}-consent-measurement`,
          priority: "CHECK",
          level: "P2",
          category: "measurement",
          title: "Consent mode may hide conversions",
          effort: "30 min",
          what: `A consent tool (${home.cmp}) is present alongside analytics tags (${home.trackers.join(", ")}).`,
          why: "If tags wait for consent, the baseline used to judge this audit will undercount.",
          fix: "Confirm analytics still records landing page and key events after a realistic consent choice.",
          agentAction: { type: "manual_check" },
        }),
      );
    } else if (!home.trackers.length) {
      findings.push(
        finding({
          id: `${site.id}-no-analytics-snippet`,
          priority: "CHECK",
          level: "P1",
          category: "measurement",
          title: "No analytics snippet on the homepage",
          effort: "30 min",
          what: "The homepage HTML does not reference a common analytics tag.",
          why: "Without a measurement baseline, later ranking work has no success metric.",
          fix: "Confirm analytics is loaded (it may be injected after consent) and that someone can read landing-page conversions.",
          agentAction: { type: "manual_check" },
        }),
      );
    }
  }

  const intentGroups = new Map<SearchIntent, PageSnapshot[]>();
  for (const p of live) {
    const intent = classifyIntent(p.url, p.title ?? "", p.h1[0] ?? "");
    const list = intentGroups.get(intent) ?? [];
    list.push(p);
    intentGroups.set(intent, list);
  }
  const commercial = [...(intentGroups.get("commercial") ?? []), ...(intentGroups.get("transactional") ?? [])];
  const noAction = commercial.filter((p) => p.formActions.length === 0 && !CTA_RE.test(p.linkTexts.join(" ")));
  if (noAction.length) {
    findings.push(
      finding({
        id: `${site.id}-intent-without-action`,
        priority: "IMPORTANT",
        level: "P1",
        category: "conversion",
        title: "Commercial pages have no next step",
        effort: "1 h",
        what: `${noAction.length} service or contact URL(s) do not show a form or a contact-style link.`,
        why: "These are the URLs a search for the offer should land on. Intent without an action wastes the visit.",
        fix: "Match each commercial URL to one intent, and put the matching action on the page.",
        evidence: noAction.slice(0, 6).map((p) => `${classifyIntent(p.url, p.title ?? "", p.h1[0] ?? "")}: ${p.url}`),
        agentAction: { type: "edit_copy" },
      }),
    );
  }

  if (site.focusKeywords.length) {
    const blob = live.map((p) => `${p.title ?? ""} ${p.h1.join(" ")} ${p.excerpt}`).join(" \n ").toLowerCase();
    const missing = site.focusKeywords.filter((k) => !blob.includes(k.toLowerCase()));
    if (missing.length) {
      findings.push(
        finding({
          id: `${site.id}-keyword-on-page`,
          priority: "CONTEXT",
          level: "P1",
          category: "content_keywords",
          title: "Focus themes are absent from titles and openings",
          effort: "ongoing",
          what: `These configured themes do not appear in any crawled title, H1, or opening: ${missing.join(", ")}.`,
          why: "A theme that is not in the page is not a page yet. Volume data comes next, after the gap is visible.",
          fix: "Decide which theme is a real page with an intent, and which is only a way you describe the work.",
          evidence: missing,
          agentAction: { type: "create_content" },
        }),
      );
    }
  }
}

function deepRules(ctx: {
  site: SiteConfig;
  crawl: CrawlResult;
  pages: PageSnapshot[];
  home: PageSnapshot | undefined;
  measurement: Measurement;
  geoAnswers: GeoAnswer[];
  findings: Finding[];
  alreadyDoneWell: string[];
  stats: Stat[];
  appendix: Array<{ title: string; kind: "pre" | "markdown" | "json"; content: string }>;
}) {
  const { site, crawl, pages, measurement, findings, stats, appendix } = ctx;

  const chains = crawl.redirectChains.filter((c) => c.hops.length >= 3 || c.hops.some((h) => h.status === 302));
  if (chains.length) {
    findings.push(
      finding({
        id: `${site.id}-redirect-chains`,
        priority: "IMPORTANT",
        level: "P1",
        category: "technical",
        title: "Redirect chains or temporary redirects",
        effort: "1 h",
        what: `${chains.length} URL(s) hop more than once or return 302. Example: ${chains[0]!.hops.map((h) => `${h.status} ${h.url}`).join(" → ")}.`,
        why: "Chains waste crawl and drop equity. A 302 on a retired URL tells search the move is temporary.",
        fix: "Point each retired URL at its final target with a single 301.",
        evidence: chains.slice(0, 6).map((c) => c.hops.map((h) => String(h.status)).join("→")),
        agentAction: { type: "add_redirects" },
      }),
    );
  }

  const linked = new Set<string>();
  for (const p of pages) {
    for (const href of p.internalLinks) linked.add(pathOf(href));
  }
  const pageByPath = new Map(pages.map((p) => [pathOf(p.url), p]));
  const orphans = crawl.sitemapUrls.filter((u) => {
    const path = pathOf(u);
    if (path === "/") return false;
    if (!pageByPath.has(path)) return false;
    return !linked.has(path);
  });
  if (orphans.length) {
    findings.push(
      finding({
        id: `${site.id}-orphans`,
        priority: "IMPORTANT",
        level: "P1",
        category: "technical",
        title: "Sitemap URLs with no internal link",
        effort: "1 h",
        what: `${orphans.length} crawled sitemap URL(s) are not linked from any other crawled page.`,
        why: "Orphans are hard for people and crawlers to discover, and they often mark a template that was never wired into navigation.",
        fix: "Link them from a relevant hub, or remove them from the sitemap and noindex them.",
        relatedUrls: orphans.slice(0, 8),
        agentAction: { type: "edit_copy" },
      }),
    );
  }

  const depth = clickDepth(pages);
  const deepPages = [...depth.entries()].filter(([, d]) => d >= 4);
  if (deepPages.length) {
    findings.push(
      finding({
        id: `${site.id}-click-depth`,
        priority: "NICE_TO_HAVE",
        level: "P2",
        category: "technical",
        title: "Important URLs sit deep in the site",
        effort: "1–2 h",
        what: `${deepPages.length} crawled URL(s) are four or more clicks from the homepage.`,
        why: "Crawl attention and visitors both drop off after a few clicks.",
        fix: "Link commercial and article URLs from the homepage or a hub within three clicks.",
        evidence: deepPages.slice(0, 8).map(([url, d]) => `${d} clicks: ${url}`),
        agentAction: { type: "edit_copy" },
      }),
    );
  }

  const sitemapPaths = new Set(crawl.sitemapUrls.map(pathOf));
  const noindexInSitemap = pages.filter(
    (p) => sitemapPaths.has(pathOf(p.url)) && (p.robotsMeta?.toLowerCase().includes("noindex") || p.xRobotsTag?.toLowerCase().includes("noindex")),
  );
  if (noindexInSitemap.length) {
    findings.push(
      finding({
        id: `${site.id}-sitemap-noindex`,
        priority: "IMPORTANT",
        level: "P1",
        category: "technical",
        title: "Sitemap lists noindex URLs",
        effort: "30 min",
        what: `${noindexInSitemap.length} URL(s) are in the sitemap and also marked noindex.`,
        why: "The sitemap asks for indexing and the tag refuses it. Search Console will report the conflict.",
        fix: "Remove noindex URLs from the sitemap, or remove noindex from URLs that should rank.",
        relatedUrls: noindexInSitemap.slice(0, 8).map((p) => p.url),
        agentAction: { type: "add_file", target: "sitemap" },
      }),
    );
  }

  const parameterized = pages.filter((p) => indexable(p) && p.url.includes("?"));
  if (parameterized.length) {
    findings.push(
      finding({
        id: `${site.id}-parameter-urls`,
        priority: "NICE_TO_HAVE",
        level: "P2",
        category: "technical",
        title: "Indexable URLs carry query parameters",
        effort: "1 h",
        what: `${parameterized.length} indexable URL(s) include a query string.`,
        why: "Parameters for tracking, sort, or filters often create duplicates.",
        fix: "Canonical the clean URL, and keep parameters out of the sitemap.",
        relatedUrls: parameterized.slice(0, 6).map((p) => p.url),
        agentAction: { type: "edit_html_meta" },
      }),
    );
  }

  if (crawl.competitorPages.length) {
    findings.push(
      finding({
        id: `${site.id}-competitor-lead`,
        priority: "CONTEXT",
        level: "P1",
        category: "content_keywords",
        title: "What competing homepages lead with",
        effort: "—",
        what: crawl.competitorPages
          .map((c) => `${c.url}: ${c.h1[0] || c.title || "(no heading)"}`)
          .join(" · "),
        why: "The content gap is against the pages that already rank, not against a keyword list.",
        fix: "For each focus theme, open the ranking URL and note the intent it satisfies before writing.",
        relatedUrls: crawl.competitorPages.map((c) => c.url),
        agentAction: { type: "manual_check" },
      }),
    );
  }

  if (crawl.wikidataQuery) {
    if (crawl.wikidataHits.length === 0) {
      findings.push(
        finding({
          id: `${site.id}-wikidata`,
          priority: "IMPORTANT",
          level: "P1",
          category: "authority",
          title: "No Wikidata item for the brand",
          effort: "1–2 h",
          what: `A Wikidata search for "${crawl.wikidataQuery}" returned no item.`,
          why: "Knowledge panels and several AI systems lean on a stable entity, not only on the website.",
          fix: "If the organisation is notable enough, create one item with the legal name, official site, and same profiles the schema lists. Otherwise make those profiles consistent so a future item is unambiguous.",
          agentAction: { type: "manual_check" },
        }),
      );
    } else {
      findings.push(
        finding({
          id: `${site.id}-wikidata-hits`,
          priority: "CONTEXT",
          level: "P1",
          category: "authority",
          title: "Wikidata items that match the brand string",
          effort: "30 min",
          what: crawl.wikidataHits.map((h) => `${h.id} ${h.label}: ${h.description}`).join(" · "),
          why: "A namesake item is worse than no item. Confirm the hit is this organisation.",
          fix: "If it is this organisation, point sameAs at it. If it is a namesake, do not use that id.",
          evidence: crawl.wikidataHits.map((h) => `https://www.wikidata.org/wiki/${h.id}`),
          agentAction: { type: "manual_check" },
        }),
      );
    }
  }

  if (crawl.fieldVitals) {
    const v = crawl.fieldVitals;
    const poor: string[] = [];
    if (v.lcpMs != null && v.lcpMs > 2500) poor.push(`LCP ${v.lcpMs} ms`);
    if (v.inpMs != null && v.inpMs > 200) poor.push(`INP ${v.inpMs} ms`);
    if (v.cls != null && v.cls > 0.1) poor.push(`CLS ${v.cls}`);
    stats.push({
      value: v.lcpMs != null ? `${(v.lcpMs / 1000).toFixed(1)} s` : "—",
      label: `Field LCP p75 (${v.formFactor})`,
    });
    if (poor.length) {
      findings.push(
        finding({
          id: `${site.id}-field-vitals`,
          priority: "IMPORTANT",
          level: "P1",
          category: "technical",
          title: "Field Core Web Vitals are outside the good range",
          effort: "varies",
          what: `Chrome UX Report (${v.formFactor}): ${poor.join(", ")}.`,
          why: "Field data is what real users hit. A lab score of 100 can still hide a slow origin.",
          fix: "Treat the failing metric as the performance task. Re-check the same origin after the change.",
          agentAction: { type: "other", notes: "Field CWV" },
        }),
      );
    } else if (v.lcpMs != null) {
      ctx.alreadyDoneWell.push(`Field Core Web Vitals on ${v.formFactor} are in the good range.`);
    }
  } else {
    findings.push(
      finding({
        id: `${site.id}-field-vitals-missing`,
        priority: "CHECK",
        level: "P2",
        category: "technical",
        title: "Field Core Web Vitals were not queried",
        effort: "15 min",
        what: "No Chrome UX Report sample was attached to this run.",
        why: "Lab Lighthouse is not a substitute for field LCP, INP, and CLS.",
        fix: "Set CRUX_API_KEY and re-run at deep, or paste the CrUX origin numbers into the report.",
        agentAction: { type: "manual_check" },
      }),
    );
  }

  if (measurement.queries.length) {
    const top = [...measurement.queries].sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0)).slice(0, 5);
    stats.push({
      value: String(measurement.queries.length),
      label: "Search Console queries in the baseline",
    });
    findings.push(
      finding({
        id: `${site.id}-query-baseline`,
        priority: "CONTEXT",
        level: "P1",
        category: "measurement",
        title: "Search baseline",
        effort: "—",
        what: top
          .map((q) => `${q.query} (${q.impressions ?? "?"} impressions, pos ${q.position ?? "?"})`)
          .join("; "),
        why: "Recommendations should protect queries that already earn impressions.",
        fix: "Keep these URLs stable. Re-check the same queries after the changes.",
        evidence: top.map((q) => q.query),
        agentAction: { type: "manual_check" },
      }),
    );
  } else if (!measurement.searchConsole) {
    findings.push(
      finding({
        id: `${site.id}-no-search-baseline`,
        priority: "IMPORTANT",
        level: "P1",
        category: "measurement",
        title: "No search baseline",
        effort: "30 min",
        what: "This deep review has no Search Console queries and searchConsole access is not confirmed.",
        why: "Without impressions and the pages that earn them, a redesign can remove the only URLs that rank.",
        fix: "Confirm a Domain property, export the top queries and landing pages, and paste them into measurement.queries before treating the plan as final.",
        agentAction: { type: "submit_gsc" },
      }),
    );
  }

  const deadLandings = measurement.landingPages.filter((p) => (p.sessions ?? 0) >= 30 && (p.conversions ?? 0) === 0);
  if (deadLandings.length) {
    findings.push(
      finding({
        id: `${site.id}-landing-conversions`,
        priority: "IMPORTANT",
        level: "P1",
        category: "conversion",
        title: "Landing pages with visits and no conversions",
        effort: "2–4 h",
        what: deadLandings
          .slice(0, 5)
          .map((p) => `${p.url} (${p.sessions} sessions)`)
          .join("; "),
        why: "These URLs already receive demand. The gap is the page, not the crawl.",
        fix: "Check the promise above the fold against the query that lands here, then the action and the proof.",
        relatedUrls: deadLandings.map((p) => p.url),
        agentAction: { type: "edit_copy" },
      }),
    );
  }

  if (measurement.botPaths.length) {
    const missing = measurement.botPaths.filter((p) => {
      const hit = pages.find((page) => pathOf(page.url) === pathOf(p));
      return hit ? hit.status === 404 || hit.status === 0 : true;
    });
    if (missing.length) {
      findings.push(
        finding({
          id: `${site.id}-bot-log`,
          priority: "IMPORTANT",
          level: "P1",
          category: "technical",
          title: "Bot log requests URLs the crawl does not return",
          effort: "1 h",
          what: `${missing.length} logged path(s) are missing or 404 in this crawl. Examples: ${missing.slice(0, 6).join(", ")}.`,
          why: "That is what the crawler actually asked for, which a sitemap sample can miss.",
          fix: "301 the ones that moved. Let the junk 404. Do not put them back into the sitemap.",
          evidence: missing.slice(0, 12),
          agentAction: { type: "add_redirects" },
        }),
      );
    }
  }

  if (!measurement.owner) {
    findings.push(
      finding({
        id: `${site.id}-owner`,
        priority: "CHECK",
        level: "P2",
        category: "ops_checklist",
        title: "Name an owner for the findings",
        effort: "10 min",
        what: "measurement.owner is empty.",
        why: "A review with no owner stays a list.",
        fix: "Set the person who can change the site, Search Console, and analytics.",
        agentAction: { type: "manual_check" },
      }),
    );
  }

  geoSheet({ site, geoAnswers: ctx.geoAnswers, pages, findings, appendix, repeat: true });
}

function geoSheet(ctx: {
  site: SiteConfig;
  geoAnswers: GeoAnswer[];
  pages: PageSnapshot[];
  findings: Finding[];
  appendix: Array<{ title: string; kind: "pre" | "markdown" | "json"; content: string }>;
  repeat: boolean;
}) {
  const { site, findings, appendix, pages } = ctx;
  if (!site.geoQuestions.length && !ctx.geoAnswers.length) return;
  const engines = ["chatgpt", "perplexity", "ai_overview", "copilot"] as const;
  const mine = ctx.geoAnswers;
  if (mine.length) {
    const citedMissing = mine.flatMap((a) =>
      a.citedUrls.filter((u) => {
        const hit = pages.find((p) => pathOf(p.url) === pathOf(u));
        return hit ? hit.status === 404 || hit.status === 0 : false;
      }),
    );
    findings.push(
      finding({
        id: `${site.id}-geo-answers`,
        priority: "CONTEXT",
        level: "P1",
        category: "geo_ai",
        title: "What AI search said in this run",
        effort: ctx.repeat ? "re-check in 2–4 weeks" : "—",
        what: mine
          .map((a) => `${a.engine}: ${a.liftedSentence || a.answer.slice(0, 180)}`)
          .join(" · "),
        why: "One answer is a sample. The useful check is whether the cited URL is live and whether the lifted sentence matches the positioning.",
        fix: citedMissing.length
          ? `These cited URLs 404 in the crawl: ${citedMissing.join(", ")}. Redirect them, then run the same questions again.`
          : "Keep the same questions and engines. Compare the lifted sentence to the first lines of the site.",
        evidence: mine.flatMap((a) => a.citedUrls),
        agentAction: { type: "manual_check" },
      }),
    );
    return;
  }

  const lines = site.geoQuestions.flatMap((q) =>
    engines.map((engine) => `- [${engine}] ${q}\n  answer:\n  lifted sentence:\n  cited URLs:`),
  );
  appendix.push({
    title: `AI search probe (${site.name})`,
    kind: "pre",
    content: lines.join("\n"),
  });
  findings.push(
    finding({
      id: `${site.id}-geo-checks`,
      priority: "CHECK",
      level: "P1",
      category: "geo_ai",
      title: "Record AI search across four engines",
      effort: ctx.repeat ? "45 min, then again in 2–4 weeks" : "45 min",
      what: `Questions to ask in ChatGPT, Perplexity, Google AI Overview, and Copilot: ${site.geoQuestions.join(" · ")}.`,
      why: "The engines disagree, and a single answer goes stale after the site changes.",
      fix: "Paste each answer into geoAnswers (engine, question, answer, citedUrls, liftedSentence). Re-run the same sheet after the fixes.",
      artifacts: [{ name: "geo-probe.txt", kind: "checklist", content: lines.join("\n") }],
      agentAction: { type: "manual_check" },
    }),
  );
}

export function clickDepth(pages: PageSnapshot[]): Map<string, number> {
  const byPath = new Map<string, PageSnapshot>();
  for (const p of pages) byPath.set(pathOf(p.url), p);
  const home = pages.find((p) => pathOf(p.url) === "/") ?? pages[0];
  const depth = new Map<string, number>();
  if (!home) return depth;
  const queue: Array<{ path: string; d: number }> = [{ path: pathOf(home.url), d: 0 }];
  depth.set(pathOf(home.url), 0);
  while (queue.length) {
    const current = queue.shift()!;
    const page = byPath.get(current.path);
    if (!page) continue;
    for (const href of page.internalLinks) {
      const path = pathOf(href);
      if (depth.has(path) || !byPath.has(path)) continue;
      depth.set(path, current.d + 1);
      queue.push({ path, d: current.d + 1 });
    }
  }
  return depth;
}
