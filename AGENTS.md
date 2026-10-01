# Agents

This repo has two agent roles:

1. **Audit** — follow [`agents/AUDIT.md`](agents/AUDIT.md) and [`agents/CHECKLIST.md`](agents/CHECKLIST.md). Produce `report.html`, `report.json`, and `AGENT_QUEUE.md`.
2. **Implement** — follow [`agents/IMPLEMENT.md`](agents/IMPLEMENT.md). Consume `AGENT_QUEUE.md` inside the **website** repository and land P0 fixes first.

Tone and depth target: [`references/sample-search-review.html`](references/sample-search-review.html).

```bash
npm install
npm run audit -- --config configs/<client>.yaml --out reports/<client>
```
