# marketing-superstar

SEO and marketing audit toolkit. Crawl a site (read-only), produce a **prioritised report** in the same shape as a human search review, and hand an **agent queue** to another coding agent to implement the fixes.

## What you get

Each audit run writes three files:

| File | Audience |
|------|----------|
| `report.html` | Humans — same reading layout as the reference review (What / Why / Fix / Effort + priority tags) |
| `report.json` | Machines — `schemaVersion: 1.0.0` (see `schemas/audit-report.schema.json`) |
| `AGENT_QUEUE.md` | Implementing agents — P0→P2 ordered list with `agentAction` hints and artifacts |

## Quick start

The product is the **audit capability**, not a check of any particular site. The reference review in `references/sample-search-review.html` is the quality bar (What / Why / Fix / Effort). A fictional, offline sample of that shape is generated with:

```bash
npm install
npm run example
```

That writes `examples/report-shape/` (`report.html`, `report.json`, `AGENT_QUEUE.md`) without fetching any URL.

When you are asked to audit a real site, copy `configs/demo-site.yaml` and run:

```bash
npm run audit -- --config configs/<client>.yaml --out reports/<client>
```

## Repository map

```
agents/           Playbooks for auditing vs implementing agents
configs/          Audit YAML (demo + templates/). Do not crawl a template unless asked
schemas/          JSON Schema for report.json
src/              Collectors, analysis rules, HTML/JSON/Markdown writers
references/       Golden-sample human report to match in tone and structure
reports/          Generated output (gitignored)
```

## Agent workflow

1. **Audit agent** follows `agents/AUDIT.md` + `agents/CHECKLIST.md`  
   → runs the CLI → enriches with Lighthouse / keywords / live AI answers → ships the three artefacts.
2. **Implement agent** follows `agents/IMPLEMENT.md`  
   → consumes `AGENT_QUEUE.md` in the **website** repo → lands P0 fixes first.

## Finding model

Every finding has:

- `priority` + `level` (`P0` / `P1` / `P2`)
- `what` / `why` / `fix` / `effort`
- optional `artifacts` (redirect map, `llms.txt` starter, sample JSON-LD)
- optional `agentAction` (`add_redirects`, `edit_schema`, `edit_copy`, …)

Automated rules already cover: robots/sitemap, `llms.txt`, staging indexation hints, legacy URL 404s, titles/H1/canonicals, Organisation schema gaps, mailto forms, OG image, brand/GEO placeholders from config.

## Reference tone

See `references/sample-search-review.html` (InnovaTeQ + Felelősségteljes IT, Sep 2026). New reports should feel like that document: blunt summary bullets, effort estimates, and appendix starters the implementer can paste.

## Safety

Collectors are **read-only** (GET/HEAD only). Do not submit forms or run load tests from this tool.
