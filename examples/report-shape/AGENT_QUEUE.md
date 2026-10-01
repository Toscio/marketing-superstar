# Northline: SEO and AI-search review

> Search & marketing audit · Deep · 2026-10-01

Fictional sample. Each item says what to change, why it matters, how to fix it and roughly how long it takes. Read-only.

## Summary
- **Northline:** 4 P0 item(s), 23 findings total, 0 strengths noted.
- Northline — Publish llms.txt: /llms.txt returns 404.
- Northline — Keep the staging host out of the index: Staging host staging.northline.example appears indexable (no noindex meta and no X-Robots-Tag: noindex on the checked response).
- Northline — Redirect the old URLs: 2 known legacy URL(s) need permanent redirects (301) onto the current IA. Examples: /old-services/, /book-a-call/
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
    - [Orphan](https://staging.northline.example/orphan/): Orphan
    
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

### [P1 · IMPORTANT] Add Sitemap line to robots.txt
- **id:** `northline-robots-sitemap-line`
- **effort:** 5 min
- **category:** technical
- **action:** `edit_html_meta` → robots.txt
- **what:** A sitemap was found (undefined), but robots.txt does not declare it.
- **why:** Crawlers that start at robots.txt will miss the sitemap.
- **fix:** Add: Sitemap: undefined
- **urls:** https://northline.example/robots.txt

### [P1 · IMPORTANT] Bot log requests URLs the crawl does not return
- **id:** `northline-bot-log`
- **effort:** 1 h
- **category:** technical
- **action:** `add_redirects`
- **what:** 1 logged path(s) are missing or 404 in this crawl. Examples: /old-services/.
- **why:** That is what the crawler actually asked for, which a sitemap sample can miss.
- **fix:** 301 the ones that moved. Let the junk 404. Do not put them back into the sitemap.

### [P1 · IMPORTANT] Landing pages with visits and no conversions
- **id:** `northline-landing-conversions`
- **effort:** 2–4 h
- **category:** conversion
- **action:** `edit_copy`
- **what:** https://northline.example/services/ (80 sessions)
- **why:** These URLs already receive demand. The gap is the page, not the crawl.
- **fix:** Check the promise above the fold against the query that lands here, then the action and the proof.
- **urls:** https://northline.example/services/

### [P1 · CHECK] No analytics snippet on the homepage
- **id:** `northline-no-analytics-snippet`
- **effort:** 30 min
- **category:** measurement
- **action:** `manual_check`
- **what:** The homepage HTML does not reference a common analytics tag.
- **why:** Without a measurement baseline, later ranking work has no success metric.
- **fix:** Confirm analytics is loaded (it may be injected after consent) and that someone can read landing-page conversions.

### [P1 · IMPORTANT] No Wikidata item for the brand
- **id:** `northline-wikidata`
- **effort:** 1–2 h
- **category:** authority
- **action:** `manual_check`
- **what:** A Wikidata search for "Northline" returned no item.
- **why:** Knowledge panels and several AI systems lean on a stable entity, not only on the website.
- **fix:** If the organisation is notable enough, create one item with the legal name, official site, and same profiles the schema lists. Otherwise make those profiles consistent so a future item is unambiguous.

### [P1 · CHECK] Record AI search across four engines
- **id:** `northline-geo-checks`
- **effort:** 45 min, then again in 2–4 weeks
- **category:** geo_ai
- **action:** `manual_check`
- **what:** Questions to ask in ChatGPT, Perplexity, Google AI Overview, and Copilot: What is Northline Advisory?.
- **why:** The engines disagree, and a single answer goes stale after the site changes.
- **fix:** Paste each answer into geoAnswers (engine, question, answer, citedUrls, liftedSentence). Re-run the same sheet after the fixes.
- **artifacts:**
  - geo-probe.txt (checklist)
    ```
    - [chatgpt] What is Northline Advisory?
      answer:
      lifted sentence:
      cited URLs:
    - [perplexity] What is Northline Advisory?
      answer:
      lifted sentence:
      cited URLs:
    - [ai_overview] What is Northline Advisory?
      answer:
      lifted sentence:
      cited URLs:
    - [copilot] What is Northline Advisory?
      answer:
      lifted sentence:
      cited URLs:
    ```

### [P1 · IMPORTANT] Redirect chains or temporary redirects
- **id:** `northline-redirect-chains`
- **effort:** 1 h
- **category:** technical
- **action:** `add_redirects`
- **what:** 1 URL(s) hop more than once or return 302. Example: 302 https://northline.example/old-services/ → 301 https://northline.example/services/ → 200 https://northline.example/services/.
- **why:** Chains waste crawl and drop equity. A 302 on a retired URL tells search the move is temporary.
- **fix:** Point each retired URL at its final target with a single 301.

### [P1 · IMPORTANT] Sitemap lists noindex URLs
- **id:** `northline-sitemap-noindex`
- **effort:** 30 min
- **category:** technical
- **action:** `add_file` → sitemap
- **what:** 1 URL(s) are in the sitemap and also marked noindex.
- **why:** The sitemap asks for indexing and the tag refuses it. Search Console will report the conflict.
- **fix:** Remove noindex URLs from the sitemap, or remove noindex from URLs that should rank.
- **urls:** https://staging.northline.example/orphan/

### [P1 · IMPORTANT] Sitemap URLs with no internal link
- **id:** `northline-orphans`
- **effort:** 1 h
- **category:** technical
- **action:** `edit_copy`
- **what:** 1 crawled sitemap URL(s) are not linked from any other crawled page.
- **why:** Orphans are hard for people and crawlers to discover, and they often mark a template that was never wired into navigation.
- **fix:** Link them from a relevant hub, or remove them from the sitemap and noindex them.
- **urls:** https://staging.northline.example/orphan/

### [P1 · IMPORTANT] The contact form posts to mailto:
- **id:** `northline-mailto-form`
- **effort:** 1 h
- **category:** conversion
- **action:** `other` (Wire form to CRM/endpoint)
- **what:** Found mailto form action(s): https://staging.northline.example/ → mailto:hello@northline.example
- **why:** This is a conversion issue more than an SEO one, but it is the page SEO work sends people to. On many phones and locked-down work machines, mailto does nothing.
- **fix:** Post to a real form endpoint (HubSpot, Formspree, etc.) and show the email address as plain-text fallback.
- **urls:** https://staging.northline.example/

### [P1 · IMPORTANT] Thin indexable pages
- **id:** `northline-thin-pages`
- **effort:** 1–2 h
- **category:** content_keywords
- **action:** `edit_copy`
- **what:** 1 indexable page(s) have under 80 words. Examples: https://staging.northline.example/ (5).
- **why:** Thin URLs rarely match a search intent and dilute the crawl.
- **fix:** Expand the page into a real answer, merge it into a stronger URL, or noindex it.
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

### [P2 · CHECK] Field Core Web Vitals were not queried
- **id:** `northline-field-vitals-missing`
- **effort:** 15 min
- **category:** technical
- **action:** `manual_check`
- **what:** No Chrome UX Report sample was attached to this run.
- **why:** Lab Lighthouse is not a substitute for field LCP, INP, and CLS.
- **fix:** Set CRUX_API_KEY and re-run at deep, or paste the CrUX origin numbers into the report.

### [P2 · NICE_TO_HAVE] Fix titles, meta descriptions and H1s
- **id:** `northline-meta-basics`
- **effort:** 1–2 h
- **category:** technical
- **action:** `edit_html_meta`
- **what:** 1 page(s) missing meta description
- **why:** Titles and a single clear H1 are the baseline for both classic SEO and AI citation snippets.
- **fix:** Give every indexable page a unique title, a meta description, and exactly one H1 that matches the page intent.

## Suggested order
- **This week:** Northline: Publish llms.txt; Keep the staging host out of the index; Redirect the old URLs; Add an Organization (or ProfessionalService) to the schema; Add Sitemap line to robots.txt; The contact form posts to mailto:; Search demand and content fit
- **Next 2 weeks:** Northline: Win the brand search on purpose; Thin indexable pages; No analytics snippet on the homepage; Focus themes are absent from titles and openings; Redirect chains or temporary redirects
- **Month 1–3:** Northline: Publish llms.txt; Search demand and content fit; Thin indexable pages

## Method
Depth: Deep (Full review: redirect chains, indexation conflicts, orphans, click depth, thin content, competitors, entity, measurement baseline, multi-engine AI search.) Packs: core, standard, deep. Read-only HTTP checks. Standard adds on-page quality, intent, and conversion. Deep adds redirect chains, indexation conflicts, competitors, Wikidata, and a measurement baseline. Field Core Web Vitals run when CRUX_API_KEY is set. AI answers are recorded in geoAnswers and repeated after changes. No forms submitted, no load tests.