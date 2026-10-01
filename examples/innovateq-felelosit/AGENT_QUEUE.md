# InnovaTeQ and Felelősségteljes IT: SEO and AI-search review

> Search & marketing audit · 2026-10-01

A prioritised list for innovateq.io and felelosit.hu. Each item says what to change, why it matters, how to fix it and roughly how long it takes. Everything is checked read-only: no forms submitted, no load tests.

## Summary
- **InnovaTeQ:** 0 P0 item(s), 8 findings total, 4 strengths noted.
- **Felelősségteljes IT:** 0 P0 item(s), 4 findings total, 4 strengths noted.
- Each finding says what to change, why it matters, how to fix it and roughly how long it takes. Checks are read-only: no forms submitted, no load tests.

## Agent queue (implement in order)

### [P1 · IMPORTANT] Connect related brands through a shared person/entity
- **id:** `cross-site-entity-link`
- **effort:** 1 h
- **category:** cross_site
- **action:** `edit_schema` (Shared Person @id)
- **what:** Configured related sites: InnovaTeQ, Felelősségteljes IT.
- **why:** Shared founders should be one Person entity referenced from each site. Do not use hreflang unless the content is the same page in different languages.
- **fix:** Pick one Person @id on the primary site and reference it from the other. Add one bio line on each site pointing at the sibling brand where it genuinely helps the reader.
- **urls:** https://innovateq.io/, https://felelosit.hu/

### [P1 · IMPORTANT] Fix titles, meta descriptions and H1s
- **id:** `innovateq-meta-basics`
- **effort:** 1–2 h
- **category:** technical
- **action:** `edit_html_meta`
- **what:** 1 page(s) with no H1; 6 page(s) with multiple H1s
- **why:** Titles and a single clear H1 are the baseline for both classic SEO and AI citation snippets.
- **fix:** Give every indexable page a unique title, a meta description, and exactly one H1 that matches the page intent.
- **urls:** https://innovateq.io/blogs/

### [P1 · CHECK] How AI search sees the brand (manual / API pass)
- **id:** `innovateq-geo-checks`
- **effort:** 30–60 min
- **category:** geo_ai
- **action:** `manual_check` (Fill GEO answers into the report)
- **what:** Live ChatGPT / Perplexity / AI Overview answers were not auto-fetched in this run. Use the configured questions.
- **why:** Assistants still describe brands from old crawls; redirects and llms.txt decide how fast that updates.
- **fix:** Ask each question with web search enabled, record citations, and compare to the intended positioning. Re-run 2–4 weeks after major changes.
- **artifacts:**
  - geo-questions.md (checklist)
    ```
    1. What is InnovaTeQ?
    2. Who is Ádám Tóth InnovaTeQ?
    3. Independent performance and observability consultants in Hungary or Europe
    4. Is InnovaTeQ a training company?
    ```

### [P1 · CHECK] How AI search sees the brand (manual / API pass)
- **id:** `felelosit-geo-checks`
- **effort:** 30–60 min
- **category:** geo_ai
- **action:** `manual_check` (Fill GEO answers into the report)
- **what:** Live ChatGPT / Perplexity / AI Overview answers were not auto-fetched in this run. Use the configured questions.
- **why:** Assistants still describe brands from old crawls; redirects and llms.txt decide how fast that updates.
- **fix:** Ask each question with web search enabled, record citations, and compare to the intended positioning. Re-run 2–4 weeks after major changes.
- **artifacts:**
  - geo-questions.md (checklist)
    ```
    1. Mi az a Felelősségteljes IT?
    2. Felelősségteljes IT Tóth Ádám Vida András
    3. Informatikai szakértő teljesítési vita Magyarország
    ```

### [P1 · IMPORTANT] Richer structured data (sameAs, founder, services)
- **id:** `innovateq-schema-sameas`
- **effort:** 2–3 h
- **category:** entity_brand
- **action:** `edit_schema`
- **what:** Organisation schema exists but is thin: missing sameAs profile links and/or founder / Service / article markup.
- **why:** With a shared or ambiguous name, schema is how Google and AI systems tell this business apart.
- **fix:** Extend Organization/ProfessionalService with address, vatID/taxID, foundingDate, areaServed, knowsAbout, sameAs. Add Person for the founder, BlogPosting on articles, BreadcrumbList on inner pages.
- **urls:** https://innovateq-website.innovateq-solutions.workers.dev/
- **artifacts:**
  - sample-organization-schema.json (schema_json)
    ```
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ProfessionalService",
          "@id": "https://innovateq.io/#organization",
          "name": "InnovaTeQ",
          "legalName": "InnovaTeQ Solutions Kft.",
          "url": "https://innovateq.io/",
          "knowsAbout": [
            "performance engineering consulting",
            "observability consulting",
            "incident root cause analysis",
            "monitoring strategy",
            "performance testing consultancy"
          ],
          "sameAs": []
        }
      ]
    }
    ```

### [P1 · IMPORTANT] The contact form posts to mailto:
- **id:** `innovateq-mailto-form`
- **effort:** 1 h
- **category:** conversion
- **action:** `other` (Wire form to CRM/endpoint)
- **what:** Found mailto form action(s): https://innovateq-website.innovateq-solutions.workers.dev/book-a-call/ → mailto:info@innovateq.io; https://innovateq-website.innovateq-solutions.workers.dev/request-tailored-offer/ → mailto:info@innovateq.io; https://innovateq-website.innovateq-solutions.workers.dev/thank-you/ → mailto:info@innovateq.io; https://innovateq-website.innovateq-solutions.workers.dev/contact/ → mailto:info@innovateq.io
- **why:** This is a conversion issue more than an SEO one, but it is the page SEO work sends people to. On many phones and locked-down work machines, mailto does nothing.
- **fix:** Post to a real form endpoint (HubSpot, Formspree, etc.) and show the email address as plain-text fallback.
- **urls:** https://innovateq-website.innovateq-solutions.workers.dev/book-a-call/, https://innovateq-website.innovateq-solutions.workers.dev/request-tailored-offer/, https://innovateq-website.innovateq-solutions.workers.dev/thank-you/, https://innovateq-website.innovateq-solutions.workers.dev/contact/

### [P1 · IMPORTANT] Win the brand search on purpose
- **id:** `innovateq-brand-search`
- **effort:** 2–4 h, then ongoing
- **category:** entity_brand
- **action:** `manual_check`
- **what:** Brand strings to verify in Google (GB, US, HU): InnovaTeQ, InnovateQ, InnovaTeQ Solutions. Known namesakes/competitors: https://innovateq.digital/, https://innovateq.com.au/.
- **why:** Prospects who hear the name will search it. They need to land on the right domain, not a namesake.
- **fix:** Put brand + place + category together in the home title or first paragraph. Align LinkedIn, Google Business Profile, and other sameAs profiles on the exact name and URL.
- **urls:** https://innovateq.io/

### [P1 · IMPORTANT] Win the brand search on purpose
- **id:** `felelosit-brand-search`
- **effort:** 2–4 h, then ongoing
- **category:** entity_brand
- **action:** `manual_check`
- **what:** Brand strings to verify in Google (HU): Felelősségteljes IT, felelosit.
- **why:** Prospects who hear the name will search it. They need to land on the right domain, not a namesake.
- **fix:** Put brand + place + category together in the home title or first paragraph. Align LinkedIn, Google Business Profile, and other sameAs profiles on the exact name and URL.
- **urls:** https://felelosit.hu/

### [P2 · NICE_TO_HAVE] A proper social preview image
- **id:** `innovateq-og-image`
- **effort:** 30 min
- **category:** technical
- **action:** `add_file` → og-default.png
- **what:** og:image is set but twitter:card is "summary" (prefer summary_large_image with a 1200×630 image).
- **why:** Shared links on LinkedIn otherwise show a cropped logo or empty preview.
- **fix:** Create one 1200×630 image (logo + headline), set as default og:image, use summary_large_image.
- **urls:** https://innovateq-website.innovateq-solutions.workers.dev/

## Suggested order
- **This week:** InnovaTeQ: Fix titles, meta descriptions and H1s; Richer structured data (sameAs, founder, services); The contact form posts to mailto: · Felelősségteljes IT: Search demand and content fit; How AI search sees the brand (manual / API pass); Win the brand search on purpose
- **Next 2 weeks:** InnovaTeQ: Search demand and content fit; How AI search sees the brand (manual / API pass); Win the brand search on purpose; Connect related brands through a shared person/entity · Felelősségteljes IT: Polish + content
- **Month 1–3:** InnovaTeQ: Search demand and content fit; How AI search sees the brand (manual / API pass) · Felelősségteljes IT: Search demand and content fit; How AI search sees the brand (manual / API pass)

## Method
Method: read-only HTTP checks of seed + sitemap URLs, on-page SEO extraction, robots.txt / sitemap / llms.txt, JSON-LD entity scan. Keyword volumes, backlink graphs and live ChatGPT/Perplexity answers are filled by the auditing agent when enabled. No forms submitted, no load tests.