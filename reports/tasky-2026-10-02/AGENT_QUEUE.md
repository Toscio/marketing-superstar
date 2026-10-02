# Tasky: SEO and AI-search review

> Search & marketing audit · Deep · 2026-10-02

A prioritised review of the live Tasky site (www.tasky.com). Each item says what to change, why it matters, how to fix it and roughly how long it takes. Checked read-only on 2 October 2026: no forms submitted, no accounts created, no load tests.

## Summary
- The site is fast, and the offer is already well written on /product. Lighthouse 12.8.2 scores the homepage 97 for performance on mobile and 99 on desktop, with accessibility, best practices and SEO at 100. /product is about 600 words and says what Clearboard does.
- The homepage does not defend the name. The title is "Tasky", the H1 is "Let the project speak.", and the one sentence that explains the product is not in the title. Other products already use the name: trytasky.com, tasky.uz, taskytodo.com, tasky.net, tasky.school, tasky.cl.
- The URL that currently carries the product name is empty. On 2 October 2026 DuckDuckGo listed https://www.tasky.com/try first for "Tasky Clearboard". That response is a 1,942-byte shell: no H1, no description, and the default og:title "Tasky Clearboard".
- Unknown paths do the same. /privacy, /terms, /about, /pricing, /blog and the bare /board URL return HTTP 200 with that shell and no noindex. There is no sitemap. /beta, /beta-terms, /board/<id> and /view/<id> are already noindex, which is right.
- Nothing structured says which Tasky this is. There is no JSON-LD. llms.txt does not name DPR Ltd. or Hungary, and its links are relative. The legal name appears in the footer. LinkedIn pages named Tasky belong to other companies; do not attach them.
- Two URLs should be indexed: / and /product. Give them titles that say Clearboard, publish a sitemap of those two, 404 the shells, and add Organization plus SoftwareApplication schema. A privacy notice does not exist yet. The beta terms are noindex and are not a substitute.
- There is no Search Console export and no keyword-volume API on this run, so this is not a traffic forecast. Lab speed needs nothing. The work is indexation, titles and the entity.

## Agent queue (implement in order)

### [P0 · FIRST] Add Organization and SoftwareApplication schema
- **id:** `tasky-org-schema`
- **effort:** 1 h
- **category:** entity_brand
- **action:** `edit_schema` → homepage and /product (Organization + SoftwareApplication + WebSite)
- **what:** No JSON-LD on the crawled pages. The only machine-readable identity is the footer line "Tasky is a product of DPR Ltd." and, on the noindexed beta terms, "DPR Ltd. (Hungary)" plus support@tasky.com. The manifest description is the generic "AI-powered project management", and its start_url is /home, which is an empty shell.
- **why:** The brand string matches a lot of other products and a handful of unrelated Wikidata items (a person, rivers, a mountain, a village). Without an Organization and a SoftwareApplication tied to https://www.tasky.com/, a model has nothing stable to attach Clearboard to.
- **fix:** Paste the appendix JSON-LD into the homepage and /product. Use Organization plus SoftwareApplication, not ProfessionalService: this is a product, not a consultancy. Do not invent a street address or a founder; the site does not publish either. Point the manifest start_url at / (or /try if it must open the app) and set its description to the same sentence as the meta description.
- **urls:** https://www.tasky.com/, https://www.tasky.com/manifest.webmanifest
- **artifacts:**
  - organization-software.json (schema_json)
    ```
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://www.tasky.com/#organization",
          "name": "Tasky",
          "legalName": "DPR Ltd.",
          "url": "https://www.tasky.com/",
          "email": "support@tasky.com",
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "HU"
          },
          "brand": ["Tasky Clearboard", "Tasky Workspace"],
          "knowsAbout": [
            "turning meeting notes into a project board",
            "reading tasks, people and dependencies from plain text"
          ]
        },
        {
          "@type": "SoftwareApplication",
          "@id": "https://www.tasky.com/#clearboard",
          "name": "Tasky Clearboard",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "url": "https://www.tasky.com/product",
          "description": "Paste meeting notes, an email or a messy task list. Tasky reads the tasks, the people and the dependencies and draws a board.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "EUR",
            "description": "Clearboard is free. Drafts without an account live for 24 hours."
          },
          "publisher": { "@id": "https://www.tasky.com/#organization" }
        },
        {
          "@type": "WebSite",
          "@id": "https://www.tasky.com/#website",
          "url": "https://www.tasky.com/",
          "name": "Tasky",
          "publisher": { "@id": "https://www.tasky.com/#organization" }
        }
      ]
    }
    
    ```

### [P0 · BLOCKER] Publish a sitemap of the two pages that should rank
- **id:** `tasky-sitemap-missing`
- **effort:** 30 min
- **category:** pre_launch
- **action:** `add_file` → robots.txt + sitemap.xml (Only / and /product. Absolute Sitemap URL on the www host.)
- **what:** robots.txt is 24 bytes ("User-Agent: *" / "Disallow:") and has no Sitemap line. /sitemap.xml, /sitemap-index.xml and /sitemap_index.xml return 404. The only HTML documents worth indexing today are https://www.tasky.com/ and https://www.tasky.com/product.
- **why:** With no sitemap, discovery is whatever a crawler follows or invents. The empty shells are 200s, so a sitemap is also how you tell Google the real set and, in Search Console, which URLs you stand behind.
- **fix:** Serve a urlset at https://www.tasky.com/sitemap.xml containing only / and /product. Add "Sitemap: https://www.tasky.com/sitemap.xml" to robots.txt. Leave out /beta, /beta-terms, /try, /board, /view, /api/auth/keycloak, and every shell. Submit the file in a Domain property for tasky.com after it exists.
- **urls:** https://www.tasky.com/robots.txt, https://www.tasky.com/, https://www.tasky.com/product
- **artifacts:**
  - robots.txt (other)
    ```
    User-Agent: *
    Disallow:
    
    Sitemap: https://www.tasky.com/sitemap.xml
    
    ```
  - sitemap.xml (other)
    ```
    <?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://www.tasky.com/</loc></url>
      <url><loc>https://www.tasky.com/product</loc></url>
    </urlset>
    
    ```

### [P0 · BLOCKER] Stop returning 200 for empty URLs
- **id:** `tasky-soft-200`
- **effort:** 2–3 h
- **category:** pre_launch
- **action:** `configure_headers` → nuxt routeRules (404 unknown paths. noindex app shells and /board /view prefixes. Do not Disallow them in robots.txt.)
- **what:** Any path the app does not server-render comes back as HTTP 200 with a 1,942-byte Nuxt shell: title "Tasky", no H1, no meta description, no canonical, and og:title "Tasky Clearboard". That includes /try, /privacy, /terms, /about, /pricing, /blog, /docs, /contact, /home, /admin, /board and /view. /try is the URL DuckDuckGo listed first for "Tasky Clearboard" on 2 October 2026. /board/<id> and /view/<id> already send X-Robots-Tag: noindex, nofollow. The bare /board and /view paths do not. /beta and /beta-terms do send noindex, nofollow.
- **why:** Search and AI crawlers treat a 200 as a page. The product name currently points at a shell with nothing to quote, and invented URLs such as /privacy can be indexed as if Tasky had a privacy policy. llms.txt says boards are not indexed; the bare /board URL contradicts that.
- **fix:** In Nuxt routeRules (or server middleware): return a real 404 for unknown paths. Send X-Robots-Tag: noindex, nofollow on /try, /home, /admin, /context, /offline, /feedback, and on the /board and /view prefixes including the path with no id. Do not Disallow those paths in robots.txt — Google has to fetch the noindex. Keep /beta and /beta-terms noindex and out of the sitemap. /try can stay as the app; it should not be an indexable document until the HTML contains the product.
- **urls:** https://www.tasky.com/try, https://www.tasky.com/privacy, https://www.tasky.com/board, https://www.tasky.com/view
- **artifacts:**
  - url-status-map.txt (other)
    ```
    # What each URL should do. Checked 2 October 2026.
    
    Keep, index, put in the sitemap
    200  https://www.tasky.com/            title today: Tasky. About 80 words.
    200  https://www.tasky.com/product     title today: Tasky — What it does. About 600 words.
    
    Real pages, already noindex — keep noindex, leave out of the sitemap
    200  https://www.tasky.com/beta            X-Robots-Tag: noindex, nofollow
    200  https://www.tasky.com/beta-terms      X-Robots-Tag: noindex, nofollow
    
    App or user content — noindex the whole prefix, including the bare path
    200  https://www.tasky.com/try             1942-byte shell, indexable, no H1
    200  https://www.tasky.com/home            1942-byte shell, indexable (manifest start_url)
    200  https://www.tasky.com/board           1942-byte shell, indexable
    200  https://www.tasky.com/board/example   noindex, nofollow  (the :id pattern already works)
    200  https://www.tasky.com/view            1942-byte shell, indexable
    200  https://www.tasky.com/view/example    noindex, nofollow
    200  https://www.tasky.com/admin           shell, indexable
    200  https://www.tasky.com/context         shell, indexable
    200  https://www.tasky.com/offline         shell, indexable
    200  https://www.tasky.com/feedback        shell, indexable
    
    Should be real documents, or a genuine 404 until they exist. Today they are indexable shells.
    200  https://www.tasky.com/privacy
    200  https://www.tasky.com/terms
    200  https://www.tasky.com/about
    200  https://www.tasky.com/pricing
    200  https://www.tasky.com/blog
    200  https://www.tasky.com/docs
    200  https://www.tasky.com/contact
    
    Sign-in is a redirect, not a page. Keep it out of the sitemap.
    302  https://www.tasky.com/api/auth/keycloak  → auth.tasky.com (Keycloak)
    
    Host
    308  http://tasky.com/        → http://www.tasky.com/     (stays on http)
    308  http://www.tasky.com/    → https://www.tasky.com/
    308  https://tasky.com/       → https://www.tasky.com/    (one hop, good)
    
    ```

### [P1 · CHECK] AI engines were not quoted in this run
- **id:** `tasky-geo-checks`
- **effort:** 45 min, then again after the title change
- **category:** geo_ai
- **action:** `manual_check` (Repeat after titles, schema and llms.txt ship.)
- **what:** ChatGPT, Perplexity, Google AI Overview and Copilot were not captured with citations in this pass. What is already visible without those engines: a web search for "What is Tasky Clearboard" does not describe this product, and the tasky.com hit in that search is titled only "Tasky". GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, Googlebot and Google-Extended all receive HTTP 200 on the homepage. robots.txt has no Content-Signal lines and does not block them.
- **why:** The engines will invent a Tasky, or cite a namesake, until the homepage title and the schema say which one this is. Bot access is already open, so the gap is the page, not a firewall.
- **fix:** After the title and llms.txt changes, ask the four engines the questions in the appendix and record the cited URLs. Success is a citation of https://www.tasky.com/ or /product, with Clearboard described as paste-to-board, and no claim that this Tasky is trytasky.com, tasky.uz or tasky.cl.
- **urls:** https://www.tasky.com/, https://www.tasky.com/llms.txt
- **artifacts:**
  - geo-probe.txt (checklist)
    ```
    Ask each engine, with search turned on. Date the answer. Record the cited URLs.
    
    - What is Tasky?
    - What is Tasky Clearboard at tasky.com?
    - Who makes tasky.com?
    - How do I turn meeting notes into a project board?
    
    Engines: ChatGPT, Perplexity, Google AI Overview, Copilot.
    
    ```

### [P1 · IMPORTANT] Open a Domain property and look at it once
- **id:** `tasky-no-search-baseline`
- **effort:** 30 min
- **category:** measurement
- **action:** `submit_gsc` (Domain property, not a URL-prefix on only one host.)
- **what:** This review had no Search Console export. searchConsole access was not available. There is no keyword-volume source on this run either, so nothing here is a traffic forecast.
- **why:** The site is small enough that a wrong noindex or a sitemap of shells would show up immediately as indexed URLs. Without the property, the next check is another crawl.
- **fix:** Add a Domain property for tasky.com (it covers apex and www, and the HTTP→HTTPS move). After the sitemap is live, submit it and inspect / , /product and /try. /try should drop out of the index. Paste the query export into measurement.queries if you run this audit again.
- **urls:** https://www.tasky.com/

### [P1 · IMPORTANT] Publish a privacy notice and terms, or stop answering those URLs
- **id:** `tasky-privacy`
- **effort:** half a day
- **category:** conversion
- **action:** `create_content` → /privacy and /terms (Real HTML or a 404. Do not leave the shell.)
- **what:** The footer links to beta terms, a payments anchor, and mailto:support@tasky.com. It does not link to a privacy notice or general terms. /privacy and /terms return the empty 200 shell. The beta terms (last updated 8 September 2026, noindex) name DPR Ltd. (Hungary), say boards stay yours in Clearboard, describe anonymised template learning, and point billing disputes at support@tasky.com and Stripe. They are not a privacy notice, and they are marked noindex.
- **why:** Clearboard asks people to paste meeting notes and emails. A 200 at /privacy that is a blank page is worse than a 404: it looks like a policy and says nothing. The beta terms cannot be cited as the public policy while they send noindex.
- **fix:** Write /privacy and /terms as real HTML, in the same voice as the beta terms, and link both from the footer. Cover what is pasted, how long a draft without an account is kept (the homepage says 24 hours), the template-learning sentence that is already on the beta terms, and Stripe for voluntary support payments. Until those pages exist, the URLs should 404, not return the shell. This review did not draft legal text.
- **urls:** https://www.tasky.com/beta-terms, https://www.tasky.com/privacy, https://www.tasky.com/terms

### [P1 · IMPORTANT] Put Clearboard in the titles
- **id:** `tasky-titles`
- **effort:** 30 min
- **category:** technical
- **action:** `edit_html_meta` → index and product pages
- **what:** The homepage <title> is "Tasky". The H1 is "Let the project speak." The meta description is already the right sentence. /product is titled "Tasky — What it does" while its description ("Paste meeting notes, a long email, a messy task list…") and H1 ("Paste your chaos. Get a board.") are specific. Both pages set og:title to "Tasky Clearboard" and twitter:card to summary. /try has no H1 and no description in the HTML. The sign-in URL is a 302 to Keycloak, not a missing document.
- **why:** The title is what a brand search and an AI citation show. "Tasky" alone does not separate this product from the other Taskys, and the poetic H1 does not either. The good sentence is already written; it is just not in the title.
- **fix:** Use the title and description lines in the appendix. Keep both H1s. Keep both meta descriptions. Do not spend time giving /try or the Keycloak redirect a marketing title: noindex /try, and leave the 302 alone.
- **urls:** https://www.tasky.com/, https://www.tasky.com/product
- **artifacts:**
  - titles.txt (copy)
    ```
    # Titles and descriptions to ship
    
    https://www.tasky.com/
      <title>Tasky Clearboard — paste notes, get a living board</title>
      meta description (already good, keep it):
      Tasky reads tasks, people and dependencies from the way you already talk about work — then draws them into living boards.
      H1 can stay "Let the project speak." The title has to carry the category, because the H1 does not.
    
    https://www.tasky.com/product
      <title>Paste meeting notes, get a board — Tasky Clearboard</title>
      meta description (already good, keep it):
      Paste meeting notes, a long email, a messy task list. Tasky reads the tasks, the people and what depends on what — and draws the board in seconds.
      H1 "Paste your chaos. Get a board." is fine.
    
    og:image on both: absolute https://www.tasky.com/og.png at 1200×630.
    og:title: Tasky Clearboard — paste notes, get a living board
    twitter:card: summary_large_image
    
    ```

### [P1 · IMPORTANT] Replace the share image
- **id:** `tasky-og-image`
- **effort:** 45 min
- **category:** technical
- **action:** `add_file` → public/og.png (1200×630, absolute og:image, summary_large_image)
- **what:** og:image is the relative URL /pwa-512x512.png. The file is a PNG of 401×475 pixels and 111 KB, not 512×512 and not 1200×630. twitter:card is summary, so clients that honour it will use a small card. The same tags are on the empty shell, which is why a shell can outrank the homepage for the product name.
- **why:** Shared links and some brand-result treatments show this image. A square app icon with no sentence does not say what Tasky is, and a relative og:image is dropped by some scrapers.
- **fix:** Make one 1200×630 PNG or JPG (the sentence "Paste notes, get a living board" plus the wordmark). Serve it at https://www.tasky.com/og.png and reference that absolute URL. Set twitter:card to summary_large_image. Use it as the default on / and /product only, not on the app shell.
- **urls:** https://www.tasky.com/pwa-512x512.png

### [P1 · IMPORTANT] Say who Tasky is, and who it is not, in llms.txt
- **id:** `tasky-llms-quality`
- **effort:** 30 min
- **category:** geo_ai
- **action:** `add_file` → public/llms.txt
- **what:** https://www.tasky.com/llms.txt returns 200 and 569 bytes of text/plain. It describes the paste-to-board behaviour and correctly says /board and /view are user content and should not be treated as public. It does not name DPR Ltd. or Hungary, the links are relative (/ and /product), and it does not say which other Taskys it is not.
- **why:** Assistants looking for "Tasky" already have a crowd of other products. A file they can quote needs the legal name, the country, the two product names, and an explicit limit. Relative links are easy to mis-resolve.
- **fix:** Replace the file with the starter in the appendix. Keep the warning about user boards. Use absolute URLs.
- **urls:** https://www.tasky.com/llms.txt
- **artifacts:**
  - llms.txt (llms_txt)
    ```
    # Tasky
    
    > Tasky is a product of DPR Ltd. (Hungary). Tasky Clearboard reads tasks, people and
    > dependencies out of text you already have — a meeting note, an email, a messy list —
    > and draws them as a board. Tasky Workspace is where that board becomes a room: chat,
    > presence, invites and a history. Clearboard is free. Workspace is free for testers
    > while the beta runs.
    >
    > This is not a calendar to-do list, and it is not any other product that uses the name
    > Tasky. Those include trytasky.com, tasky.uz, taskytodo.com, tasky.net, tasky.school
    > and tasky.cl.
    
    ## Pages
    
    - [Tasky](https://www.tasky.com/): what it is, and the way in
    - [What it does](https://www.tasky.com/product): paste to board, and what a Workspace adds
    
    ## Leave alone
    
    - /beta and /beta-terms are noindex. They explain the tester programme; they are not the product pitch.
    - Boards live at /board/<id> and shared links at /view/<id>. Both are user content, both send noindex, and nothing there is public material.
    
    ```

### [P1 · IMPORTANT] The domain can rank and still be indistinguishable
- **id:** `tasky-brand-serp`
- **effort:** 2–3 h, then ongoing
- **category:** entity_brand
- **action:** `manual_check` (New profile only. Do not reuse another Tasky's LinkedIn.)
- **what:** On DuckDuckGo, 2 October 2026, "Tasky" listed https://www.tasky.com/ first and /product second, then taskyai.vercel.app, tasky.school, taskytodo.com, tasky.digital, the Wiktionary entry for "tasky", app.tasky.bot, tasky.net and tasky.software. "Tasky Clearboard" listed /try first and the homepage second, then unrelated sign-in pages. A separate web index for the bare word "Tasky" led with trytasky.com, tasky.uz, tasky.net and an iOS app, and did not show tasky.com on the first screen. No sameAs profile in the HTML. LinkedIn company pages named Tasky that do show up belong to other businesses (tasky.cl, tasky.cloud).
- **why:** Owning the first DuckDuckGo row is not the same as being recognised. The row is titled "Tasky" and the product-name query prefers the empty /try URL. Attaching the wrong LinkedIn page would make the confusion permanent.
- **fix:** Ship the title, the share image and the schema first. Then create one profile (LinkedIn company, or whatever the owner actually uses) with the name Tasky, the URL https://www.tasky.com/, and the Clearboard sentence. Do not link tasky.cl, tasky.cloud, trytasky.com or the app-store listings. Add that profile URL to Organization.sameAs only after it exists. There is no Wikidata item for this company; the five name hits are unrelated. A Wikidata item is optional and only worth it once the site states the same facts.
- **urls:** https://www.tasky.com/, https://trytasky.com/, https://tasky.uz/, https://www.taskytodo.com/, https://www.tasky.net/en/home

### [P1 · IMPORTANT] The explanation lives on /product, not on the homepage
- **id:** `tasky-home-copy`
- **effort:** 1–2 h
- **category:** content_keywords
- **action:** `edit_copy` → homepage opening
- **what:** The homepage HTML is about 80 words. The useful sentence is already there: "Tasky reads tasks, people and dependencies from the way you already talk about work — then draws them into living boards." /product is about 600 words and says the thing a searcher needs: paste meeting notes, a long email or a messy list; it works in Hungarian; Clearboard is the drawing and Workspace is where it goes; Clearboard is €0; Workspace is free during the beta and the trial starts when you open it. None of the configured problem phrases appear in a title or H1.
- **why:** The homepage is the URL a brand search should land on. A slogan and one sentence will not be what an assistant quotes when someone asks how to turn notes into a board, and /product is one click deeper with a vague title.
- **fix:** Keep the voice. Add three or four sentences under the hero that a stranger can quote: what you paste, what you get (tasks, people, dependencies), that no account is required for a draft, and that Workspace is the beta. Point the title at the same facts. Do not start a generic task-management blog. If a third URL is added later, make it one page that answers "turn meeting notes into a board" and link it from /product.
- **urls:** https://www.tasky.com/, https://www.tasky.com/product

### [P2 · NICE_TO_HAVE] Add nosniff and a content security policy
- **id:** `tasky-security-headers`
- **effort:** 1–2 h
- **category:** technical
- **action:** `configure_headers` → www.tasky.com
- **what:** The homepage already sends strict-transport-security: max-age=15724800; includeSubDomains (about 182 days, no preload). It does not send content-security-policy, x-content-type-options, or referrer-policy. auth.tasky.com does send nosniff and referrer-policy.
- **why:** These are not ranking factors. The marketing host is the one that embeds Keycloak, Turnstile, Stripe and the Cloudflare beacon, so it is the response that should say what it is willing to run.
- **fix:** On HTML responses from www.tasky.com, add X-Content-Type-Options: nosniff and Referrer-Policy: strict-origin-when-cross-origin. Add a Content-Security-Policy that allows the origins the app already uses (auth.tasky.com, the Turnstile script, the Stripe donation link, static.cloudflareinsights.com) and nothing else. Do not drop HSTS. Raise max-age to 31536000 only if every subdomain can stay on HTTPS.
- **urls:** https://www.tasky.com/, https://auth.tasky.com/

### [P2 · NICE_TO_HAVE] Keep the email visible as text
- **id:** `tasky-contact`
- **effort:** 30 min
- **category:** conversion
- **action:** `edit_copy` → footer email
- **what:** There is no contact form and no /contact page (that URL is a shell). The only reach-a-person path on the marketing pages is mailto:support@tasky.com. The primary actions are real links: "Draw my board →" and "Join the beta →" / "Sign in to join". They do not post to mailto.
- **why:** The product actions are fine. The gap is support: a mailto link does nothing on a machine without a mail client, and a blank /contact URL may get indexed.
- **fix:** Put support@tasky.com in the footer as visible text, not only as a link. Either build a one-field form that posts to the server, or 404 /contact until you do. Do not change "Draw my board" — it is the right action.
- **urls:** https://www.tasky.com/, https://www.tasky.com/contact

### [P2 · CHECK] Lab speed is already fine; field data was not available
- **id:** `tasky-field-vitals`
- **effort:** 15 min
- **category:** measurement
- **action:** `manual_check` (Field CrUX later. No lab speed work now.)
- **what:** Lighthouse 12.8.2 on https://www.tasky.com/ on 2 October 2026: mobile performance 97, accessibility 100, best practices 100, SEO 100, LCP 2.1 s, CLS 0.002, TBT 20 ms. Desktop performance 99, LCP 0.7 s, CLS 0.002, TBT 0 ms. Chrome UX Report was not queried (no CRUX_API_KEY). The PageSpeed Insights API returned quota exceeded, so these numbers are local Lighthouse, not Google's hosted run. The SEO 100 is the homepage document only; it does not see the missing sitemap or the shells.
- **why:** There is no performance project here. Treating the homepage SEO score as a site-wide pass would hide the indexation bugs.
- **fix:** No speed work. When a CrUX key exists, confirm phone LCP, INP and CLS for the origin. Do not block the indexation fixes on that.
- **urls:** https://www.tasky.com/

### [P2 · NICE_TO_HAVE] Name the homepage wordmark
- **id:** `tasky-image-alt`
- **effort:** 10 min
- **category:** technical
- **action:** `edit_html_meta` → homepage logo
- **what:** The homepage logo /tasky-logo-transparent-dark-text-bubble.png has alt="". The same file on /product has alt="Tasky". It is the only image the crawl flagged.
- **why:** The homepage H1 does not say Tasky. An empty alt on the wordmark removes the name from the accessible name of the page header.
- **fix:** Set alt="Tasky" on the homepage wordmark, matching /product.
- **urls:** https://www.tasky.com/, https://www.tasky.com/product

### [P2 · NICE_TO_HAVE] Send the HTTP apex straight to https://www
- **id:** `tasky-http-chain`
- **effort:** 15 min
- **category:** technical
- **action:** `add_redirects` → http://tasky.com/ (Single 308 to https://www.tasky.com/)
- **what:** https://tasky.com/ returns one 308 to https://www.tasky.com/. http://tasky.com/ returns a 308 to http://www.tasky.com/, and only the next hop upgrades to HTTPS. Canonicals on / and /product are already https://www.tasky.com/….
- **why:** Two hops, the first of them still on HTTP, is a small leak. Anyone who types the bare host, and any old link, should land on the canonical URL in one step.
- **fix:** Change the HTTP apex rule so Location is https://www.tasky.com/ (one 308). Leave the HTTPS apex → www rule as it is.
- **urls:** http://tasky.com/, https://www.tasky.com/

## Suggested order
- **This week:** Tasky: 404 the empty shells and noindex /try, /home, /board and /view; sitemap of / and /product; Organization + SoftwareApplication schema; homepage and product titles
- **Next 2 weeks:** Tasky: Rewrite llms.txt with DPR Ltd., Hungary, and who it is not; privacy and terms as real pages; 1200×630 share image; one profile that points at www.tasky.com
- **Month 1–3:** Tasky: Search Console Domain property, inspect /try until it drops; one page aimed at meeting notes → board; repeat the four AI-search questions

## Method
Depth: deep. Crawl of the live www host (6 HTML responses, no sitemap). Manual checks the crawler does not score: empty 200 shells, X-Robots-Tag on /beta and on /board/<id>, the HTTP apex hop, the OG image dimensions (401×475), bot user-agents, and the footer legal line. Lighthouse 12.8.2 via headless Chrome. PageSpeed Insights quota was exceeded, so the lab numbers are local. Field CrUX was not queried. AI-search answers are not in this revision; the questions to repeat are in the GEO finding. No forms submitted, no load tests.