# Felelősségteljes IT: SEO and AI-search review

> Search review · Standard · 1 October 2026

A standard review of the live felelosit.hu site after the CRM, LinkedIn and technical fixes. Each item says what to change, why it matters, how to fix it and roughly how long it takes. Checked read-only: no form submitted, no load test.

## Summary
- The technical baseline is in good shape. Seven pages, unique titles, one H1, self-canonicals, a real noindex 404, sitemap-index.xml, llms.txt, HSTS with preload, and a strict content security policy. Lighthouse 12 on the homepage: mobile performance 98, accessibility 95, best practices 93, SEO 100. Desktop performance is 100. CLS is 0.
- The contact path is a form, not a mailto. /kapcsolat posts JSON to /api/contact, with a privacy checkbox and a honeypot. The privacy notice names HubSpot as the CRM processor. The form was not submitted.
- LinkedIn and Facebook exist, under the wrong name. The company pages are titled "Felelős IT" and "Felelős It", with 2 and 1 followers. Organisation schema still does not cite either URL. That is the main remaining entity job.
- The homepage already defines the offer in the first paragraph, including teljesítésigazolás and SLA. The missing line is how a magánszakértői állásfoglalás differs from an igazságügyi szakértő. Those words appear nowhere on the site.
- On DuckDuckGo the homepage is first for "Felelősségteljes IT". The short query "felelosit" is led by FileList. A stale www …/szolgaltatasok.html URL is still listed, and it 301s to /szolgaltatasok. Google.hu was not re-checked; the September finding that the privacy page ranked first is not confirmed today.
- Two small leftovers: the content security policy blocks Cloudflare's insights beacon, and the legal disclaimer under the hero fails contrast (1.33). /sitemap.xml 404s, while robots.txt already points at the working sitemap index.
- There is no P0. Rename the two profiles and add sameAs this week. The FAQ, the colour, and the sitemap redirect are about two hours on top.

## Agent queue (implement in order)

### [P1 · IMPORTANT] Use one company name on LinkedIn, Facebook, and in schema
- **id:** `felelosit-profile-name`
- **effort:** 45 min
- **category:** entity_brand
- **action:** `edit_schema` → Organization @id https://felelosit.hu/#organization (Code change is sameAs only. Renaming the LinkedIn and Facebook pages is a manual admin step.)
- **what:** The live company profiles use a shortened name. LinkedIn https://www.linkedin.com/company/felelosit/ titles itself "Felelős IT" (2 followers). Facebook https://www.facebook.com/felelosit/ titles itself "Felelős It" (1 follower). The site, the footer, llms.txt and the Organization name are "Felelősségteljes IT". The Organization node has no sameAs. sameAs exists only on the two Person nodes (personal LinkedIn URLs).
- **why:** "Felelősségteljes" is an ordinary Hungarian adjective, so the brand is easy to split. A shortened profile name and a schema graph that never cites the company pages leave search and AI assistants with two weak entities instead of one.
- **fix:** In LinkedIn and Facebook admin, set the page name to exactly "Felelősségteljes IT", the tagline to "Mérhető. Bizonyítható. Számon kérhető.", and the website to https://felelosit.hu/. Then add sameAs on the Organization node (not instead of the Person links). A fragment is in the appendix. Leave the personal profile URLs on Tóth Ádám and Dr. Vida András as they are.
- **urls:** https://felelosit.hu/, https://www.linkedin.com/company/felelosit/, https://www.facebook.com/felelosit/
- **artifacts:**
  - organization-sameas.json (schema_json)
    ```
    {
      "@type": ["Organization", "ProfessionalService"],
      "@id": "https://felelosit.hu/#organization",
      "name": "Felelősségteljes IT",
      "legalName": "Practical Solutions Korlátolt Felelősségű Társaság",
      "alternateName": ["Practical Solutions Kft.", "felelosit.hu"],
      "url": "https://felelosit.hu/",
      "sameAs": [
        "https://www.linkedin.com/company/felelosit/",
        "https://www.facebook.com/felelosit/"
      ]
    }
    ```

### [P1 · IMPORTANT] Stop the Cloudflare beacon from failing the content security policy
- **id:** `felelosit-csp-beacon`
- **effort:** 15 min
- **category:** technical
- **action:** `configure_headers` → Content-Security-Policy script-src (Add https://static.cloudflareinsights.com or disable the Cloudflare Web Analytics injection.)
- **what:** Lighthouse 12 logs a console error on the homepage: loading https://static.cloudflareinsights.com/beacon.min.js is blocked by script-src. The directive allows 'self', 'unsafe-inline', Google Tag Manager, and HubSpot script hosts. It does not allow static.cloudflareinsights.com. Best-practices score is 93 on mobile and desktop for this reason.
- **why:** Cloudflare is injecting Web Analytics that the policy then blocks. The beacon never runs, and every page load reports a security error. Measurement via GTM (GTM-PPQWWVFK) is a separate path and is already allowed.
- **fix:** Pick one. If Cloudflare Web Analytics should run, add https://static.cloudflareinsights.com to script-src. If GTM is the only measurement path, turn the Cloudflare Web Analytics injection off so the beacon is not requested. Do not widen script-src to https:.
- **urls:** https://felelosit.hu/

### [P1 · IMPORTANT] Say how this differs from a court-appointed expert
- **id:** `felelosit-court-expert`
- **effort:** 1 h
- **category:** content_keywords
- **action:** `edit_copy` → https://felelosit.hu/miben-segithetunk (Visible FAQ plus FAQPage JSON-LD on the same page.)
- **what:** None of the seven indexable pages contain "magánszakértő" or "igazságügyi". The about page does say "Nem hatósági vizsgálat" and that the firm does not replace a lawyer. Homepage, services and "miben segíthetünk" already use teljesítésigazolás and SLA in titles or the opening paragraph. There is no standalone article for "sla jelentése".
- **why:** A lawyer searching for help with an IT delivery dispute compares the site with igazságügyi informatikai szakértők. The 30 September 2026 review found that Google.hu results for "informatikai szakértő teljesítési vita" were court experts and academic pages, and that "informatikai szakértő" had about 10 searches a month. Volumes were not pulled again on this run. The missing sentence is the distinction, not another service heading.
- **fix:** Add one FAQ on https://felelosit.hu/miben-segithetunk, in the visible list and in that page's FAQPage JSON-LD. Use the question and answer in the appendix. Do not create a thin glossary page for "sla jelentése"; SLA is already in the commercial titles.
- **urls:** https://felelosit.hu/miben-segithetunk, https://felelosit.hu/rolunk
- **artifacts:**
  - faq-court-expert.txt (copy)
    ```
    Question (visible heading and FAQPage name):
    Igazságügyi szakértő helyett dolgoznak?
    
    Answer:
    Nem helyettesítünk igazságügyi szakértőt, és nem végzünk hatósági vizsgálatot. Magánszakértői állásfoglalást adunk: a szerződéses vállalást vetjük össze a tényleges informatikai teljesítéssel és a bizonyítékokkal, per előtt vagy mellett. A bíróság által kirendelt szakértő ettől független marad. Jogi képviseletet nem nyújtunk.
    
    Add the question to the FAQ block on https://felelosit.hu/miben-segithetunk and to that page's FAQPage JSON-LD. Do not add a separate glossary page for "sla jelentése".
    ```

### [P2 · NICE_TO_HAVE] Darken the legal disclaimer under the homepage hero
- **id:** `felelosit-contrast`
- **effort:** 15 min
- **category:** technical
- **action:** `other` → homepage p.small disclaimer (Colour only. Suggested value #3d5560.)
- **what:** Lighthouse accessibility is 95 on mobile and desktop. The failing node is the homepage paragraph <p class="small" style="margin-top:18px">: "Szakmai támogatást nyújtunk a jogi képviselő munkájához, de nem helyettesítjük a jogi képviseletet." Computed colours are #ced9de on #f4f7f8, contrast ratio 1.33. Images on crawled pages have alt text and width/height.
- **why:** That sentence is the legal boundary of the offer. At 14px and ratio 1.33 it is hard to read, which is the only accessibility failure Lighthouse reported.
- **fix:** Set that paragraph's colour to #3d5560 (about 7.3:1 on #f4f7f8) or darker. Keep the copy. Re-run Lighthouse accessibility on the homepage and expect the color-contrast audit to pass.
- **urls:** https://felelosit.hu/

### [P2 · NICE_TO_HAVE] Redirect /sitemap.xml to the sitemap index
- **id:** `felelosit-sitemap-alias`
- **effort:** 15 min
- **category:** pre_launch
- **action:** `add_redirects` → /sitemap.xml (Single 301 to the existing sitemap index.)
- **what:** https://felelosit.hu/sitemap.xml returns 404 text/html (the branded noindex 404). robots.txt already has Sitemap: https://felelosit.hu/sitemap-index.xml, and that file returns 200 application/xml and points at sitemap-0.xml, which lists the seven live URLs. Lastmod on the index is 2026-09-29.
- **why:** Google follows the Sitemap line, so this is not why pages would be missing. Crawlers and validators that try /sitemap.xml still receive a 404.
- **fix:** 301 https://felelosit.hu/sitemap.xml to https://felelosit.hu/sitemap-index.xml. Leave robots.txt as it is.
- **urls:** https://felelosit.hu/sitemap.xml, https://felelosit.hu/sitemap-index.xml, https://felelosit.hu/robots.txt
- **artifacts:**
  - redirect-sitemap.txt (redirect_map)
    ```
    /sitemap.xml  https://felelosit.hu/sitemap-index.xml  301
    ```

### [P2 · CHECK] Recheck the brand query in Google after the profile rename
- **id:** `felelosit-brand-serp`
- **effort:** 30 min
- **category:** entity_brand
- **action:** `submit_gsc` (Manual. No code change unless Search Console still ranks the privacy URL first.)
- **what:** DuckDuckGo on 1 October 2026, query "Felelősségteljes IT": result 1 is https://felelosit.hu/ (title "Informatikai szakértő IT-teljesítésre | Felelősségteljes IT"), result 2 is https://www.felelosit.hu/szolgaltatasok.html, then dictionary pages for the adjective. That .html URL 301s www → https://felelosit.hu/szolgaltatasok.html → /szolgaltatasok. Query "felelosit" is led by FileList, with the homepage second. Google.hu was not re-queried. The 30 September 2026 review had the privacy page first on Google.hu for "felelosit"; that order is not confirmed today. The privacy page is still index,follow.
- **why:** The homepage can win the phrase, and on DuckDuckGo it currently does. The short string collides with FileList, and a pre-migration URL is still listed. Search Console is the place to see whether Google still prefers the privacy URL.
- **fix:** After the LinkedIn and Facebook rename, open the Google Search Console URL-prefix or domain property and inspect the queries "Felelősségteljes IT" and "felelosit". Request indexing for https://felelosit.hu/ and https://felelosit.hu/szolgaltatasok. Keep the privacy page indexable unless Search Console shows it outranking the homepage for the brand query.
- **urls:** https://felelosit.hu/, https://felelosit.hu/szolgaltatasok

## Suggested order
- **This week:** Felelősségteljes IT: Rename LinkedIn and Facebook to Felelősségteljes IT and add Organization sameAs. Allow the Cloudflare beacon or turn the injection off.
- **Next 2 weeks:** Felelősségteljes IT: Add the court-expert FAQ on /miben-segithetunk. Darken the disclaimer. 301 /sitemap.xml to the sitemap index.
- **Month 1–3:** Felelősségteljes IT: Inspect the brand queries in Search Console and request indexing of the homepage and /szolgaltatasok. Repeat the AI questions after the profile name is consistent.

## Method
Depth: Standard. Read-only HTTP checks plus Lighthouse 12 (mobile and desktop) and DuckDuckGo brand queries on 1 October 2026. The contact form was not submitted; GET /api/contact returned 405 with Allow: POST. Google.hu, DataForSEO and the four AI engines were not re-run. No load tests.