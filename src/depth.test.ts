import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { snapshotFromHtml, type CrawlResult, type PageSnapshot } from "./collectors/crawl.js";
import { classifyIntent, extraFindings } from "./collectors/depth-rules.js";
import { depthProfile } from "./depth.js";
import type { SiteConfig } from "./types.js";

const site: SiteConfig = {
  id: "acme",
  name: "Acme",
  url: "https://acme.example/",
  language: "en",
  markets: ["US"],
  brandNames: ["Acme"],
  legalName: "Acme Ltd",
  competitors: [],
  knownOldUrls: [],
  focusKeywords: ["incident review"],
  geoQuestions: ["What is Acme?"],
  relatedSiteIds: [],
};

function crawl(pages: PageSnapshot[], extra: Partial<CrawlResult> = {}): CrawlResult {
  return {
    seed: "https://acme.example/",
    pages,
    robotsTxt: null,
    robotsStatus: 200,
    sitemapUrls: [],
    sitemapBodies: {},
    sitemapFound: false,
    llmsTxt: null,
    llmsStatus: 404,
    notableHeaders: { home: { "strict-transport-security": "1", "content-security-policy": "x", "x-content-type-options": "nosniff" } },
    errors: [],
    redirectChains: [],
    competitorPages: [],
    wikidataQuery: null,
    wikidataHits: [],
    fieldVitals: null,
    ...extra,
  };
}

const emptyMeasurement = {
  searchConsole: false,
  analytics: false,
  queries: [],
  landingPages: [],
  botPaths: [],
};

describe("depth profiles", () => {
  it("grows the crawl and the rule packs", () => {
    assert.deepEqual(depthProfile("scan").packs, ["core"]);
    assert.ok(depthProfile("standard").maxPages > depthProfile("scan").maxPages);
    assert.ok(depthProfile("deep").packs.includes("deep"));
  });
});

describe("classifyIntent", () => {
  it("treats a guide as informational and pricing as transactional", () => {
    assert.equal(classifyIntent("https://acme.example/guides/slow", "How to", ""), "informational");
    assert.equal(classifyIntent("https://acme.example/pricing/", "Pricing", ""), "transactional");
  });
});

describe("extraFindings", () => {
  const home = snapshotFromHtml(
    "https://acme.example/",
    200,
    `<html><head><title>Same</title></head><body><h1>Acme advisory</h1><p>${"word ".repeat(100)}</p><a href="/pricing/">Pricing</a></body></html>`,
  );
  const dup = snapshotFromHtml(
    "https://acme.example/other/",
    200,
    `<html><head><title>Same</title></head><body><h1>Other</h1><p>${"word ".repeat(100)}</p></body></html>`,
  );

  it("skips duplicate-title checks on a scan", () => {
    const result = extraFindings({
      site,
      crawl: crawl([home, dup]),
      depth: "scan",
      measurement: emptyMeasurement,
      geoAnswers: [],
    });
    assert.equal(result.findings.some((f) => f.id === "acme-duplicate-titles"), false);
  });

  it("flags duplicate titles and a missing AI probe on standard", () => {
    const result = extraFindings({
      site,
      crawl: crawl([home, dup]),
      depth: "standard",
      measurement: emptyMeasurement,
      geoAnswers: [],
    });
    assert.ok(result.findings.some((f) => f.id === "acme-duplicate-titles"));
    assert.ok(result.findings.some((f) => f.id === "acme-geo-checks"));
  });

  it("flags a redirect chain and a missing search baseline on deep", () => {
    const result = extraFindings({
      site,
      crawl: crawl([home], {
        redirectChains: [
          {
            from: "https://acme.example/old/",
            hops: [
              { url: "https://acme.example/old/", status: 302 },
              { url: "https://acme.example/mid/", status: 301 },
              { url: "https://acme.example/", status: 200 },
            ],
          },
        ],
        wikidataQuery: "Acme",
        wikidataHits: [],
      }),
      depth: "deep",
      measurement: emptyMeasurement,
      geoAnswers: [],
    });
    assert.ok(result.findings.some((f) => f.id === "acme-redirect-chains"));
    assert.ok(result.findings.some((f) => f.id === "acme-no-search-baseline"));
    assert.ok(result.findings.some((f) => f.id === "acme-wikidata"));
  });
});
