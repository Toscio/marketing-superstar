# Audit checklist

Use this whether you run the CLI or audit by hand. Mark each row with evidence (URL, screenshot, SERP date).

## 0. Scope

- [ ] Production URL(s) and staging URL(s)
- [ ] Brand / legal names and known namesakes
- [ ] Legacy URL list (old sitemap)
- [ ] Markets / languages
- [ ] Related brands (shared founder?)
- [ ] Read-only constraint confirmed

## A. Pre-launch / indexation

- [ ] Legacy URLs → 301 map (no soft 404s)
- [ ] XML sitemap present + `Sitemap:` in robots.txt
- [ ] Staging: `X-Robots-Tag: noindex` (not baked into prod HTML)
- [ ] `llms.txt` present and accurate
- [ ] www ↔ apex single redirect chain
- [ ] Search Console property type (Domain vs URL-prefix) understood for cutover

## B. Technical on-page

- [ ] Unique `<title>` and meta description per indexable page
- [ ] Exactly one H1
- [ ] Self-referencing canonical
- [ ] `lang` / hreflang only where same content exists in multiple locales
- [ ] Core Web Vitals / Lighthouse lab (mobile + desktop)
- [ ] Security headers present (HSTS, CSP as applicable)
- [ ] Images: alt, sizing, modern formats
- [ ] Internal links from articles → money pages

## C. Structured data & entity

- [ ] `Organization` or `ProfessionalService` with legalName, address, sameAs
- [ ] `Person` for founder(s) with stable `@id`
- [ ] `BlogPosting` / `Article` with dates + author where relevant
- [ ] `FAQPage`, `BreadcrumbList`, `Service` as needed
- [ ] Consistent legal name spelling across site + profiles

## D. Content & keywords

- [ ] Ranked keywords / traffic risk on redesign
- [ ] Search volume for category vs problem/symptom terms
- [ ] Problem-led content plan (not empty category pages)
- [ ] Visible dates + author on articles

## E. GEO (AI search)

- [ ] ChatGPT (with search): brand + category questions
- [ ] Perplexity: same
- [ ] Google AI Overview on brand SERP if shown
- [ ] Citations point at live URLs (redirects for old cited paths)
- [ ] Quotable defining sentence near top of Home/About
- [ ] Checkable facts (years, sectors, languages, certifications)
- [ ] Cloudflare / edge AI bot settings vs robots content-signals

## F. Brand SERP & conversion

- [ ] Brand query: correct domain on page one
- [ ] Profiles (LinkedIn, GBP, YouTube, directories) aligned
- [ ] Contact form works without relying on `mailto:`
- [ ] Default OG `summary_large_image` 1200×630

## G. Cross-site

- [ ] No false hreflang between different products
- [ ] Shared Person entity + one honest cross-link where helpful
