# Northline: SEO and AI-search review

> Search & marketing audit · 2026-10-01

Fictional sample. Each item says what to change, why it matters, how to fix it and roughly how long it takes. Read-only.

## Summary
- **Northline:** 5 P0 item(s), 11 findings total, 1 strengths noted.
- Northline — Publish a sitemap and point robots.txt at it: Northline has no discoverable XML sitemap (checked common paths and robots.txt). robots.txt exists but has no Sitemap: line.
- Northline — Publish llms.txt: /llms.txt returns 404.
- Northline — Keep the staging host out of the index: Staging host staging.northline.example appears indexable (no noindex meta and no X-Robots-Tag: noindex on the checked response).
- Each finding says what to change, why it matters, how to fix it and roughly how long it takes. Checks are read-only: no forms submitted, no load tests.

## Agent queue (implement in order)

### [P0 · FIRST] Add an Organization (or ProfessionalService) to the schema
- **id:** `northline-org-schema`
- **effort:** 1–2 h
- **category:** entity_brand
- **action:** `edit_schema` → Organization
- **what:** JSON-LD is present (WebSite) but there is no Organization / ProfessionalService entity for the business itself.
- **why:** Without an organisation entity, engines may treat the brand as a topic or confuse it with namesakes. AI assistants invent descriptions when the entity is unclear.
- **fix:** Add ProfessionalService (or Organization) with name, legalName ("Northline Advisory Ltd"), url, address, founder, sameAs profile links, and knowsAbout.
- **urls:** https://staging.northline.example/
- **artifacts:**
  - sample-organization-schema.json (schema_json)
    ```
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ProfessionalService",
          "@id": "https://northline.example/#organization",
          "name": "Northline",
          "legalName": "Northline Advisory Ltd",
          "url": "https://northline.example/",
          "knowsAbout": [
            "incident review",
            "observability advisory"
          ],
          "sameAs": []
        }
      ]
    }
    ```

### [P0 · BLOCKER] Keep the staging host out of the index
- **id:** `northline-staging-noindex`
- **effort:** 15 min
- **category:** pre_launch
- **action:** `configure_headers` → staging.northline.example
- **what:** Staging host staging.northline.example appears indexable (no noindex meta and no X-Robots-Tag: noindex on the checked response).
- **why:** A canonical is a hint, not a rule. If anyone links to staging, Google may index it as a duplicate, and AI crawlers often ignore canonicals.
- **fix:** Send `X-Robots-Tag: noindex` only when the request host is the staging host (Worker rule or Cloudflare Transform Rule). Do not put noindex in HTML that ships to production.
- **urls:** https://staging.northline.example/

### [P0 · BLOCKER] Publish a sitemap and point robots.txt at it
- **id:** `northline-sitemap-missing`
- **effort:** 30 min
- **category:** pre_launch
- **action:** `add_file` → robots.txt + sitemap (Ensure Sitemap: line uses the production absolute URL.)
- **what:** Northline has no discoverable XML sitemap (checked common paths and robots.txt). robots.txt exists but has no Sitemap: line.
- **why:** A sitemap is how Google and AI crawlers learn the URL set quickly, especially after a redesign or launch.
- **fix:** Generate a sitemap (e.g. @astrojs/sitemap or equivalent), serve it at /sitemap-index.xml or /sitemap.xml, and add `Sitemap: <absolute-url>` to robots.txt. Submit it in Search Console after launch.
- **urls:** https://northline.example/robots.txt

### [P0 · BLOCKER] Publish llms.txt
- **id:** `northline-llms-txt`
- **effort:** 30 min
- **category:** geo_ai
- **action:** `add_file` → public/llms.txt
- **what:** /llms.txt returns 404.
- **why:** A short, human-readable summary helps AI crawlers and assistants cite the right entity, especially when repositioning or launching.
- **fix:** Write public/llms.txt by hand: one paragraph on who the organisation is (legal name, place, founder, what it does and does not do), then links to key pages with one-line summaries.
- **urls:** https://northline.example/llms.txt
- **artifacts:**
  - starter-llms.txt (llms_txt)
    ```
    # Northline
    
    > Northline Advisory Ltd — replace this paragraph with: who you are, where,
    > who founded you, what you do, and what you explicitly do not do.
    
    ## Pages
    - [Northline | Advisory](https://staging.northline.example/): We help teams.
    
    ```

### [P0 · BLOCKER] Redirect the old URLs
- **id:** `northline-redirect-old-urls`
- **effort:** 1–2 h
- **category:** pre_launch
- **action:** `add_redirects` → _redirects
- **what:** 2 known legacy URL(s) need permanent redirects (301) onto the current IA. Examples: /old-services/, /book-a-call/
- **why:** Without 301s, bookmarks, social posts and AI-answer citations become dead ends, and Google drops the URLs without passing value on.
- **fix:** Add a redirects file (or platform equivalent) with permanent 301s, one line per old URL. Keep it at least a year.
- **urls:** https://staging.northline.example/old-services/, https://staging.northline.example/book-a-call/
- **artifacts:**
  - redirect-map-stub (redirect_map)
    ```
    /old-services/  /  301
    /book-a-call/  /  301
    ```

### [P1 · CHECK] How AI search sees the brand (manual / API pass)
- **id:** `northline-geo-checks`
- **effort:** 30–60 min
- **category:** geo_ai
- **action:** `manual_check` (Fill GEO answers into the report)
- **what:** Live ChatGPT / Perplexity / AI Overview answers were not auto-fetched in this run. Use the configured questions.
- **why:** Assistants still describe brands from old crawls; redirects and llms.txt decide how fast that updates.
- **fix:** Ask each question with web search enabled, record citations, and compare to the intended positioning. Re-run 2–4 weeks after major changes.
- **artifacts:**
  - geo-questions.md (checklist)
    ```
    1. What is Northline Advisory?
    ```

### [P1 · IMPORTANT] The contact form posts to mailto:
- **id:** `northline-mailto-form`
- **effort:** 1 h
- **category:** conversion
- **action:** `other` (Wire form to CRM/endpoint)
- **what:** Found mailto form action(s): https://staging.northline.example/ → mailto:hello@northline.example
- **why:** This is a conversion issue more than an SEO one, but it is the page SEO work sends people to. On many phones and locked-down work machines, mailto does nothing.
- **fix:** Post to a real form endpoint (HubSpot, Formspree, etc.) and show the email address as plain-text fallback.
- **urls:** https://staging.northline.example/

### [P1 · IMPORTANT] Win the brand search on purpose
- **id:** `northline-brand-search`
- **effort:** 2–4 h, then ongoing
- **category:** entity_brand
- **action:** `manual_check`
- **what:** Brand strings to verify in Google (GB): Northline. Known namesakes/competitors: https://other-northline.example/.
- **why:** Prospects who hear the name will search it. They need to land on the right domain, not a namesake.
- **fix:** Put brand + place + category together in the home title or first paragraph. Align LinkedIn, Google Business Profile, and other sameAs profiles on the exact name and URL.
- **urls:** https://northline.example/

### [P2 · NICE_TO_HAVE] A proper social preview image
- **id:** `northline-og-image`
- **effort:** 30 min
- **category:** technical
- **action:** `add_file` → og-default.png
- **what:** og:image is set but twitter:card is "summary" (prefer summary_large_image with a 1200×630 image).
- **why:** Shared links on LinkedIn otherwise show a cropped logo or empty preview.
- **fix:** Create one 1200×630 image (logo + headline), set as default og:image, use summary_large_image.
- **urls:** https://staging.northline.example/

## Suggested order
- **This week:** Northline: Publish a sitemap and point robots.txt at it; Publish llms.txt; Keep the staging host out of the index; Redirect the old URLs; Add an Organization (or ProfessionalService) to the schema; The contact form posts to mailto:; Search demand and content fit; How AI search sees the brand (manual / API pass)
- **Next 2 weeks:** Northline: Win the brand search on purpose
- **Month 1–3:** Northline: Publish llms.txt; Search demand and content fit; How AI search sees the brand (manual / API pass)

## Method
Method: read-only HTTP checks of seed + sitemap URLs, on-page SEO extraction, robots.txt / sitemap / llms.txt, JSON-LD entity scan. Keyword volumes, backlink graphs and live ChatGPT/Perplexity answers are filled by the auditing agent when enabled. No forms submitted, no load tests.