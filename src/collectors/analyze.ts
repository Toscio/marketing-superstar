import type { CrawlResult, PageSnapshot } from "./crawl.js";
import type { Finding, SiteConfig, Stat } from "../types.js";

function jsonLdTypes(nodes: unknown[]): string[] {
  const types = new Set<string>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (obj["@type"]) {
      const t = obj["@type"];
      if (Array.isArray(t)) t.forEach((x) => types.add(String(x)));
      else types.add(String(t));
    }
    if (Array.isArray(obj["@graph"])) obj["@graph"].forEach(walk);
    for (const v of Object.values(obj)) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") walk(v);
    }
  };
  nodes.forEach(walk);
  return [...types];
}

function hasOrganization(nodes: unknown[]): boolean {
  return jsonLdTypes(nodes).some((t) =>
    ["Organization", "ProfessionalService", "LocalBusiness", "Corporation"].includes(t),
  );
}

function findMailtoForms(pages: PageSnapshot[]): string[] {
  const hits: string[] = [];
  for (const p of pages) {
    for (const action of p.formActions) {
      if (action.toLowerCase().startsWith("mailto:")) hits.push(`${p.url} → ${action}`);
    }
  }
  return hits;
}

export type AnalysisBundle = {
  stats: Stat[];
  alreadyDoneWell: string[];
  findings: Finding[];
  appendix: Array<{ title: string; kind: "pre" | "markdown" | "json"; content: string }>;
};

export function analyzeSite(site: SiteConfig, crawl: CrawlResult): AnalysisBundle {
  const findings: Finding[] = [];
  const alreadyDoneWell: string[] = [];
  const appendix: AnalysisBundle["appendix"] = [];
  const pages = crawl.pages;
  const okPages = pages.filter((p) => p.status >= 200 && p.status < 400);
  const home =
    okPages.find((p) => new URL(p.url).pathname === "/" || p.url === site.url) ?? okPages[0];

  const indexable = okPages.filter(
    (p) => !p.robotsMeta?.toLowerCase().includes("noindex"),
  );

  // --- Stats ---
  const stats: Stat[] = [
    {
      value: String(okPages.length),
      label: `pages crawled successfully (of ${pages.length})`,
    },
    {
      value: crawl.sitemapFound
        ? crawl.sitemapUrls.length
          ? String(crawl.sitemapUrls.length)
          : "index only"
        : "none",
      label: "URLs discovered via sitemap",
    },
    {
      value: crawl.llmsStatus === 200 && crawl.llmsTxt ? "yes" : "missing",
      label: "llms.txt",
    },
    {
      value: home?.title ? "yes" : "no",
      label: "homepage title present",
    },
  ];

  // --- robots / sitemap ---
  const robotsHasSitemap = Boolean(crawl.robotsTxt?.match(/^\s*Sitemap:/im));
  if (!crawl.sitemapFound) {
    findings.push({
      id: `${site.id}-sitemap-missing`,
      priority: "BLOCKER",
      level: "P0",
      category: "pre_launch",
      title: "Publish a sitemap and point robots.txt at it",
      effort: "30 min",
      what: `${site.name} has no discoverable XML sitemap (checked common paths and robots.txt). robots.txt ${crawl.robotsStatus === 200 ? "exists" : "is missing"}${robotsHasSitemap ? " and already references a Sitemap line" : " but has no Sitemap: line"}.`,
      why: "A sitemap is how Google and AI crawlers learn the URL set quickly, especially after a redesign or launch.",
      fix: "Generate a sitemap (e.g. @astrojs/sitemap or equivalent), serve it at /sitemap-index.xml or /sitemap.xml, and add `Sitemap: <absolute-url>` to robots.txt. Submit it in Search Console after launch.",
      evidence: [
        `robots status: ${crawl.robotsStatus}`,
        `sitemap URL count: ${crawl.sitemapUrls.length}`,
      ],
      relatedUrls: [new URL("/robots.txt", site.url).toString()],
      artifacts: [],
      agentAction: {
        type: "add_file",
        target: "robots.txt + sitemap",
        notes: "Ensure Sitemap: line uses the production absolute URL.",
      },
    });
  } else if (!robotsHasSitemap) {
    findings.push({
      id: `${site.id}-robots-sitemap-line`,
      priority: "IMPORTANT",
      level: "P1",
      category: "technical",
      title: "Add Sitemap line to robots.txt",
      effort: "5 min",
      what: `A sitemap was found (${Object.keys(crawl.sitemapBodies)[0]}), but robots.txt does not declare it.`,
      why: "Crawlers that start at robots.txt will miss the sitemap.",
      fix: `Add: Sitemap: ${Object.keys(crawl.sitemapBodies)[0]}`,
      evidence: [],
      relatedUrls: [new URL("/robots.txt", site.url).toString()],
      artifacts: [],
      agentAction: { type: "edit_html_meta", target: "robots.txt" },
    });
  } else if (!crawl.sitemapUrls.length) {
    findings.push({
      id: `${site.id}-sitemap-children`,
      priority: "IMPORTANT",
      level: "P1",
      category: "technical",
      title: "Sitemap index exists but child URLs did not resolve",
      effort: "30 min",
      what: `A sitemap index was fetched, but no URL entries were collected from child sitemaps. Child <loc> values may still point at the old host.`,
      why: "An empty or broken child sitemap delays discovery of new pages after launch.",
      fix: "Point sitemap child locs at the live host under audit, or generate a single urlset sitemap.",
      evidence: Object.keys(crawl.sitemapBodies).slice(0, 5),
      relatedUrls: Object.keys(crawl.sitemapBodies).slice(0, 3),
      artifacts: [],
      agentAction: { type: "add_file", target: "sitemap" },
    });
  } else {
    alreadyDoneWell.push("Sitemap discoverable and referenced from robots.txt.");
  }

  // --- llms.txt ---
  if (!(crawl.llmsStatus === 200 && crawl.llmsTxt)) {
    findings.push({
      id: `${site.id}-llms-txt`,
      priority: "BLOCKER",
      level: "P0",
      category: "geo_ai",
      title: "Publish llms.txt",
      effort: "30 min",
      what: `/llms.txt ${crawl.llmsStatus === 404 ? "returns 404" : crawl.llmsStatus ? `returned ${crawl.llmsStatus}` : "could not be fetched"}.`,
      why: "A short, human-readable summary helps AI crawlers and assistants cite the right entity, especially when repositioning or launching.",
      fix: "Write public/llms.txt by hand: one paragraph on who the organisation is (legal name, place, founder, what it does and does not do), then links to key pages with one-line summaries.",
      evidence: [`llms status: ${crawl.llmsStatus}`],
      relatedUrls: [new URL("/llms.txt", site.url).toString()],
      artifacts: [
        {
          name: "starter-llms.txt",
          kind: "llms_txt",
          content: starterLlmsTxt(site, okPages),
        },
      ],
      agentAction: { type: "add_file", target: "public/llms.txt" },
    });
  } else {
    alreadyDoneWell.push("Hand-served llms.txt is present.");
  }

  // --- staging noindex ---
  if (site.stagingUrl) {
    const stagingHost = new URL(site.stagingUrl).hostname;
    const stagingHome = home && new URL(home.url).hostname === stagingHost ? home : null;
    const xRobots =
      crawl.notableHeaders["home"]?.["x-robots-tag"] ||
      crawl.notableHeaders["llms.txt"]?.["x-robots-tag"] ||
      "";
    const headerNoindex = /noindex/i.test(xRobots);
    const metaNoindex = Boolean(stagingHome?.robotsMeta?.toLowerCase().includes("noindex"));
    if (stagingHome && !headerNoindex && !metaNoindex) {
      findings.push({
        id: `${site.id}-staging-noindex`,
        priority: "BLOCKER",
        level: "P0",
        category: "pre_launch",
        title: "Keep the staging host out of the index",
        effort: "15 min",
        what: `Staging host ${stagingHost} appears indexable (no noindex meta and no X-Robots-Tag: noindex on the checked response).`,
        why: "A canonical is a hint, not a rule. If anyone links to staging, Google may index it as a duplicate, and AI crawlers often ignore canonicals.",
        fix: "Send `X-Robots-Tag: noindex` only when the request host is the staging host (Worker rule or Cloudflare Transform Rule). Do not put noindex in HTML that ships to production.",
        evidence: [`staging: ${site.stagingUrl}`, `x-robots-tag: ${xRobots || "(absent)"}`],
        relatedUrls: [site.stagingUrl],
        artifacts: [],
        agentAction: { type: "configure_headers", target: stagingHost },
      });
    } else if (headerNoindex || metaNoindex) {
      alreadyDoneWell.push(
        `Staging host sends noindex (${headerNoindex ? "X-Robots-Tag" : "meta robots"}).`,
      );
    }
  }

  // --- Old URL 404s ---
  if (site.knownOldUrls.length) {
    const rewriteBase = site.stagingUrl ?? site.url;
    const missing = pages.filter(
      (p) =>
        site.knownOldUrls.some(
          (old) => p.url.includes(old) || normalizeEnds(p.url).endsWith(normalizeEnds(old)),
        ) &&
        (p.status === 404 || p.status === 0),
    );
    const brokenListed = site.knownOldUrls.filter((old) => {
      const hit = pages.find((p) => pathsRoughlyMatch(p.url, old, rewriteBase));
      return hit && (hit.status === 404 || hit.status === 0);
    });
    if (brokenListed.length || missing.length) {
      const list = brokenListed.length ? brokenListed : site.knownOldUrls;
      findings.push({
        id: `${site.id}-redirect-old-urls`,
        priority: "BLOCKER",
        level: "P0",
        category: "pre_launch",
        title: "Redirect the old URLs",
        effort: "1–2 h",
        what: `${list.length} known legacy URL(s) need permanent redirects (301) onto the current IA. Examples: ${list.slice(0, 8).join(", ")}${list.length > 8 ? "…" : ""}`,
        why: "Without 301s, bookmarks, social posts and AI-answer citations become dead ends, and Google drops the URLs without passing value on.",
        fix: "Add a redirects file (or platform equivalent) with permanent 301s, one line per old URL. Keep it at least a year.",
        evidence: list.slice(0, 20),
        relatedUrls: list.slice(0, 10).map((p) => new URL(p, rewriteBase).toString()),
        artifacts: [
          {
            name: "redirect-map-stub",
            kind: "redirect_map",
            content: list.map((p) => `${p}  /  301`).join("\n"),
          },
        ],
        agentAction: { type: "add_redirects", target: "_redirects" },
      });
    }
  }

  // --- Titles / H1 ---
  const missingTitle = okPages.filter((p) => !p.title);
  const multiH1 = okPages.filter((p) => p.h1.length > 1);
  const noH1 = okPages.filter((p) => p.h1.length === 0);
  const missingDesc = okPages.filter((p) => !p.metaDescription);
  const missingCanon = okPages.filter((p) => !p.canonical);

  if (!missingTitle.length && !noH1.length && !missingCanon.length) {
    alreadyDoneWell.push("Unique titles, one H1 pattern, and canonicals look present on crawled pages.");
  }

  if (missingTitle.length || noH1.length || missingDesc.length) {
    findings.push({
      id: `${site.id}-meta-basics`,
      priority: missingTitle.length || noH1.length ? "IMPORTANT" : "NICE_TO_HAVE",
      level: missingTitle.length || noH1.length ? "P1" : "P2",
      category: "technical",
      title: "Fix titles, meta descriptions and H1s",
      effort: "1–2 h",
      what: [
        missingTitle.length ? `${missingTitle.length} page(s) missing <title>` : null,
        missingDesc.length ? `${missingDesc.length} page(s) missing meta description` : null,
        noH1.length ? `${noH1.length} page(s) with no H1` : null,
        multiH1.length ? `${multiH1.length} page(s) with multiple H1s` : null,
      ]
        .filter(Boolean)
        .join("; "),
      why: "Titles and a single clear H1 are the baseline for both classic SEO and AI citation snippets.",
      fix: "Give every indexable page a unique title, a meta description, and exactly one H1 that matches the page intent.",
      evidence: [...missingTitle, ...noH1].slice(0, 10).map((p) => p.url),
      relatedUrls: [...missingTitle, ...noH1].slice(0, 5).map((p) => p.url),
      artifacts: [],
      agentAction: { type: "edit_html_meta" },
    });
  } else if (!multiH1.length) {
    findings.push({
      id: `${site.id}-meta-good`,
      priority: "IN_GOOD_SHAPE",
      level: "P2",
      category: "technical",
      title: "Titles, descriptions, headings",
      effort: "No action",
      what: "Crawled pages have titles, meta descriptions, and a single H1.",
      why: "This is the technical baseline most consultancy sites still miss.",
      fix: "Keep the pattern as new pages are added.",
      evidence: [],
      relatedUrls: [],
      artifacts: [],
    });
  }

  // --- Schema / entity ---
  const allLd = okPages.flatMap((p) => p.jsonLd);
  const types = jsonLdTypes(allLd);
  if (!hasOrganization(allLd)) {
    findings.push({
      id: `${site.id}-org-schema`,
      priority: "FIRST",
      level: "P0",
      category: "entity_brand",
      title: "Add an Organization (or ProfessionalService) to the schema",
      effort: "1–2 h",
      what: types.length
        ? `JSON-LD is present (${types.slice(0, 8).join(", ")}) but there is no Organization / ProfessionalService entity for the business itself.`
        : "No JSON-LD structured data was found on crawled pages.",
      why: "Without an organisation entity, engines may treat the brand as a topic or confuse it with namesakes. AI assistants invent descriptions when the entity is unclear.",
      fix: `Add ProfessionalService (or Organization) with name, legalName${site.legalName ? ` ("${site.legalName}")` : ""}, url, address, founder, sameAs profile links, and knowsAbout.`,
      evidence: types,
      relatedUrls: home ? [home.url] : [site.url],
      artifacts: [
        {
          name: "sample-organization-schema.json",
          kind: "schema_json",
          content: sampleOrgSchema(site),
        },
      ],
      agentAction: { type: "edit_schema", target: "Organization" },
    });
  } else {
    alreadyDoneWell.push(`Structured data includes organisation-like types: ${types.filter((t) => ["Organization", "ProfessionalService", "LocalBusiness"].includes(t)).join(", ") || types.slice(0, 5).join(", ")}.`);
    const homeLd = home?.jsonLd ?? [];
    const blob = JSON.stringify(homeLd);
    if (!/"sameAs"\s*:/.test(blob)) {
      findings.push({
        id: `${site.id}-schema-sameas`,
        priority: "IMPORTANT",
        level: "P1",
        category: "entity_brand",
        title: "Richer structured data (sameAs, founder, services)",
        effort: "2–3 h",
        what: "Organisation schema exists but is thin: missing sameAs profile links and/or founder / Service / article markup.",
        why: "With a shared or ambiguous name, schema is how Google and AI systems tell this business apart.",
        fix: "Extend Organization/ProfessionalService with address, vatID/taxID, foundingDate, areaServed, knowsAbout, sameAs. Add Person for the founder, BlogPosting on articles, BreadcrumbList on inner pages.",
        evidence: [],
        relatedUrls: home ? [home.url] : [],
        artifacts: [
          {
            name: "sample-organization-schema.json",
            kind: "schema_json",
            content: sampleOrgSchema(site),
          },
        ],
        agentAction: { type: "edit_schema" },
      });
    }
  }

  // --- Brand in first lines ---
  if (home && site.brandNames.length) {
    const firstText = [home.title, home.h1.join(" "), home.metaDescription].join(" ").toLowerCase();
    const brandHit = site.brandNames.some((b) => firstText.includes(b.toLowerCase()));
    if (!brandHit) {
      findings.push({
        id: `${site.id}-defining-sentence`,
        priority: "IMPORTANT",
        level: "P1",
        category: "geo_ai",
        title: "Make the entity unmistakable in the first lines",
        effort: "15–60 min",
        what: `The homepage title/H1/description do not clearly include the brand name (${site.brandNames.join(" / ")}).`,
        why: "AI answers are assembled from short passages. A self-contained sentence with name, place, founder and focus is what gets lifted and cited.",
        fix: `Open the homepage or About with one quotable sentence: brand + legal entity + place + what you do + what you do not do.`,
        evidence: [home.title ?? "(no title)", ...home.h1],
        relatedUrls: [home.url],
        artifacts: [],
        agentAction: { type: "edit_copy", target: "homepage/about" },
      });
    }
  }

  // --- OG image ---
  if (home && (!home.ogImage || home.twitterCard === "summary")) {
    findings.push({
      id: `${site.id}-og-image`,
      priority: "NICE_TO_HAVE",
      level: "P2",
      category: "technical",
      title: "A proper social preview image",
      effort: "30 min",
      what: home.ogImage
        ? `og:image is set but twitter:card is "${home.twitterCard ?? "unset"}" (prefer summary_large_image with a 1200×630 image).`
        : "No og:image found on the homepage.",
      why: "Shared links on LinkedIn otherwise show a cropped logo or empty preview.",
      fix: "Create one 1200×630 image (logo + headline), set as default og:image, use summary_large_image.",
      evidence: [],
      relatedUrls: [home.url],
      artifacts: [],
      agentAction: { type: "add_file", target: "og-default.png" },
    });
  }

  // --- mailto forms ---
  const mailto = findMailtoForms(okPages);
  if (mailto.length) {
    findings.push({
      id: `${site.id}-mailto-form`,
      priority: "IMPORTANT",
      level: "P1",
      category: "conversion",
      title: "The contact form posts to mailto:",
      effort: "1 h",
      what: `Found mailto form action(s): ${mailto.join("; ")}`,
      why: "This is a conversion issue more than an SEO one, but it is the page SEO work sends people to. On many phones and locked-down work machines, mailto does nothing.",
      fix: "Post to a real form endpoint (HubSpot, Formspree, etc.) and show the email address as plain-text fallback.",
      evidence: mailto,
      relatedUrls: mailto.map((m) => m.split(" → ")[0]!),
      artifacts: [],
      agentAction: { type: "other", notes: "Wire form to CRM/endpoint" },
    });
  }

  // --- Focus keywords context finding ---
  if (site.focusKeywords.length) {
    findings.push({
      id: `${site.id}-keyword-context`,
      priority: "CONTEXT",
      level: "P1",
      category: "content_keywords",
      title: "Search demand and content fit",
      effort: "ongoing",
      what: `Configured focus themes/keywords to validate with search-volume data: ${site.focusKeywords.join(", ")}.`,
      why: "Category keywords often have tiny demand for advisory businesses; buyers search symptoms or ask AI assistants.",
      fix: "Pull monthly volumes (DataForSEO / Ads Keyword Planner) for the configured markets, then write problem-led pages that open with a two-sentence direct answer and link to the matching service.",
      evidence: site.focusKeywords,
      relatedUrls: [],
      artifacts: [],
      agentAction: {
        type: "manual_check",
        notes: "Fill volumes via keyword collector or agent research, then prioritise content.",
      },
    });
  }

  // --- GEO questions ---
  if (site.geoQuestions.length) {
    findings.push({
      id: `${site.id}-geo-checks`,
      priority: "CHECK",
      level: "P1",
      category: "geo_ai",
      title: "How AI search sees the brand (manual / API pass)",
      effort: "30–60 min",
      what: "Live ChatGPT / Perplexity / AI Overview answers were not auto-fetched in this run. Use the configured questions.",
      why: "Assistants still describe brands from old crawls; redirects and llms.txt decide how fast that updates.",
      fix: "Ask each question with web search enabled, record citations, and compare to the intended positioning. Re-run 2–4 weeks after major changes.",
      evidence: site.geoQuestions,
      relatedUrls: [],
      artifacts: [
        {
          name: "geo-questions.md",
          kind: "checklist",
          content: site.geoQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n"),
        },
      ],
      agentAction: { type: "manual_check", notes: "Fill GEO answers into the report" },
    });
  }

  // --- Brand search ---
  if (site.brandNames.length) {
    findings.push({
      id: `${site.id}-brand-search`,
      priority: "IMPORTANT",
      level: "P1",
      category: "entity_brand",
      title: "Win the brand search on purpose",
      effort: "2–4 h, then ongoing",
      what: `Brand strings to verify in Google (${site.markets.join(", ")}): ${site.brandNames.join(", ")}.${site.competitors.length ? ` Known namesakes/competitors: ${site.competitors.join(", ")}.` : ""}`,
      why: "Prospects who hear the name will search it. They need to land on the right domain, not a namesake.",
      fix: "Put brand + place + category together in the home title or first paragraph. Align LinkedIn, Google Business Profile, and other sameAs profiles on the exact name and URL.",
      evidence: [],
      relatedUrls: [site.url],
      artifacts: [],
      agentAction: { type: "manual_check" },
    });
  }

  if (crawl.errors.length) {
    appendix.push({
      title: `Collector warnings (${site.id})`,
      kind: "pre",
      content: crawl.errors.join("\n"),
    });
  }

  const llmsArtifact = findings.find((f) => f.id === `${site.id}-llms-txt`)?.artifacts[0];
  if (llmsArtifact) {
    appendix.push({
      title: `Starter llms.txt for ${site.name}`,
      kind: "pre",
      content: llmsArtifact.content,
    });
  }
  const schemaArtifact = findings.find((f) => f.artifacts.some((a) => a.kind === "schema_json"));
  if (schemaArtifact) {
    const art = schemaArtifact.artifacts.find((a) => a.kind === "schema_json");
    if (art) {
      appendix.push({
        title: `Sample Organization schema for ${site.name}`,
        kind: "pre",
        content: art.content,
      });
    }
  }

  return { stats, alreadyDoneWell, findings, appendix };
}

function normalizeEnds(urlOrPath: string): string {
  try {
    const u = urlOrPath.includes("://") ? new URL(urlOrPath).pathname : urlOrPath;
    return u.replace(/\/+$/, "") || "/";
  } catch {
    return urlOrPath;
  }
}

function pathsRoughlyMatch(pageUrl: string, oldPath: string, siteUrl: string): boolean {
  const a = normalizeEnds(pageUrl);
  const b = normalizeEnds(oldPath.includes("://") ? oldPath : new URL(oldPath, siteUrl).toString());
  return a === b || a.endsWith(b) || b.endsWith(a);
}

function starterLlmsTxt(site: SiteConfig, pages: PageSnapshot[]): string {
  const links = pages
    .filter((p) => p.status < 400 && p.title)
    .slice(0, 12)
    .map((p) => `- [${p.title}](${p.url}): ${(p.metaDescription || p.h1[0] || "").slice(0, 120)}`);
  return `# ${site.name}

> ${site.legalName ?? site.name} — replace this paragraph with: who you are, where,
> who founded you, what you do, and what you explicitly do not do.

## Pages
${links.join("\n") || "- [Home](" + site.url + ")"}
`;
}

function sampleOrgSchema(site: SiteConfig): string {
  const obj = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfessionalService",
        "@id": `${site.url.replace(/\/$/, "")}/#organization`,
        name: site.brandNames[0] ?? site.name,
        legalName: site.legalName ?? site.name,
        url: site.url,
        knowsAbout: site.focusKeywords.slice(0, 6),
        sameAs: [] as string[],
      },
    ],
  };
  return JSON.stringify(obj, null, 2);
}
