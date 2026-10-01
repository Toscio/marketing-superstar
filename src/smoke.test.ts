import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { snapshotFromHtml } from "./collectors/crawl.js";
import { buildAgentQueue } from "./report/serialize.js";
import type { Finding } from "./types.js";

describe("snapshotFromHtml", () => {
  it("extracts title, h1, canonical and json-ld", () => {
    const html = `<!doctype html><html lang="en"><head>
      <title>Acme Advisory</title>
      <meta name="description" content="We fix slow systems." />
      <link rel="canonical" href="https://acme.example/" />
      <script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>
    </head><body><h1>Clarity for critical services</h1>
    <a href="/services/">Services</a>
    <form action="mailto:hi@acme.example"></form>
    </body></html>`;
    const snap = snapshotFromHtml("https://acme.example/", 200, html);
    assert.equal(snap.title, "Acme Advisory");
    assert.deepEqual(snap.h1, ["Clarity for critical services"]);
    assert.equal(snap.canonical, "https://acme.example/");
    assert.equal(snap.lang, "en");
    assert.equal(snap.formActions[0], "mailto:hi@acme.example");
    assert.ok(snap.internalLinks.some((u) => u.includes("/services")));
    assert.equal(snap.jsonLd.length, 1);
  });
});

describe("buildAgentQueue", () => {
  it("orders P0 before P1 and drops IN_GOOD_SHAPE", () => {
    const findings: Finding[] = [
      {
        id: "b",
        priority: "IMPORTANT",
        level: "P1",
        category: "technical",
        title: "B",
        effort: "1 h",
        what: "w",
        why: "y",
        fix: "f",
        evidence: [],
        relatedUrls: [],
        artifacts: [],
      },
      {
        id: "a",
        priority: "BLOCKER",
        level: "P0",
        category: "pre_launch",
        title: "A",
        effort: "30 min",
        what: "w",
        why: "y",
        fix: "f",
        evidence: [],
        relatedUrls: [],
        artifacts: [],
      },
      {
        id: "g",
        priority: "IN_GOOD_SHAPE",
        level: "P2",
        category: "technical",
        title: "Good",
        effort: "No action",
        what: "w",
        why: "y",
        fix: "f",
        evidence: [],
        relatedUrls: [],
        artifacts: [],
      },
    ];
    const q = buildAgentQueue(findings);
    assert.deepEqual(
      q.map((f) => f.id),
      ["a", "b"],
    );
  });
});
