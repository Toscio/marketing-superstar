import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { crawlSite, type CrawlResult } from "./collectors/crawl.js";
import { analyzeSite } from "./collectors/analyze.js";
import { enrichDeep } from "./collectors/enrich.js";
import { depthProfile } from "./depth.js";
import { toHtmlReport } from "./report/html.js";
import { buildAgentQueue, toAgentMarkdown, toJsonReport } from "./report/serialize.js";
import {
  AuditConfigSchema,
  MeasurementSchema,
  type AuditConfig,
  type AuditReport,
  type Finding,
  type SiteSection,
} from "./types.js";

export async function loadConfig(configPath: string): Promise<AuditConfig> {
  const raw = await readFile(configPath, "utf8");
  const data = configPath.endsWith(".json") ? JSON.parse(raw) : parseYaml(raw);
  const parsed = AuditConfigSchema.parse(data);
  parsed.measurement = MeasurementSchema.parse(parsed.measurement ?? {});
  return parsed;
}

function defaultSummary(sites: SiteSection[]): string[] {
  const lines: string[] = [];
  for (const site of sites) {
    const p0 = site.findings.filter((f) => f.level === "P0");
    const good = site.alreadyDoneWell.length;
    lines.push(
      `**${site.name}:** ${p0.length} P0 item(s), ${site.findings.length} findings total, ${good} strengths noted.`,
    );
    for (const f of p0.slice(0, 3)) {
      lines.push(`${site.name} — ${f.title}: ${f.what.slice(0, 180)}${f.what.length > 180 ? "…" : ""}`);
    }
  }
  lines.push(
    "Each finding says what to change, why it matters, how to fix it and roughly how long it takes. Checks are read-only: no forms submitted, no load tests.",
  );
  return lines;
}

function defaultTimeline(sites: SiteSection[]): AuditReport["timeline"] {
  const columns: Record<string, string> = {};
  for (const site of sites) {
    const p0 = site.findings.filter((f) => f.level === "P0").map((f) => f.title);
    const p1 = site.findings.filter((f) => f.level === "P1").map((f) => f.title);
    columns[site.name] = [...p0, ...p1.slice(0, 3)].join("; ") || "—";
  }
  return [
    { when: "This week", columns: { ...columns } },
    {
      when: "Next 2 weeks",
      columns: Object.fromEntries(
        sites.map((s) => [
          s.name,
          s.findings
            .filter((f) => f.level === "P1")
            .slice(3, 8)
            .map((f) => f.title)
            .join("; ") || "Polish + content",
        ]),
      ),
    },
    {
      when: "Month 1–3",
      columns: Object.fromEntries(
        sites.map((s) => [
          s.name,
          s.findings
            .filter((f) => f.category === "content_keywords" || f.category === "geo_ai")
            .map((f) => f.title)
            .slice(0, 3)
            .join("; ") || "Content cadence + GEO re-check",
        ]),
      ),
    },
  ];
}

export function assembleReport(
  config: AuditConfig,
  crawls: Map<string, CrawlResult>,
  generatedAt = new Date().toISOString(),
): AuditReport {
  const siteSections: SiteSection[] = [];
  const appendix: AuditReport["appendix"] = [];
  const allFindings: Finding[] = [];

  for (const site of config.sites) {
    const crawl = crawls.get(site.id);
    if (!crawl) throw new Error(`Missing crawl for site ${site.id}`);
    const analysis = analyzeSite(site, crawl, {
      depth: config.depth,
      measurement: config.measurement,
      geoAnswers: config.geoAnswers.filter((a) => !a.siteId || a.siteId === site.id),
    });
    allFindings.push(...analysis.findings);
    appendix.push(...analysis.appendix);
    siteSections.push({
      siteId: site.id,
      name: site.name,
      primaryUrl: site.url,
      stagingUrl: site.stagingUrl,
      stats: analysis.stats,
      alreadyDoneWell: analysis.alreadyDoneWell,
      findings: analysis.findings,
    });
  }

  if (config.sites.length > 1) {
    const related = config.sites.filter((s) => s.relatedSiteIds.length);
    if (related.length) {
      const finding: Finding = {
        id: "cross-site-entity-link",
        priority: "IMPORTANT",
        level: "P1",
        category: "cross_site",
        title: "Connect related brands through a shared person/entity",
        effort: "1 h",
        what: `Configured related sites: ${config.sites.map((s) => s.name).join(", ")}.`,
        why: "Shared founders should be one Person entity referenced from each site. Do not use hreflang unless the content is the same page in different languages.",
        fix: "Pick one Person @id on the primary site and reference it from the other. Add one bio line on each site pointing at the sibling brand where it genuinely helps the reader.",
        evidence: related.map((s) => `${s.id} → ${s.relatedSiteIds.join(",")}`),
        relatedUrls: config.sites.map((s) => s.url),
        artifacts: [],
        agentAction: { type: "edit_schema", notes: "Shared Person @id" },
      };
      allFindings.push(finding);
      siteSections[0]?.findings.push(finding);
    }
  }

  const checked = config.sites
    .map((s) => (s.stagingUrl ? `${s.stagingUrl} (staging), ${s.url}` : s.url))
    .join("; ");
  const profile = depthProfile(config.depth);

  return {
    schemaVersion: "1.1.0",
    depth: config.depth,
    coverage: [...profile.packs],
    title: config.title,
    eyebrow: `Search & marketing audit · ${profile.label} · ${generatedAt.slice(0, 10)}`,
    lede:
      config.notes ??
      `Prioritised findings for ${config.sites.map((s) => s.name).join(" and ")}. Each item says what to change, why it matters, how to fix it and roughly how long it takes.`,
    meta: `Checked: ${checked}. Automated collectors: HTTP crawl, robots/sitemap/llms.txt, on-page meta, JSON-LD. Optional: Lighthouse, keyword APIs, live AI answers (see agent checklist).`,
    generatedAt,
    method: `Depth: ${profile.label} (${profile.summary}) Packs: ${profile.packs.join(", ")}. Read-only HTTP checks. Standard adds on-page quality, intent, and conversion. Deep adds redirect chains, indexation conflicts, competitors, Wikidata, and a measurement baseline. Field Core Web Vitals run when CRUX_API_KEY is set. AI answers are recorded in geoAnswers and repeated after changes. No forms submitted, no load tests.`,
    summary: defaultSummary(siteSections),
    sites: siteSections,
    timeline: defaultTimeline(siteSections),
    appendix,
    agentQueue: buildAgentQueue(allFindings),
  };
}

export async function runAudit(config: AuditConfig): Promise<AuditReport> {
  const crawls = new Map<string, CrawlResult>();
  const profile = depthProfile(config.depth);

  for (const site of config.sites) {
    const seed = site.stagingUrl ?? site.url;
    // Legacy paths must be probed on the *new* host (staging when present),
    // otherwise production WordPress still returns 200 and hides launch blockers.
    const rewriteBase = site.stagingUrl ?? site.url;
    const legacyOnTarget = site.knownOldUrls.map((u) =>
      u.includes("://") ? u : new URL(u, rewriteBase).toString(),
    );
    const extraUrls = [
      ...(site.stagingUrl && site.stagingUrl !== site.url ? [site.url] : []),
      ...legacyOnTarget,
    ];

    const crawl = await crawlSite(seed, {
      maxPages: profile.maxPages,
      extraUrls,
      rewriteSitemapHostToSeed: Boolean(site.stagingUrl),
      traceRedirects: profile.packs.includes("deep"),
    });

    if (profile.packs.includes("deep")) {
      await enrichDeep(site, crawl);
    }

    // If staging was crawled, also peek at production pages for comparison only
    if (site.stagingUrl && site.url !== site.stagingUrl) {
      try {
        const prod = await crawlSite(site.url, { maxPages: 5 });
        const seen = new Set(crawl.pages.map((p) => p.url));
        for (const p of prod.pages) {
          if (!seen.has(p.url)) crawl.pages.push(p);
        }
        // Do not copy prod robots/sitemap/llms onto the staging crawl — missing
        // files on staging are launch blockers and must stay visible.
      } catch {
        /* production optional */
      }
    }

    crawls.set(site.id, crawl);
  }

  return assembleReport(config, crawls);
}

export async function writeReportOutputs(
  report: AuditReport,
  outDir: string,
): Promise<{ html: string; json: string; agentMd: string }> {
  await mkdir(outDir, { recursive: true });
  const htmlPath = path.join(outDir, "report.html");
  const jsonPath = path.join(outDir, "report.json");
  const agentPath = path.join(outDir, "AGENT_QUEUE.md");

  await writeFile(htmlPath, toHtmlReport(report), "utf8");
  await writeFile(jsonPath, toJsonReport(report), "utf8");
  await writeFile(agentPath, toAgentMarkdown(report), "utf8");

  return { html: htmlPath, json: jsonPath, agentMd: agentPath };
}
