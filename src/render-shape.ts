/**
 * Offline sample of the audit report shape.
 * Uses a fictional site and a synthetic crawl — no network, no client URLs.
 */
import { snapshotFromHtml, type CrawlResult } from "./collectors/crawl.js";
import { writeReportOutputs, assembleReport } from "./run.js";
import type { AuditConfig } from "./types.js";

const HOME = `<!doctype html><html lang="en"><head>
<title>Northline | Advisory</title>
<meta name="description" content="We help teams." />
<link rel="canonical" href="https://northline.example/" />
<meta property="og:image" content="https://northline.example/logo.png" />
<meta name="twitter:card" content="summary" />
<script type="application/ld+json">{"@type":"WebSite","name":"Northline"}</script>
</head><body>
<h1>Advisory for critical services</h1>
<form action="mailto:hello@northline.example"></form>
<a href="/services/">Services</a>
</body></html>`;

const config: AuditConfig = {
  title: "Northline: SEO and AI-search review",
  notes:
    "Fictional sample. Each item says what to change, why it matters, how to fix it and roughly how long it takes. Read-only.",
  sites: [
    {
      id: "northline",
      name: "Northline",
      url: "https://northline.example/",
      stagingUrl: "https://staging.northline.example/",
      language: "en",
      markets: ["GB"],
      brandNames: ["Northline"],
      legalName: "Northline Advisory Ltd",
      competitors: ["https://other-northline.example/"],
      knownOldUrls: ["/old-services/", "/book-a-call/"],
      focusKeywords: ["incident review", "observability advisory"],
      geoQuestions: ["What is Northline Advisory?"],
      relatedSiteIds: [],
    },
  ],
  collectors: { crawl: true, lighthouse: false, keywords: false, geoAi: false },
};

function page(url: string, status: number, html: string) {
  return snapshotFromHtml(url, status, html);
}

const crawl: CrawlResult = {
  seed: "https://staging.northline.example/",
  pages: [
    page("https://staging.northline.example/", 200, HOME),
    page("https://staging.northline.example/old-services/", 404, "<html><title>Not found</title></html>"),
    page("https://staging.northline.example/book-a-call/", 404, "<html><title>Not found</title></html>"),
  ],
  robotsTxt: "User-agent: *\nAllow: /\n",
  robotsStatus: 200,
  sitemapUrls: [],
  sitemapBodies: {},
  sitemapFound: false,
  llmsTxt: null,
  llmsStatus: 404,
  notableHeaders: { home: {} },
  errors: [],
};

const report = assembleReport(config, new Map([["northline", crawl]]), "2026-10-01T00:00:00.000Z");
const out = process.argv[2] ?? "examples/report-shape";
const paths = await writeReportOutputs(report, out);
console.log(paths.html);
console.log(paths.json);
console.log(paths.agentMd);
