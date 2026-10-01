import type { AuditReport, Finding, SiteSection } from "../types.js";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function priorityClass(priority: string): string {
  if (["BLOCKER", "FIRST", "LAUNCH_DAY"].includes(priority)) return "P0";
  if (["IMPORTANT", "CONTEXT", "CHECK", "DECISION"].includes(priority)) return "P1";
  return "P2";
}

function renderFinding(f: Finding): string {
  const tag = priorityClass(f.priority);
  const evidence =
    f.evidence.length > 0
      ? `<p class="meta">Evidence: ${f.evidence.map((e) => `<code>${esc(e)}</code>`).join(", ")}</p>`
      : "";
  return `<div class="item"><div class="head"><span class="tag ${tag}">${esc(f.priority.replaceAll("_", " "))}</span><h3>${esc(f.title)}</h3><span class="eff">Effort: ${esc(f.effort)}</span></div>
<dl><dt>What</dt><dd>${esc(f.what)}</dd>
<dt>Why</dt><dd>${esc(f.why)}</dd>
<dt>Fix</dt><dd>${esc(f.fix)}</dd></dl>
${evidence}
</div>`;
}

function renderSite(site: SiteSection): string {
  const stats = site.stats
    .map(
      (s) =>
        `<div class="stat"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`,
    )
    .join("\n");

  const done =
    site.alreadyDoneWell.length > 0
      ? `<div class="box"><h3>Already done well</h3><ul>${site.alreadyDoneWell.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`
      : "";

  // Group findings by category for readability
  const order = [
    "pre_launch",
    "technical",
    "content_keywords",
    "geo_ai",
    "entity_brand",
    "conversion",
    "cross_site",
    "ops_checklist",
  ] as const;
  const labels: Record<string, string> = {
    pre_launch: "A. Pre-launch / first actions",
    technical: "B. Technical",
    content_keywords: "C. Content and keyword fit",
    geo_ai: "D. GEO: how AI search sees the brand",
    entity_brand: "E. Entity and brand",
    conversion: "F. Conversion",
    cross_site: "G. Cross-site",
    ops_checklist: "H. Ops checklist",
  };

  const byCat = new Map<string, Finding[]>();
  for (const f of site.findings) {
    const list = byCat.get(f.category) ?? [];
    list.push(f);
    byCat.set(f.category, list);
  }

  const groups = order
    .filter((c) => byCat.has(c))
    .map((c) => {
      const items = byCat.get(c)!;
      return `<h3>${esc(labels[c] ?? c)}</h3>\n<div class="group">\n${items.map(renderFinding).join("\n")}\n</div>`;
    })
    .join("\n");

  return `
<h2>${esc(site.name)} <span class="meta">(${esc(site.primaryUrl)})</span></h2>
<div class="stats">${stats}</div>
${done}
${groups}
`;
}

export function toHtmlReport(report: AuditReport): string {
  const summary = `<section class="box"><h3>Summary</h3><ol>${report.summary.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></section>`;

  const sites = report.sites.map(renderSite).join("\n");

  let timeline = "";
  if (report.timeline.length) {
    const keys = [...new Set(report.timeline.flatMap((r) => Object.keys(r.columns)))];
    timeline = `<h2>Suggested order</h2><div class="tbl"><table><tr><th>When</th>${keys.map((k) => `<th>${esc(k)}</th>`).join("")}</tr>
${report.timeline
  .map(
    (r) =>
      `<tr><td>${esc(r.when)}</td>${keys.map((k) => `<td>${esc(r.columns[k] ?? "—")}</td>`).join("")}</tr>`,
  )
  .join("\n")}
</table></div>`;
  }

  const appendix = report.appendix
    .map((a) => {
      if (a.kind === "pre" || a.kind === "json") {
        return `<h3>${esc(a.title)}</h3><pre>${esc(a.content)}</pre>`;
      }
      return `<h3>${esc(a.title)}</h3><p>${esc(a.content)}</p>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(report.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap">
<style>
:root{
  --bg:#f6f7f9; --panel:#ffffff; --fg:#17202b; --muted:#566273; --line:#dde2e8;
  --accent:#1d6fa5; --p0:#b3261e; --p0bg:#fbe9e7; --p1:#9a5b00; --p1bg:#fdf1dc; --p2:#2e6b3a; --p2bg:#e6f2e8; --good:#2e6b3a;
  --display:"Newsreader",Georgia,serif; --body:"IBM Plex Sans",system-ui,sans-serif; --mono:"IBM Plex Mono",ui-monospace,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#12171d; --panel:#1a2129; --fg:#e4e9ef; --muted:#9aa6b4; --line:#2c3642;
  --accent:#6cb4e4; --p0:#ff9a8f; --p0bg:#3a1f1d; --p1:#f0bf6a; --p1bg:#36291a; --p2:#8fd19d; --p2bg:#1c3022; --good:#8fd19d; color-scheme:dark}}
body{background:var(--bg);color:var(--fg);font:16px/1.6 var(--body);padding-inline:16px;padding-block:40px 80px;margin:0}
.wrap{max-width:780px;margin:0 auto;display:flex;flex-direction:column;gap:28px}
h1,h2,h3{font-family:var(--display);text-wrap:balance;line-height:1.2;margin:0}
h1{font-size:2.3rem;font-weight:600}
h2{font-size:1.75rem;padding-top:28px;border-top:2px solid var(--fg)}
h3{font-size:1.2rem;font-weight:600}
p{margin:0}
a{color:var(--accent)}
code{font:0.88em var(--mono);background:var(--panel);border:1px solid var(--line);padding:0 4px;border-radius:3px;overflow-wrap:anywhere}
.eyebrow{font:500 0.78rem var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.lede{font-size:1.1rem;color:var(--muted);max-width:65ch}
.meta{font:0.85rem var(--mono);color:var(--muted)}
.box{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:18px 20px;display:flex;flex-direction:column;gap:10px}
.box ol,.box ul{margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:6px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:12px 14px}
.stat b{display:block;font:500 1.35rem var(--mono);font-variant-numeric:tabular-nums}
.stat span{font-size:.85rem;color:var(--muted)}
.group{display:flex;flex-direction:column;gap:0}
.item{border-top:1px solid var(--line);padding-block:18px;display:flex;flex-direction:column;gap:8px}
.item:last-child{border-bottom:1px solid var(--line)}
.head{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.tag{font:500 .72rem var(--mono);letter-spacing:.05em;padding:2px 7px;border-radius:3px;white-space:nowrap}
.P0{color:var(--p0);background:var(--p0bg)} .P1{color:var(--p1);background:var(--p1bg)} .P2{color:var(--p2);background:var(--p2bg)}
.eff{font:.8rem var(--mono);color:var(--muted);margin-left:auto}
dl{margin:0;display:grid;grid-template-columns:4.2em 1fr;gap:4px 12px}
dt{font:500 .78rem/1.9 var(--mono);color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
dd{margin:0;min-width:0}
.tbl{overflow-x:auto;border:1px solid var(--line);border-radius:6px;background:var(--panel)}
table{border-collapse:collapse;width:100%;font-size:.9rem}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font:500 .75rem var(--mono);text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
pre{margin:0;overflow-x:auto;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:12px;font:.8rem/1.5 var(--mono)}
footer{font-size:.85rem;color:var(--muted)}
</style>
</head>
<body>
<div class="wrap">
<header style="display:flex;flex-direction:column;gap:12px">
  <div class="eyebrow">${esc(report.eyebrow)}</div>
  <h1>${esc(report.title)}</h1>
  <p class="lede">${esc(report.lede)}</p>
  <p class="meta">${esc(report.meta)}</p>
</header>
${summary}
${sites}
${timeline}
${appendix ? `<h2>Appendix</h2>${appendix}` : ""}
<footer>${esc(report.method)}</footer>
</div>
</body>
</html>`;
}
