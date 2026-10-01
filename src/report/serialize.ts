import type { AuditReport, Finding, PriorityLevel } from "../types.js";
import { LEVEL_ORDER } from "../types.js";

export function buildAgentQueue(findings: Finding[]): Finding[] {
  return [...findings]
    .filter((f) => !["IN_GOOD_SHAPE", "NO_CONFLICT", "CONTEXT"].includes(f.priority) || f.level === "P0")
    .filter((f) => f.effort !== "No action" && f.priority !== "IN_GOOD_SHAPE" && f.priority !== "NO_CONFLICT")
    .sort((a, b) => {
      const ld = LEVEL_ORDER[a.level as PriorityLevel] - LEVEL_ORDER[b.level as PriorityLevel];
      if (ld !== 0) return ld;
      return a.title.localeCompare(b.title);
    });
}

export function toJsonReport(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}

/** Compact markdown for implementing agents */
export function toAgentMarkdown(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(`# ${report.title}`);
  lines.push("");
  lines.push(`> ${report.eyebrow}`);
  lines.push("");
  lines.push(report.lede);
  lines.push("");
  lines.push("## Summary");
  for (const s of report.summary) lines.push(`- ${s}`);
  lines.push("");
  lines.push("## Agent queue (implement in order)");
  lines.push("");
  for (const f of report.agentQueue) {
    lines.push(`### [${f.level} · ${f.priority}] ${f.title}`);
    lines.push(`- **id:** \`${f.id}\``);
    lines.push(`- **effort:** ${f.effort}`);
    lines.push(`- **category:** ${f.category}`);
    if (f.agentAction) {
      lines.push(
        `- **action:** \`${f.agentAction.type}\`${f.agentAction.target ? ` → ${f.agentAction.target}` : ""}${f.agentAction.notes ? ` (${f.agentAction.notes})` : ""}`,
      );
    }
    lines.push(`- **what:** ${f.what}`);
    lines.push(`- **why:** ${f.why}`);
    lines.push(`- **fix:** ${f.fix}`);
    if (f.relatedUrls.length) lines.push(`- **urls:** ${f.relatedUrls.join(", ")}`);
    if (f.artifacts.length) {
      lines.push(`- **artifacts:**`);
      for (const a of f.artifacts) {
        lines.push(`  - ${a.name} (${a.kind})`);
        lines.push("    ```");
        lines.push(
          a.content
            .split("\n")
            .map((l) => `    ${l}`)
            .join("\n"),
        );
        lines.push("    ```");
      }
    }
    lines.push("");
  }

  if (report.timeline.length) {
    lines.push("## Suggested order");
    for (const row of report.timeline) {
      lines.push(`- **${row.when}:** ${Object.entries(row.columns).map(([k, v]) => `${k}: ${v}`).join(" · ")}`);
    }
    lines.push("");
  }

  lines.push("## Method");
  lines.push(report.method);
  return lines.join("\n");
}
