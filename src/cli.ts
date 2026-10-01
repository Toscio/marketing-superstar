#!/usr/bin/env node
import { Command } from "commander";
import { loadConfig, runAudit, writeReportOutputs } from "./run.js";
import { AuditDepthSchema } from "./types.js";

const program = new Command();

program
  .name("marketing-audit")
  .description("SEO & marketing audit → HTML + agent-ready JSON/Markdown")
  .version("0.1.0");

program
  .command("audit")
  .description("Run an audit from a YAML/JSON site config")
  .requiredOption("-c, --config <path>", "Path to audit config (YAML or JSON)")
  .option("-o, --out <dir>", "Output directory", "reports/latest")
  .option("-d, --depth <level>", "Override depth: scan, standard, or deep")
  .action(async (opts: { config: string; out: string; depth?: string }) => {
    const config = await loadConfig(opts.config);
    if (opts.depth) config.depth = AuditDepthSchema.parse(opts.depth);
    console.error(
      `Auditing ${config.sites.length} site(s) at ${config.depth}: ${config.sites.map((s) => s.name).join(", ")}`,
    );
    const report = await runAudit(config);
    const paths = await writeReportOutputs(report, opts.out);
    console.error(`Wrote:\n  ${paths.html}\n  ${paths.json}\n  ${paths.agentMd}`);
    console.error(`Agent queue: ${report.agentQueue.length} actionable items`);
    // Machine-friendly last line
    console.log(
      JSON.stringify({
        out: opts.out,
        depth: report.depth,
        findings: report.agentQueue.length,
        generatedAt: report.generatedAt,
      }),
    );
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
