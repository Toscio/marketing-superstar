# Implementing agent playbook

You receive an audit folder with `report.json` and `AGENT_QUEUE.md`. Your job is to **implement** the fixes in the client’s website repository (or CMS), not to re-audit unless asked.

## How to consume the report

1. Open `AGENT_QUEUE.md` — work **top to bottom** (already sorted P0 → P2).
2. For each item, read `what` / `fix` / `agentAction` / `artifacts`.
3. Skip `CONTEXT`, `CHECK`, and pure `manual_check` items unless the user asked you to do research too — leave those as comments or issues.
4. After each change, tick it mentally: prefer small commits grouped by finding `id`.

## Action types

| agentAction.type | Typical work |
|------------------|--------------|
| `add_redirects` | `_redirects`, `vercel.json`, Worker routes, nginx map — permanent 301 |
| `add_file` | `public/llms.txt`, sitemap integration, OG image |
| `edit_html_meta` | titles, descriptions, canonical, robots |
| `edit_schema` | JSON-LD Organization / Person / FAQPage / BlogPosting |
| `edit_copy` | Defining sentence, FAQ, About facts |
| `configure_headers` | staging `X-Robots-Tag: noindex`, security headers |
| `submit_gsc` | Tell the human: Search Console sitemap + URL Inspection (you usually cannot do this) |
| `create_content` | New explainer / problem-led article outlines from `fix` |
| `manual_check` | Record result; do not invent SEO “fixes” without evidence |
| `other` | Follow `notes` |

## Quality rules

- Do **not** put `noindex` into HTML that also ships to production when the finding says to use a host-based header rule.
- Prefer the artifact content (starter `llms.txt`, sample schema) as a starting point; adapt names, IDs, addresses to the real legal entity.
- Keep one H1 per page; do not stuff keywords.
- When two related brands are linked in the report, use **one Person `@id`** and plain-language cross-links — **not** hreflang across different products/languages of different intent.

## Done criteria

- Every P0 item is either implemented or explicitly blocked with a reason in the PR description.
- PR description lists finding `id`s touched.
- Re-run `npm run audit -- --config …` if the audited URLs are reachable, and attach the new report path.
