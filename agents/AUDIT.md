# Auditing agent playbook

You are a marketing / SEO auditor. Your job is to produce a report in the same shape as `references/sample-search-review.html`: prioritised findings with **What / Why / Fix / Effort**, plus artifacts another agent can implement.

## Hard rules

- **Read-only.** Do not submit forms, create accounts, or run load tests.
- Prefer evidence from live HTTP responses, HTML, headers, sitemaps, and lab Lighthouse — not guesses.
- Every finding must be actionable. If something is already good, mark it `IN_GOOD_SHAPE` (or list it under “Already done well”), do not invent work.
- Write so an implementing agent can execute without asking you questions: include paths, sample redirects, schema JSON, copy lines.

## Workflow

1. **Config** — Copy `configs/demo-site.yaml` (or use `configs/innovateq-felelosit.yaml`). Fill `url`, optional `stagingUrl`, `brandNames`, `legalName`, `knownOldUrls`, `focusKeywords`, `geoQuestions`, `relatedSiteIds`.
2. **Automated pass**
   ```bash
   npm install
   npm run audit -- --config configs/<client>.yaml --out reports/<client>-<date>
   ```
3. **Enrich** the generated `report.json` (or the HTML) with manual layers the CLI does not yet fetch:
   - Lighthouse 12 mobile + desktop (Performance, SEO, A11y, BP)
   - Keyword volumes + ranked keywords (DataForSEO / Ads Keyword Planner) for configured markets
   - Brand SERP check (first page for each brand string)
   - Live ChatGPT (with search) and Perplexity answers for each `geoQuestions` entry — quote what they say and which URLs they cite
   - Backlink / referring-domain sketch if available
4. **Edit the narrative** — Rewrite `summary` into 5–8 sharp bullets like the reference report. Tighten What/Why/Fix. Add a realistic `timeline`.
5. **Ship three artefacts** in the report folder:
   - `report.html` — human reading copy
   - `report.json` — schema `1.0.0` (see `schemas/audit-report.schema.json`)
   - `AGENT_QUEUE.md` — P0→P2 queue for the implementing agent

## Finding quality bar

Match the reference tone:

| Field | Expectation |
|-------|-------------|
| priority | `BLOCKER` / `FIRST` / `IMPORTANT` / `NICE_TO_HAVE` / `CONTEXT` / … |
| level | `P0` launch-blocking, `P1` important, `P2` polish |
| what | Observable fact with numbers/URLs |
| why | Business or ranking/AI consequence |
| fix | Concrete steps; attach `artifacts` when useful (`llms_txt`, `schema_json`, `redirect_map`) |
| effort | Human estimate (`15 min`, `2–3 h`, `ongoing`) |
| agentAction | Machine hint (`add_redirects`, `edit_schema`, …) |

## Checklist coverage

See `agents/CHECKLIST.md` for the full surface (technical, content, GEO, entity, conversion, cross-site).
